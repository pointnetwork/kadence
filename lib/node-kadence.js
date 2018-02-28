'use strict';

const assert = require('assert');
const path = require('path');
const os = require('os');
const { createLogger } = require('bunyan');
const merge = require('merge');
const KademliaNode = require('./node-kademlia');
const quasar = require('./plugin-quasar');
const spartacus = require('./plugin-spartacus');
const hashcash = require('./plugin-hashcash');
const constants = require('./constants');
const utils = require('./utils');
const version = require('./version');
const Rules = require('./rules-kadence');
const tiny = require('tiny');


/**
 * Extends Kademlia with Kadence protocol rules
 * @license AGPL-3.0
 */
class KadenceNode extends KademliaNode {

  static get DEFAULTS() {
    return {
      wallet: null,
      logger: createLogger({ name: 'kadence' }),
      privateExtendedKey: null,
      keyDerivationIndex: 1,
      peerCacheFilePath: path.join(os.tmpdir(), 'kadence_peer_cache')
    };
  }

  /**
   * @constructor
   * @extends {KademliaNode}
   * @param {object} options
   * @param {string} options.privateExtendedKey - HD extended private key
   * @param {string} options.peerCacheFilePath - Path to cache peers
   * @param {object} [options.logger] - Bunyan compatible logger
   * @param {number} [options.keyDerivationIndex] - HD derivation index
   */
  constructor(options) {
    /* eslint max-statements: [2, 16] */
    const opts = merge(KadenceNode.DEFAULTS, options);

    super(opts);

    this.contact.agent = this.contact.agent || version.protocol;
    this.hashcash = this.plugin(hashcash({
      methods: ['PUBLISH', 'SUBSCRIBE'],
      difficulty: 5
    }));
    this.quasar = this.plugin(quasar);
    this.spartacus = this.plugin(spartacus(
      options.privateExtendedKey,
      options.keyDerivationIndex,
      constants.HD_KEY_DERIVATION_PATH
    ));
    this.peers = tiny(opts.peerCacheFilePath);
    this.wallet = opts.wallet;

    assert.ok(this.wallet, 'No wallet was supplied');
    this._bootstrap();
  }

  /**
   * @private
   */
  _bootstrap() {
    // Keep a record of the contacts we've seen
    this.router.events.on('add', identity => {
      this.logger.debug(`updating peer profile ${identity}`);
      const contact = this.router.getContactByNodeId(identity);
      contact.timestamp = Date.now();
      this.peers.set(identity, contact);
    });
  }

  /**
   * Returns a list of bootstrap nodes from local profiles
   * @returns {string[]} urls
   */
  getBootstrapCandidates() {
    const candidates = [];
    return new Promise(resolve => {
      this.peers.each((contact, identity) => {
        candidates.push([identity, contact]);
      });
      resolve(candidates.sort((a, b) => b[1].timestamp - a[1].timestamp)
        .map(utils.getContactURL));
    });
  }

  /**
   * Adds the Kadence rule handlers before calling super#listen()
   */
  listen() {
    let handlers = new Rules(this);

    this.use(handlers.validate.bind(handlers));
    this.use('STORE', handlers.beforeValueStored.bind(handlers));

    super.listen(...arguments);
  }

  /**
   * Performs additional Kadence routines for storing or mutating a value
   * @param {string|buffer} key
   * @param {string|buffer} value
   * @param {Node~iterativeStoreCallback} callback
   */
  iterativeStore(key, value, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   * @callback Node~iterativeStoreCallback
   * @param {error|null} error
   * @param {number} itemsStored
   */

  /**
   * Make sure incompatible nodes don't make it into our routing table
   * @private
   */
  _updateContact(identity, contact) {
    try {
      assert(utils.isCompatibleVersion(contact.agent));
    } catch (err) {
      return;
    }

    super._updateContact(...arguments);
  }

}

module.exports = KadenceNode;
