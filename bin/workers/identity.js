'use strict';

const kadence = require('../..');
const readLine = require('readline');
const { EventEmitter } = require('events');


if (parseInt(process.env.kadence_TestNetworkEnabled)) {
  kadence.constants.SOLUTION_DIFFICULTY = 2;
  kadence.constants.IDENTITY_DIFFICULTY = 2;
}

process.once('message', ([xprv, index]) => {
  let events = new EventEmitter();
  let attempts = 0;
  let start = Date.now();

  events.on('index', () => {
    attempts++;
    process.send({ attempts });
  });

  kadence.identity.solve(xprv, index, events)
    .then(result => {
      process.send({ index: result, time: Date.now() - start });
      process.exit(0);
    })
    .catch(err => {
      process.send({ error: err.message });
      process.exit(1);
    })
});

process.once('SIGTERM', () => process.exit(0));

if (process.platform === "win32") {
  readLine.createInterface({
    input: process.stdin,
    output: process.stdout
  }).on('SIGTERM', () => process.emit('SIGTERM'));
}

