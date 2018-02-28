/**
 * @module kadence
 * @license AGPL-3.0
 * @author Gordon Hall https://github.com/bookchin
 */

'use strict';

/**
 * Returns a new {@link KadenceNode}
 * @function
 */
module.exports = function(options) {
  return new module.exports.KadenceNode(options);
};

/** {@link KadenceNode} */
module.exports.KadenceNode = require('./lib/node-kadence');

/** {@link KadenceRules} */
module.exports.KadenceRules = require('./lib/rules-kadence');

/** {@link KadenceSolver} */
module.exports.KadenceSolver = require('./lib/solver');

/** {@link KadenceSolution} */
module.exports.KadenceSolution = require('./lib/solution');

/** {@link KadenceWallet} */
module.exports.KadenceWallet = require('./lib/wallet');

/** {@link Control} */
module.exports.KadenceController = require('./lib/control');

/** {@link KademliaNode} */
module.exports.KademliaNode = require('./lib/node-kademlia');

/** {@link KademliaRules} */
module.exports.KademliaRules = require('./lib/rules-kademlia');

/** {@link QuasarRules} */
module.exports.QuasarRules = require('./lib/rules-quasar');

/** {@link AbstractNode} */
module.exports.AbstractNode = require('./lib/node-abstract');

/** {@link Bucket} */
module.exports.Bucket = require('./lib/bucket');

/** {@link ErrorRules} */
module.exports.ErrorRules = require('./lib/rules-errors');

/** {@link Messenger} */
module.exports.Messenger = require('./lib/messenger');

/** {@link RoutingTable} */
module.exports.RoutingTable = require('./lib/routing-table');

/** {@link UDPTransport} */
module.exports.UDPTransport = require('./lib/transport-udp');

/** {@link HTTPTransport} */
module.exports.HTTPTransport = require('./lib/transport-http');

/** {@link HTTPSTransport} */
module.exports.HTTPSTransport = require('./lib/transport-https');

/** {@link HashCashPlugin} */
module.exports.HashCashPlugin = require('./lib/plugin-hashcash');

/** {@link HibernatePlugin} */
module.exports.HibernatePlugin = require('./lib/plugin-hibernate');

/** {@link OnionPlugin} */
module.exports.OnionPlugin = require('./lib/plugin-onion');

/** {@link QuasarPlugin} */
module.exports.QuasarPlugin = require('./lib/plugin-quasar');

/** {@link SpartacusPlugin} */
module.exports.SpartacusPlugin = require('./lib/plugin-spartacus');

/** {@link TraversePlugin} */
module.exports.TraversePlugin = require('./lib/plugin-traverse');

/** {@link module:kadence/constants} */
module.exports.constants = require('./lib/constants');

/** {@link module.kadence/version} */
module.exports.version = require('./lib/version');

/** {@link module:kadence/utils} */
module.exports.utils = require('./lib/utils');

/** {@link module:kadence/identity} */
module.exports.identity = require('./lib/identity');

/** {@link module:kadence/logger} */
module.exports.logger = require('./lib/logger');
