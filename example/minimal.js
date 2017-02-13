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
  transport: kad.HttpTransport,
  storage: levelup('path/to/storage.db'),
  logger: bunyan.createLogger({ name: 'kad example' }),
  identity: kad.utils.getRandomKeyBuffer()
});

// When you are ready, start listening for messages and join the network
// The Node#listen method takes different arguments based on the transport
// adapter being used
node.listen(1337, 'my.host.name', () => {
  node.join('http://some.known.contact:1337');
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
