/**
 * @example kad/example/minimal
 */

'use strict';

// Import dependencies
const bunyan = require('bunyan');
const levelup = require('levelup');
const kad = require('kad');

// Construct a kademlia node interface; the returned `Node` object exposes:
// - router
// - rpc
// - storage
// - identity
const node = kad({
  transport: new kad.HttpTransport(),
  storage: levelup('path/to/storage.db'),
  contact: { hostname: 'localhost', port: 1337 }
});

// When you are ready, start listening for messages and join the network
// The Node#listen method takes different arguments based on the transport
// adapter being used
node.listen(1337, () => {
  node.join(['ea48d3f07a5241291ed0b4cab6483fa8b8fcc127', {
    hostname: 'localhost',
    port: 8080
  }]);
});

// Listen for the 'join' event which indicates peers were discovered and
// our node is now connected to the overlay network
node.on('join', () => {
  logger.info(`Connected to ${node.router.length} peers!`)

  // Base protocol exposes:
  // * node.iterativeFindNode(key, callback)
  // * node.iterativeFindValue(key, callback)
  // * node.iterativeStore(key, value, callback)
});
