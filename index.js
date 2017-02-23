/**
 * @module kad
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
 */

'use strict';

/**
 * Returns a new {@link KademliaNode}
 * @function
 */
module.exports = function(options) {
  return new module.exports.KademliaNode(options);
};

/** {@link AbstractNode} */
module.exports.AbstractNode = require('./lib/node-abstract');

/** {@link Bucket} */
module.exports.Bucket = require('./lib/bucket');

/** {@link module:constants} */
module.exports.constants = require('./lib/constants');

/** {@link KademliaNode} */
module.exports.KademliaNode = require('./lib/node-kademlia');

/** {@link KademliaRules} */
module.exports.KademliaRules = require('./lib/rules-kademlia');

/** {@link MessageProcessor} */
module.exports.MessageProcessor = require('./lib/message-processor');

/** {@link RoutingTable} */
module.exports.RoutingTable = require('./lib/routing-table');

/** {@link module:utils} */
module.exports.utils = require('./lib/utils');
