![Kad](https://nodei.co/npm/kad.png?downloads=true)
===================================================================

[![Build Status](https://img.shields.io/travis/kadtools/kad/master.svg?style=flat-square)](https://travis-ci.org/kadtools/kad) | 
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad) | 
[![NPM](https://img.shields.io/npm/v/kad.svg?style=flat-square)](https://www.npmjs.com/package/kad)

Peer-to-peer application framework implementing the 
[Kademlia](http://www.scs.stanford.edu/~dm/home/papers/kpos.pdf) distributed
hash table for Node.js and the browser.

> Looking for documentation for Kad v1.6.x? 
> [Go here](https://kadtools.github.io/docs-v1.6.x/)!

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
  transport: new kad.HTTPTransport(),
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

For complete documentation, tutorials, and examples on how to extend the
base protocol for building your own distributed networks, check out the 
[complete documentation](http://kadtools.github.io).

Resources
---------

* [Transports](http://kadtools.github.io/tutorial-transport-adapters.html)
* [Middleware](http://kadtools.github.io/tutorial-middleware.html)
* [Plugins](http://kadtools.github.io/tutorial-plugins.html)
* [Storage](http://kadtools.github.io/tutorial-storage-adapters.html)
* [Identities](http://kadtools.github.io/tutorial-identities.html)
* [Messages](http://kadtools.github.io/tutorial-messengers.html)

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
