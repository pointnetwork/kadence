/**
 * @module kad-hashcash
 */

'use strict';

const { Transform } = require('stream');
const async = require('async');
const merge = require('merge');
const jsonrpc = require('jsonrpc-lite');
const crypto = require('crypto');
const assert = require('assert');
const LRUCache = require('lru-cache');


/**
 * Requires proof of work to process messages and performs said work before
 * issuing RPC messages to peers
 */
class HashCashPlugin {

  static get METHOD() {
    return 'HASHCASH';
  }

  static get DEFAULTS() {
    return {
      methods: [], // All methods by default
      difficulty: 4, // 4 leading zeroes
      timeframe: 172800000 // 2 day window
    };
  }

  /**
   * @param {object} node
   * @param {object} [options]
   */
  constructor(node, options = {}) {
    this._opts = merge(HashCashPlugin.DEFAULTS, options);
    this._node = node;
    this._cache = new LRUCache(1000);

    this._node.rpc.deserializer.prepend(new Transform({
      transform: this.verify.bind(this),
      objectMode: true
    }));

    this._node.rpc.serializer.append(new Transform({
      transform: this.prove.bind(this),
      objectMode: true
    }));
  }

  /**
   * Verifies the proof of work on the request object
   * @param {object} data
   * @param {object} encoding
   * @param {function} callback
   */
  verify(data, encoding, callback) {
    let payload = jsonrpc.parse(data.toString('utf8')).map((obj) => {
      return obj.payload;
    });
    let verifyMessage = (this._opts.methods.includes(payload[0].method) ||
                        this._opts.methods.length === 0) &&
                        typeof payload[0].method !== 'undefined';

    if (!verifyMessage) {
      return callback(null, data);
    }

    let proof = payload.filter(m => m.method === HashCashPlugin.METHOD).pop();
    let contact = payload.filter(m => m.method === 'IDENTIFY').pop();

    if (!proof) {
      return callback(new Error('HashCash stamp is missing from payload'));
    }

    let stamp = HashCashPlugin.parse(proof.params[0]);
    let sender = stamp.resource.substr(0, 40);
    let target = Buffer.from(stamp.resource.substr(40, 40), 'hex');
    let method = Buffer.from(
      stamp.resource.substr(80),
      'hex'
    ).toString('utf8');

    try {
      assert(this._cache.get(stamp.toString()) !== 1, 'Cannot reuse proof');
      assert(stamp.bits === this._opts.difficulty, 'Invalid proof difficulty');
      assert(sender === contact.params[0], 'Invalid sender in proof');
      assert(
        Buffer.compare(target, this._node.identity) === 0,
        'Invalid target in proof'
      );
      assert(method === payload[0].method, 'Invalid proof for called method');

      let now = Date.now();
      let result = HashCashPlugin.hash(stamp.toString()).substr(0, stamp.bits);
      let expect = Array(stamp.bits).fill('0').join('');

      assert(result === expect, 'Invalid HashCash stamp');
      assert(
        now - Math.abs(stamp.date) <= this._opts.timeframe,
        'HashCash stamp is expired'
      );
    } catch (err) {
      return callback(err);
    }

    this._cache.set(stamp.toString(), 1);
    callback(null, data);
  }

  /**
   * Add proof of work to outgoing message
   * @param {object} data
   * @param {string} encoding
   * @param {function} callback
   */
  prove(data, encoding, callback) {
    let [id, buffer, target] = data;
    let now = Date.now();
    let payload = jsonrpc.parse(buffer.toString('utf8')).map((obj) => {
      return obj.payload;
    });
    let stampMessage = (this._opts.methods.includes(payload[0].method) ||
                       this._opts.methods.length === 0) &&
                       typeof payload[0].method !== 'undefined';

    if (!stampMessage) {
      return callback(null, data);
    }

    this._node.logger.debug(`mining hashcash stamp for ${payload[0].method}`);
    HashCashPlugin.create(
      this._node.identity.toString('hex'),
      target[0],
      payload[0].method,
      this._opts.difficulty,
      (err, result) => {
        let delta = Date.now() - now;
        let proof = jsonrpc.notification(HashCashPlugin.METHOD, [
          result.header
        ]);

        this._node.logger.debug(`mined stamp ${result.header} in ${delta}ms`);
        payload.push(proof);
        callback(null, [
          id,
          Buffer.from(JSON.stringify(payload), 'utf8'),
          target
        ]);
      }
    );
  }

  /**
   * Parses stamp header into an object
   * @static
   * @param {string} header
   * @returns {object}
   */
  static parse(header) {
    let parts = header.split(':');
    let parsed = {
      ver: parseInt(parts[0]),
      bits: parseInt(parts[1]),
      date: parseInt(parts[2]),
      resource: parts[3],
      ext: '',
      rand: parts[5],
      counter: parseInt(parts[6], 16),
      toString() {
        return [
          this.ver, this.bits, this.date, this.resource,
          this.ext, this.rand, this.counter.toString(16)
        ].join(':');
      }
    };

    return parsed;
  }

  /**
   * Creates the hashcash stamp header
   * @static
   * @param {string} sender
   * @param {string} target
   * @param {string} method
   * @param {number} difficulty
   * @param {function} callback
   */
  static create(sender = '00', target = '00', method = '00', bits = 4, cb) {
    let header = {
      ver: 1,
      bits: bits,
      date: Date.now(),
      resource: Buffer.concat([
        Buffer.from(sender, 'hex'),
        Buffer.from(target, 'hex'),
        Buffer.from(method)
      ]).toString('hex'),
      ext: '',
      rand: crypto.randomBytes(12).toString('base64'),
      counter: Math.ceil(Math.random() * 10000000000),
      toString() {
        return [
          this.ver, this.bits, this.date, this.resource,
          this.ext, this.rand, this.counter.toString(16)
        ].join(':');
      }
    };

    function isSolution() {
      const expect = Array(header.bits).fill('0').join('');
      const stamp = header.toString();
      const actual = HashCashPlugin.hash(stamp).slice(0, header.bits);

      return expect === actual;
    }

    async.whilst(() => !isSolution(), (done) => {
      setImmediate(() => {
        header.counter++;
        done();
      });
    }, () => {
      cb(null, {
        header: header.toString(),
        time: Date.now() - header.date
      });
    });
  }

  /**
   * Returns the RMD160 hash of the the input as hex
   * @static
   * @param {string|buffer} input
   * @returns {string}
   */
  static hash(input) {
    return crypto.createHash('rmd160').update(input).digest('hex');
  }

}

module.exports = function(options) {
  return function(node) {
    return new HashCashPlugin(node, options);
  }
};

module.exports.HashCashPlugin = HashCashPlugin;
