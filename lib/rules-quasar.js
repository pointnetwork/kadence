'use strict';

const merge = require('merge');
const async = require('async');
const constants = require('./constants');
const kad = require('kad');
const BloomFilter = require('atbf');
const { knuthShuffle } = require('knuth-shuffle');


/**
 * Implements the handlers for Quasar message types
 */
class QuasarRules {

  /**
   * @constructor
   * @param {QuasarPlugin} quasar - Instance of a initialized quasar plugin
   */
  constructor(quasar) {
    this.quasar = quasar;
  }

  /**
   * Upon receipt of a PUBLISH message, we validate it, then check if we or
   * our neighbors are subscribed. If we are subscribed, we execute our
   * handler. If our neighbors are subscribed, we relay the publication to
   * ALPHA random of the closest K. If our neighbors are not subscribed, we
   * relay the publication to a random contact
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  publish(request, response, next) {
    let { ttl, topic, uuid, contents } = request.params;
    let neighbors = [...this.quasar.node.router.getClosestContactsToKey(
      this.quasar.node.identity,
      kad.constants.K
    ).entries()];

    if (this.quasar.cached.get(uuid)) {
      return next(new Error('Message previously routed'));
    }

    if (ttl > constants.MAX_RELAY_HOPS || ttl < 0) {
      return next(new Error('Message includes invalid TTL'));
    }

    neighbors = knuthShuffle(neighbors.filter(([nodeId]) => {
      return request.params.publishers.indexOf(nodeId) === -1;
    })).splice(0, kad.constants.ALPHA);

    request.params.publishers.push(this.quasar.node.identity.toString('hex'));
    this.quasar.cached.set(uuid, Date.now());

    if (this.quasar.isSubscribedTo(topic)) {
      this.quasar.groups.get(topic)(contents, topic);

      async.each(neighbors, (contact, done) => {
        this._relayPublication(request, contact, done);
      });
      return response.send([]);
    }

    if (ttl - 1 === 0) {
      return response.send([]);
    }

    async.each(neighbors, (contact, done) => {
      this.quasar.pullFilterFrom(contact, (err, filter) => {
        if (err) {
          return done();
        }

        if (!QuasarRules.shouldRelayPublication(request, filter)) {
          contact = this.quasar._getRandomContact();
        }

        this._relayPublication(request, contact, done);
      });
    });
    response.send([]);
  }

  /**
   * Upon receipt of a SUBSCRIBE message, we simply respond with a serialized
   * version of our attenuated bloom filter
   * @param {object} request
   * @param {object} response
   */
  subscribe(request, response) {
    response.send(this.quasar.filter.toHexArray());
  }

  /**
   * Upon receipt of an UPDATE message we merge the delivered attenuated bloom
   * filter with our own
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  update(request, response, next) {
    if (!Array.isArray(request.params)) {
      return next(new Error('Invalid bloom filters supplied'));
    }

    try {
      this.quasar.filter.merge(BloomFilter.from(request.params));
    } catch (err) {
      return next(err);
    }

    response.send([]);
  }

  /**
   * Returns a boolean indicating if we should relay the message to the contact
   * @param {object} request
   * @param {array} attenuatedBloomFilter
   */
  static shouldRelayPublication(request, filter) {
    let negated = true;

    filter.forEach((level) => {
      if (level.has(request.params.topic)) {
        negated = false;
      }
    });

    request.params.publishers.forEach((pub) => {
      filter.forEach((level) => {
        if (level.has(pub)) {
          negated = true;
        }
      });
    });

    return !negated;
  }

  /**
   * Takes a request object for a publication and relays it to the supplied
   * contact
   * @private
   */
  _relayPublication(request, contact, callback) {
    this.quasar.node.send(
      request.method,
      merge({}, request.params, { ttl: request.params.ttl - 1 }),
      contact,
      callback
    );
  }

}

module.exports = QuasarRules;
