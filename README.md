<h1 align="center">
  <a href="https://kadence.github.io"><img src="https://avatars1.githubusercontent.com/u/36767738?s=256"></a>
</h1>
<h4 align="center">Kadence is digital property for distributed applications.</h4>
<p align="center">
  Join the discussion in <code>#kadence</code> on our <a href="https://matrix.counterpointhackers.org/_matrix/client/#/room/#kadence:matrix.counterpointhackers.org">Matrix server</a>!
</p>
<div align="center">
  <a href="https://travis-ci.org/kadence/kadence">
    <img src="https://img.shields.io/travis/kadence/kadence.svg?style=flat-square">
  </a> 
  <a href="https://coveralls.io/r/kadence/kadence">
    <img src="https://img.shields.io/coveralls/kadence/kadence.svg?style=flat-square">
  </a> 
  <a href="https://www.npmjs.com/package/@kadenceproject/kadence">
    <img src="https://img.shields.io/npm/v/@kadenceproject/kadence.svg?style=flat-square">
  </a> 
  <a href="https://hub.docker.com/r/kadence/kadence">
    <img src="https://img.shields.io/docker/pulls/kadence/kadence.svg?style=flat-square">
  </a> 
  <a href="https://raw.githubusercontent.com/kadence/kadence/master/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL3.0-blue.svg?style=flat-square">
  </a>
</div>
<p align="center">&hearts;</p>

---

TODO...

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

Kadence  
Copyright (C) 2014 - 2018 Gordon Hall  

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
