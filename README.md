![Kad](https://avatars1.githubusercontent.com/u/16706596?v=3&s=200)
===================================================================

[![Build Status](https://img.shields.io/travis/kadtools/kad/master.svg?style=flat-square)](https://travis-ci.org/kadtools/kad)
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad)
[![NPM](https://img.shields.io/npm/v/kad.svg?style=flat-square)](https://www.npmjs.com/package/kad)

Peer-to-peer application framework implementing the 
[Kademlia](http://www.scs.stanford.edu/~dm/home/papers/kpos.pdf) distributed
hash table for Node.js and the browser.

Usage
-----

Install `kad` as a dependency of your package using NPM.

```
npm install kad --save
```

Choose a transport, storage layer, and your node's contact information.

```js
const kad = require('kad');

const node = kad({
  transport: new kad.HttpTransport(),
  storage: require('levelup')('path/to/storage.db'),
  contact: { hostname: 'your.host.name', port: 8080 }
});

const seed = [
  'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127',
  { hostname: 'seed.host.name', port: 8080 }
];

node.listen(1337);
node.join(seed, function() {
  console.log(`Connected to ${node.router.size} peers!`);
});
```

For complete documentation, tutorials, and examples on how to extend the base 
protocol for building your own distributed networks, check out 
[kadtools.github.io](http://kadtools.github.io).

Transports
----------

Kad does not impose any particular transport layer, which makes it very 
flexible for applying to many use cases. As far as Kad is concerned, a valid 
transport adapter is any `objectMode` 
[`DuplexStream`](https://nodejs.org/dist/latest-v6.x/docs/api/stream.html) 
that exposes a `listen()` method.

Kad ships with UDP and HTTP(S) transports so you don't need to implement a 
transport adapter yourself to get started. If your network layer needs are not 
met by these, check out the [API for Transport Implementers]();

### Contributed Transports

* [kad-webrtc](https://github.com/kadtools/kad-webrtc) | [@omphalos](https://github.com/omphalos)

> Submit a pull request if you'd like yours added to this list!

Plugins
-------

Kad plugins are a simple way to package additional features. A plugin is just 
a function that receives an instance of {@link KademliaNode} returned from 
calling `require('kad')(options)`. This function can then apply any decorations 
desired.

```js
/**
 * Example "howdy, neighbor" plugin
 * @function
 * @param {KademliaNode} kademliaNode
 */
module.exports = function(kademliaNode) {

  const { identity } = kademliaNode;

  /**
   * Respond to HOWDY messages
   */
  kademliaNode.use('HOWDY', (req, res) => {
    res.send(['howdy, neighbor']);
  });

  /**
   * Say howdy to our nearest neighbor
   */
  kademliaNode.sayHowdy = function(callback) {
    let neighbor = [
      ...kademliaNode.router.getClosestContactsToKey(identity).entries()
    ].shift();
    
    kademliaNode.send('HOWDY', ['howdy, neighbor'], neighbor, callback);
  };

};
```

### Contributed Plugins

* [kad-quasar](https://github.com/kadtools/kad-quasar) | [@bookchin](https://github.com/bookchin)
* [kad-spartacus](https://github.com/kadtools/kad-spartacus) | [@bookchin](https://github.com/bookchin)
* [kad-traverse](https://github.com/kadtools/kad-traverse) | [@bookchin](https://github.com/bookchin)


> Submit a pull request if you;d like yours added to this list!

Middleware
----------

Kad exposes an interface similar to 
[connect](https://github.com/senchalabs/connect)'s `use()` method to allow for 
extending the protocol via message processing middleware.

### Global

Global middleware is applied to any and all deserialized messages. 

```js
const blacklist = new Set([/* misbehaving node ids */]);

/**
 * @example blacklist
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use(function(request, response, next) {
  let [identity] = request.contact;

  if (blacklist.includes(identity)) {
    return next(new Error('Go away!'));
  }

  next();
});
```

### Protocol

Protocol middleware is applied to messages that match the defined method name.

```js
/**
 * @example echo
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use('ECHO', function(request, response, next) {
  let [message] = request.params;

  if (!message) {
    return next(new Error('Nothing to echo'));
  }

  response.send([message]);
});
```

### Error

Error handling middleware is applied to any message which previously resulting 
in a call to `next(err)`. They are defined by including an `err` argument in 
position 0. These can be scoped globally or by protocol.

```js
/**
 * @example catch-all
 * @param {null|error} err
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use(function(err, request, response, next) {
  if (!err) {
    response.error('Method not found', -32602);
  } else {
    response.error(err.message, err.code);
  }
});

/**
 * @example catch-echo
 * @param {error} err
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use('ECHO', function(err, request, response, next) {
  response.error(`ECHO error: ${err.message}`);
});
```

Storage
-------

Kad does not implement the actual data store, but uses the 
[LevelUP](https://github.com/Level/levelup) interface so that you can provide 
[any compatible backend](https://github.com/Level/levelup/wiki/Modules) you 
desire.

License
-------

Kad - Peer-to-peer application framework implementing Kademlia DHT  
Copyright (C) 2017 Gordon Hall

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see http://www.gnu.org/licenses/.
