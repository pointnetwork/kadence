'use strict';

const bunyan = require('bunyan');
const levelup = require('levelup');
const memdown = require('memdown');
const kad = require('../..');

let startPort = 45000;


module.exports = function(numNodes, Transport) {

  const nodes = [];

  const logger = bunyan.createLogger({
    levels: ['fatal'],
    name: 'node-kademlia'
  });
  const storage = levelup('node-kademlia', {
    db: memdown
  });

  function createNode() {
    let transport = new Transport();
    let contact = { hostname: 'localhost', port: startPort++ };

    return kad({
      transport: transport,
      contact: contact,
      storage: storage,
      logger: logger
    });
  }

  for (let i = 0; i < numNodes; i++) {
    nodes.push(createNode());
  }

  return nodes;
};
