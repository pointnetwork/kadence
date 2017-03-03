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

    this.use('PING', handlers.ping);
    this.use('STORE', handlers.store);
    this.use('FIND_NODE', handlers.findNode);
    this.use('FIND_VALUE', handlers.findValue);

    setInterval(() => this.refresh(0), constants.T_REFRESH);
    setInterval(() => this.replicate(() => this.expire()),
                constants.T_REPLICATE);

    super.listen(...arguments);
  }

  /**
   * Inserts the given contact into the routing table and uses it to perform
   * a {@link KademliaProtocol#iterativeFindNode} for this node's identity,
   * then refreshes all buckets further than it's closest neighbor, which will
   * be in the occupied bucket with the lowest index
   * @param {string|object} contact - Address data for the initial contact
   * @param {function} [joinListener] - Function to set as join listener
   * @emits AbstractNode#join
   */
  join(contact, callback) {
    if (callback) {
      this.once('join', callback);
      this.once('error', callback);
    }

    this.router.addContactByNodeId(contact.identity, contact);
    async.series([
      (next) => this.iterativeFindNode(this.identity, next),
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
   * @param {string|object} contact
   * @param {KademliaNode~pingCallback} callback
   */
  ping(contact, callback) {
    this.send('PING', {}, contact, callback);
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
   * @param {buffer|string} value
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
        publisher: this.identity.toString('hex')
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
      (next) => this.storage.put(key, createStorageItem(value), next)
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
    const messages = this.router.getClosestContactsToKey(key, constants.ALPHA)
                       .map(createFindNodeRpc);

    this._lookups.set(utils.getBucketIndex(this.identity, key), Date.now());

    function createFindNodeRpc(target) {
      return ['FIND_NODE', [key], target];
    }

    async.mapSeries(messages, (message, next) => {
      this.send(...message, next);
    }, (err, results) => {
      if (err) {
        return callback(err);
      }

      results = results.reduce((acc, result) => acc.concat(result), [])
                  .sort((a, b) => utils.compareKeyBuffers(
                    Buffer.from(a.identity, 'hex'),
                    Buffer.from(b.identity, 'hex')
                  ));

      results.forEach((contact) => this.router.addContactByNodeId(
        contact.identity,
        contact
      ));

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
    const contacts = this.router.getClosestContactsToKey(key, constants.K);

    // TODO
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
    const replicateStream = new WritableStream({ write: maybeReplicate });

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
    replicateStream.on('end', triggerCallback);
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
    const expireStream = new WritableStream({ write: maybeExpire });

    function maybeExpire({ key, value }, enc, next) {
      if ((value.timestamp + constants.T_EXPIRE) >= now) {
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
    expireStream.on('end', triggerCallback);
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
  refresh(startIndex, callback = () => null) {
    const now = Date.now();
    const indices = [
      ...this.router.entries()
    ].slice(startIndex).map((entry) => entry[0]);

    async.eachSeries(indices, (index, next) => {
      const bucketHasContacts = this.router.get(index).length > 0;
      const lastBucketLookup = this._lookups.get(index) || 0;
      const needsRefresh = lastBucketLookup + constants.T_REFRESH < now;

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
  _updateContact(contact) {
    const [, bucket, contactIndex] = super._updateContact(contact);
    const headContact = bucket.head;

    if (contactIndex !== -1) {
      return;
    }

    this.ping(headContact, (err) => {
      if (err) {
        this.router.removeContactByNodeId(headContact.identity);
        this.router.addContactByNodeId(contact.identity, contact);
      }
    });
  }

}

module.exports = KademliaNode;
