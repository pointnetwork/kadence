'use strict';

const uuid = require('uuid');
const async = require('async');
const { knuthShuffle } = require('knuth-shuffle');
const constants = require('./constants');
const kadence = require('..');
const BloomFilter = require('atbf');
const LruCache = require('lru-cache');
const QuasarRules = require('./rules-quasar');
const assert = require('assert');


/**
 * Implements the primary interface for the publish-subscribe system
 * and decorates the given node object with it's public methods
 */
class QuasarPlugin {

  static get PUBLISH_METHOD() {
    return 'PUBLISH';
  }

  static get SUBSCRIBE_METHOD() {
    return 'SUBSCRIBE';
  }

  static get UPDATE_METHOD() {
    return 'UPDATE';
  }

  /**
   * @constructor
   * @param {KademliaNode} node
   */
  constructor(node) {
    const handlers = new QuasarRules(this);

    this.cached = new LruCache(constants.LRU_CACHE_SIZE)
    this.groups = new Map();
    this.filter = new BloomFilter({
      filterDepth: constants.FILTER_DEPTH,
      bitfieldSize: kadence.constants.B
    });
    this._lastUpdate = 0;

    this.node = node;
    this.node.quasarSubscribe = this.quasarSubscribe.bind(this);
    this.node.quasarPublish = this.quasarPublish.bind(this);

    this.node.use(QuasarPlugin.UPDATE_METHOD, handlers.update.bind(handlers));
    this.node.use(QuasarPlugin.PUBLISH_METHOD,
                  handlers.publish.bind(handlers));
    this.node.use(QuasarPlugin.SUBSCRIBE_METHOD,
                  handlers.subscribe.bind(handlers));

    this.filter[0].add(this.node.identity.toString('hex'));
  }

  /**
   * Returns our ALPHA closest neighbors
   * @property {array[]} neighbors
   */
  get neighbors() {
    return [...this.node.router.getClosestContactsToKey(
      this.node.identity.toString('hex'),
      kadence.constants.ALPHA
    ).entries()];
  }

  /**
   * Publishes the content to the network
   * @param {string} topic - Identifier for subscribers
   * @param {object} contents - Arbitrary publication payload
   * @param {object} [options]
   * @param {string} [options.routingKey] - Publish to neighbors close to this
   * key instead of our own identity
   * @param {function} [callback]
   */
  quasarPublish(topic, contents, options = {}, callback = () => null) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const publicationId = uuid.v4();
    const neighbors = [...this.node.router.getClosestContactsToKey(
      options.routingKey || this.node.identity.toString('hex'),
      kadence.constants.ALPHA
    ).entries()];

    async.each(neighbors, (contact, done) => {
      this.node.send(QuasarPlugin.PUBLISH_METHOD, {
        uuid: publicationId,
        topic,
        contents,
        publishers: [this.node.identity.toString('hex')],
        ttl: constants.MAX_RELAY_HOPS
      }, contact, done);
    }, callback);
  }

  /**
   * Publishes the content to the network
   * @param {string|string[]} topics - Identifier for subscribers
   * @param {function} handler - Publication content handler
   */
  quasarSubscribe(topics, handler) {
    const self = this;

    if (Array.isArray(topics)) {
      topics.forEach((topic) => addTopicToFilter(topic));
    } else {
      addTopicToFilter(topics);
    }

    function addTopicToFilter(topic) {
      self.filter[0].add(topic);
      self.groups.set(topic, handler);
    }

    this.pullFilters(() => this.pushFilters());
  }

  /**
   * Requests neighbor bloom filters and merges with our records
   * @param {function} [callback]
   */
  pullFilters(callback = () => null) {
    const now = Date.now();

    if (this._lastUpdate > now - constants.SOFT_STATE_TIMEOUT) {
      return callback();
    } else {
      this._lastUpdate = now;
    }

    async.each(this.neighbors, (contact, done) => {
      this.pullFilterFrom(contact, (err, filter) => {
        if (err) {
          this.node.logger.warn('failed to pull filter from %s, reason: %s',
                                contact[0], err.message);
        } else {
          this.filter.merge(filter);
        }

        done(err);
      });
    }, callback);
  }

  /**
   * Requests the attenuated bloom filter from the supplied contact
   * @param {array} contact
   * @param {function} callback
   */
  pullFilterFrom(contact, callback) {
    const method = QuasarPlugin.SUBSCRIBE_METHOD;

    this.node.send(method, [], contact, (err, result) => {
      if (err) {
        return callback(err);
      }

      try {
        result.forEach(str => assert(kadence.utils.isHexaString(str),
          'Invalid hex string'));
        return callback(null, BloomFilter.from(result));
      } catch (err) {
        return callback(err);
      }
    });
  }

  /**
   * Notifies neighbors that our subscriptions have changed
   * @param {function} [callback]
   */
  pushFilters(callback = () => null) {
    const now = Date.now();

    if (this._lastUpdate > now - constants.SOFT_STATE_TIMEOUT) {
      return callback();
    } else {
      this._lastUpdate = now;
    }

    async.each(this.neighbors, (contact, done) => {
      this.pushFilterTo(contact, done);
    }, callback);
  }

  /**
   * Sends our attenuated bloom filter to the supplied contact
   * @param {array} contact
   * @param {function} callback
   */
  pushFilterTo(contact, callback) {
    this.node.send(QuasarPlugin.UPDATE_METHOD, this.filter.toHexArray(),
                   contact, callback);
  }

  /**
   * Check if we are subscribed to the topic
   * @param {string} topic
   * @returns {boolean}
   */
  isSubscribedTo(topic) {
    return this.filter[0].has(topic) && this.groups.has(topic);
  }

  /**
   * Check if our neighbors are subscribed to the topic
   * @param {string} topic
   * @returns {boolean}
   */
  hasNeighborSubscribedTo(topic) {
    let index = 1;

    while (this.filter[index]) {
      if (this.filter[index].has(topic)) {
        return true;
      } else {
        index++;
      }
    }

    return false;
  }

  /**
   * Returns a random contact from the routing table
   * @private
   */
  _getRandomContact() {
    return knuthShuffle([...this.node.router.getClosestContactsToKey(
      this.node.identity.toString('hex'),
      this.node.router.size
    ).entries()]).shift();
  }

}

/**
 * Registers the Quasar implementation as a Kad plugin
 * @param {KademliaNode} node
 */
module.exports = function QuasarPlugin(node) {
  return new module.exports.QuasarPlugin(node);
};

module.exports.QuasarPlugin = QuasarPlugin;
