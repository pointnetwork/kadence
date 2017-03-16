'use strict';

const async = require('async');
const { Writable: WritableStream } = require('stream');
const constants = require('./constants');
const utils = require('./utils');
const AbstractNode = require('./node-abstract');
const KademliaRules = require('./rules-kademlia');


/**
 * Extends {@link AbstractNode} with Kademlia-specific rules
 * @class
 * @extends {AbstractNode}
 */
class KademliaNode extends AbstractNode {

  /**
   * @constructor
   */
  constructor(options) {
    super(options);

    this._lookups = new Map(); // NB: Track the last lookup time for buckets
  }

  /**
   * Adds the kademlia rule handlers before calling super#listen()
   */
  listen() {
    let handlers = new KademliaRules(this);

    this.use('PING', handlers.ping.bind(handlers));
    this.use('STORE', handlers.store.bind(handlers));
    this.use('FIND_NODE', handlers.findNode.bind(handlers));
    this.use('FIND_VALUE', handlers.findValue.bind(handlers));

    setInterval(() => this.refresh(0), constants.T_REFRESH);
    setInterval(() => this.replicate(() => this.expire()),
                constants.T_REPLICATE);

    super.listen(...arguments);
  }

  /**
   * Inserts the given contact into the routing table and uses it to perform
   * a {@link KademliaNode#iterativeFindNode} for this node's identity,
   * then refreshes all buckets further than it's closest neighbor, which will
   * be in the occupied bucket with the lowest index
   * @param {array} peer
   * @param {string} peer.0 - Identity key string for peer
   * @param {string|object} peer.1  - Address data for the initial contact
   * @param {function} [joinListener] - Function to set as join listener
   * @emits AbstractNode#join
   */
  join([identity, contact], callback) {
    /* istanbul ignore else */
    if (callback) {
      this.once('join', callback);
      this.once('error', callback);
    }

    this.router.addContactByNodeId(identity, contact);
    async.series([
      (next) => this.iterativeFindNode(this.identity.toString('hex'), next),
      (next) => this.refresh(this.router.getBucketsBeyondClosest()[0], next)
    ], (err) => {
      if (err) {
        this.emit('error', err);
        this.removeListener('join', callback);
      } else {
        this.emit('join');
        this.removeListener('error', callback);
      }
    });
  }

  /**
   * Sends a PING message to the supplied contact
   * @param {array} peer
   * @param {string} peer.0 - Identity key string
   * @param {string|object} peer.1 - Address data for contact
   * @param {KademliaNode~pingCallback} callback
   */
  ping(contact, callback) {
    this.send('PING', [], contact, callback);
  }
  /**
   * @callback KademliaNode~pingCallback
   * @param {error|null} error
   * @param {number} latency - Milliseconds before response received
   */

  /**
   * Performs a {@link KademliaNode#iterativeFindNode} to collect K contacts
   * closests to the given key, sending a STORE message to each of them
   * @param {buffer|string} key
   * @param {buffer|string|object} value
   * @param {KademliaNode~iterativeStoreCallback} callback
   */
  iterativeStore(key, value, callback) {
    const self = this;
    let stored = 0;

    function createStorageItem(value) {
      const keys = Object.keys(value);
      const alreadyHasMetadata = keys.includes('value') &&
                                 keys.includes('publisher') &&
                                 keys.includes('timestamp');

      if (alreadyHasMetadata) {
        value.timestamp = Date.now();
        return value;
      }

      return {
        value: value,
        timestamp: Date.now(),
        publisher: self.identity.toString('hex')
      };
    }

    function createStoreRpc(target) {
      return ['STORE', [key, createStorageItem(value)], target];
    }

    function dispatchStoreRpcs(contacts, callback) {
      async.eachLimit(contacts, constants.ALPHA, (target, done) => {
        self.send(...createStoreRpc(target), (err) => {
          stored = err ? stored : stored + 1;
          done();
        });
      }, callback);
    }

    async.waterfall([
      (next) => this.iterativeFindNode(key, next),
      (contacts, next) => dispatchStoreRpcs(contacts, next),
      (next) => this.storage.put(key, createStorageItem(value),
                                 { valueEncoding: 'json' }, next)
    ], () => callback(null, stored));
  }
  /**
   * @callback KademliaNode~iterativeStoreCallback
   * @param {error|null} error
   * @param {number} stored - Total nodes who stored the pair
   */

  /**
   * Basic kademlia lookup operation that builds a set of K contacts closest
   * to the given key
   * @param {buffer|string} key
   * @param {KademliaNode~iterativeFindNodeCallback} callback
   */
  iterativeFindNode(key, callback) {
    const messages = [
      ...this.router.getClosestContactsToKey(key, constants.ALPHA).entries()
    ].map(createFindNodeRpc);

    this._lookups.set(utils.getBucketIndex(this.identity, key), Date.now());

    function createFindNodeRpc(target) {
      return ['FIND_NODE', [key], target];
    }

    async.mapSeries(messages, (message, next) => {
      this.send(...message, (err, results) => next(null, results || []));
    }, (err, results) => {
      results = results.reduce((acc, result) => acc.concat(result), [])
                  .sort(([aIdentity], [bIdentity]) => utils.compareKeyBuffers(
                    Buffer.from(aIdentity, 'hex'),
                    Buffer.from(bIdentity, 'hex')
                  ));

      results.forEach((contact) => this._updateContact(...contact));
      callback(null, results.slice(0, constants.K));
    });
  }
  /**
   * @callback KademliaNode~iterativeFindNodeCallback
   * @param {error|null} error
   * @param {string[]|object[]} contacts - Result of the lookup operation
   */

  /**
   * Kademlia search operation that is conducted as a node lookup and builds
   * a list of K closest contacts. If at any time during the lookup the value
   * is returned, the search is abandoned. If no value is found, the K closest
   * contacts are returned. Upon success, we must store the value at the
   * nearest node seen during the search that did not return the value.
   * @param {buffer|string} key
   * @param {KademliaNode~iterativeFindValueCallback} callback
   */
  iterativeFindValue(key, callback) {
    const contacts = new Map();
    const missing = [];
    const messages = [
      ...this.router.getClosestContactsToKey(key, constants.K).entries()
    ].map(createFindValueRpc);

    this._lookups.set(utils.getBucketIndex(this.identity, key), Date.now());

    function createFindValueRpc(target) {
      return ['FIND_VALUE', [key], target];
    }

    function getClosestNodesFromSet(contacts) {
      return contacts.sort(([aIdentity], [bIdentity]) => {
        return utils.compareKeyBuffers(
          Buffer.from(aIdentity, 'hex'),
          Buffer.from(bIdentity, 'hex')
        );
      }).slice(0, constants.K);
    }

    function iterationComplete(err, result) {
      callback(err, result);
      callback = () => null;
    }

    async.eachLimit(messages, constants.ALPHA, (message, next) => {
      const [,,target] = message;

      this.send(...message, (err, result) => {
        if (err) {
          return next();
        }

        // NB: If the result is a contact/node list, just keep track of it
        // NB: Otherwise, do not proceed with iteration, just callback
        if (Array.isArray(result)) {
          result.forEach(([identity, contact]) => {
            contacts.set(identity, contact);
          });
          missing.push(target);
          return next();
        }

        // NB: If we did get an item back, get the closest node we contacted
        // NB: who is missing the value and store a copy with them
        const closestMissingValue = getClosestNodesFromSet(missing).shift();

        if (closestMissingValue) {
          this.send('STORE', [key, result], closestMissingValue, () => null);
        }

        iterationComplete(null, result);
      });
    }, () => {
      iterationComplete(
        null,
        getClosestNodesFromSet([...contacts.entries()]))
    });
  }
  /**
   * @callback KademliaNode~iterativeFindValueCallback
   * @param {error|null} error
   * @param {buffer|null} value
   * @param {string[]|object[]} contacts
   */

  /**
   * Performs a scan of the storage adapter and performs
   * republishing/replication of items stored. Items that we did not publish
   * ourselves get republished every T_REPLICATE. Items we did publish get
   * republished every T_REPUBLISH.
   * @param {KademliaNode~replicateCallback} [callback]
   */
  replicate(callback = () => null) {
    const self = this;
    const now = Date.now();
    const itemStream = this.storage.createReadStream();
    const replicateStream = new WritableStream({
      objectMode: true,
      write: maybeReplicate
    });

    function maybeReplicate({ key, value }, enc, next) {
      const isPublisher = value.publisher === self.identity.toString('hex');
      const republishDue = (value.timestamp + constants.T_REPUBLISH) <= now;
      const replicateDue = (value.timestamp + constants.T_REPLICATE) <= now;
      const shouldRepublish = isPublisher && republishDue;
      const shouldReplicate = !isPublisher && replicateDue;

      if (shouldReplicate || shouldRepublish) {
        return self.iterativeStore(key, value, next);
      }

      next();
    }

    function triggerCallback(err) {
      itemStream.removeAllListeners();
      replicateStream.removeAllListeners();
      callback(err);
    }

    itemStream.on('error', triggerCallback);
    replicateStream.on('error', triggerCallback);
    replicateStream.on('finish', triggerCallback);
    itemStream.pipe(replicateStream);
  }
  /**
   * @callback KademliaNode~replicateCallback
   * @param {error|null} error
   * @param {number} itemsReplicated
   */

  /**
   * Items expire T_EXPIRE seconds after the original publication. All items
   * are assigned an expiration time which is "exponentially inversely
   * proportional to the number of nodes between the current node and the node
   * whose ID is closest to the key", where this number is "inferred from the
   * bucket structure of the current node".
   * @param {KademliaNode~expireCallback} [callback]
   */
  expire(callback = () => null) {
    const self = this;
    const now = Date.now();
    const itemStream = this.storage.createReadStream();
    const expireStream = new WritableStream({
      objectMode: true,
      write: maybeExpire
    });

    function maybeExpire({ key, value }, enc, next) {
      if ((value.timestamp + constants.T_EXPIRE) <= now) {
        return self.storage.del(key, next);
      }

      next();
    }

    function triggerCallback(err) {
      itemStream.removeAllListeners();
      expireStream.removeAllListeners();
      callback(err);
    }

    itemStream.on('error', triggerCallback);
    expireStream.on('error', triggerCallback);
    expireStream.on('finish', triggerCallback);
    itemStream.pipe(expireStream);
  }
  /**
   * @callback KademliaNode~expireCallback
   * @param {error|null} error
   * @param {number} itemsExpired
   */

  /**
   * If no node lookups have been performed in any given bucket's range for
   * T_REFRESH, the node selects a random number in that range and does a
   * refresh, an iterativeFindNode using that number as key.
   * @param {number} startIndex
   * @param {KademliaNode~refreshCallback} [callback]
   */
  refresh(startIndex = 0, callback = () => null) {
    const now = Date.now();
    const indices = [
      ...this.router.entries()
    ].slice(startIndex).map((entry) => entry[0]);

    async.eachSeries(indices, (index, next) => {
      const bucketHasContacts = this.router.get(index).length > 0;
      const lastBucketLookup = this._lookups.get(index) || 0;
      const needsRefresh = lastBucketLookup + constants.T_REFRESH <= now;

      if (bucketHasContacts && needsRefresh) {
        return this.iterativeFindNode(
          utils.getRandomBufferInBucketRange(this.identity, index),
          next
        );
      }

      next();
    }, callback);
  }
  /**
   * @callback KademliaNode~refreshCallback
   * @param {error|null} error
   * @param {array} bucketsRefreshed
   */

  /**
   * Adds the given contact to the routing table
   * @private
   */
  _updateContact(identity, contact) {
    const [, bucket, contactIndex] = this.router.addContactByNodeId(
      identity,
      contact
    );
    const [headId, headContact] = bucket.head;

    if (contactIndex !== -1) {
      return;
    }

    this.ping([headId, headContact], (err) => {
      if (err) {
        this.router.removeContactByNodeId(headId);
        this.router.addContactByNodeId(identity, contact);
      }
    });
  }

}

module.exports = KademliaNode;
