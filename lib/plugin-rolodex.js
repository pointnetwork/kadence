/**
 * @module kadence/rolodex
 */

'use strict';

const utils = require('./utils');
const tiny = require('tiny');


/**
 * Keeps track of seen contacts in a compact file so they can be used as
 * bootstrap nodes
 */
class RolodexPlugin {

  /**
   * @constructor
   * @param {KademliaNode} node
   * @param {string} peerCacheFilePath - Path to file to use for storing peers
   */
  constructor(node, peerCacheFilePath) {
    this.node = node;
    this.db = tiny(peerCacheFilePath);
    this.node.getBootstrapCandidates = this.getBootstrapCandidates.bind(this);

    this.node.router.events.on('add', identity => {
      this.node.logger.debug(`updating peer profile ${identity}`);
      const contact = this.node.router.getContactByNodeId(identity);
      contact.timestamp = Date.now();
      this.db.set(identity, contact);
    });
  }

  /**
   * Returns a list of bootstrap nodes from local profiles
   * @returns {string[]} urls
   */
  getBootstrapCandidates() {
    const candidates = [];
    return new Promise(resolve => {
      this.db.each((contact, identity) => {
        candidates.push([identity, contact]);
      });
      resolve(candidates.sort((a, b) => b[1].timestamp - a[1].timestamp)
        .map(utils.getContactURL));
    });
  }

}

/**
 * Registers a {@link module:kadence/rolodex~RolodexPlugin} with a
 * {@link KademliaNode}
 * @param {string} peerCacheFilePath - Path to file to use for storing peers
 */
module.exports = function(peerCacheFilePath) {
  return function(node) {
    return new RolodexPlugin(node, peerCacheFilePath);
  }
};

module.exports.RolodexPlugin = RolodexPlugin;
