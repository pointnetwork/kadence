Kad
===

[![Build Status](https://img.shields.io/travis/kadtools/kad.svg?style=flat-square)](https://travis-ci.org/kadtools/kad)
[![Coverage Status](https://img.shields.io/coveralls/kadtools/kad.svg?style=flat-square)](https://coveralls.io/r/kadtools/kad)
[![NPM](https://img.shields.io/npm/v/kad.svg?style=flat-square)](https://www.npmjs.com/package/kad)

Extensible implementation of the
[Kademlia](http://www.scs.stanford.edu/~dm/home/papers/kpos.pdf) distributed
hash table for Node.js and the browser.

## Quick Start

**For complete documentation on using and extending Kad,
[read the documentation](doc/).**

```bash
npm install kad
```

Create your node, plug in your storage adapter, join the network, and party!

```js
var kad = require('kad');

var seed = {
  address: '127.0.0.1',
  port: 1338
};

var dht = new kad.Node({
  transport: kad.transports.UDP(kad.contacts.AddressPortContact({
    address: '127.0.0.1',
    port: 1337
  })),
  storage: kad.storage.FS('path/to/datadir')
});

dht.connect(seed, function(err) {
  // dht.get(key, callback);
  // dht.put(key, value, callback);
});
```

You can build Kad for the browser by running:

```
npm run build
```

> This will output to `dist/kad.browser.js` and will bind to `window` when
> loaded in your web application.

You can run a network simulation locally using the included simulator. This
will create `n` nodes (as you define) and connect them to each other, sending
`STORE` messages on an interval and printing information to the console.

```bash
# use the default of 6 nodes
npm run simulation
# specify as many nodes as you like
npm run simulation 128
```

## Transports

Kad ships with support for UDP, TCP, and HTTP transports. To explicitly define
the transport to use, set the `transport` option to the appropriate value. See
the documentation on [`kad.RPC`](doc/rpc.md) and [`kad.Contact`](doc/contact.md)
for more information.

```js
var dht = new kademlia.Node({
  // ...
  transport: kademlia.transports.TCP(contact, options)
});
```

If you would like to author your own transport adapter, see
[kad-transport-boilerplate](https://github.com/gordonwritescode/kad-transport-boilerplate).

### Community Transport Adapters

* [WebRTC](https://github.com/omphalos/kad-webrtc)

## Persistence

Kad does not make assumptions about how your nodes will store their data,
instead relying on you to implement a storage adapter of your choice. This is
as simple as providing `get(key, callback)`, `put(key, value, callback)`,
`del(key, callback)`, and `createReadStream()` methods.

This works well with [levelup](https://github.com/rvagg/node-levelup), but you
could conceivably implement any storage layer you like provided you expose the
interface described above. Some adapters have already been contributed by the
community, listed below.

### Community Storage Adapters

* [Local Storage](https://github.com/omphalos/kad-localstorage)
* [MongoDB](https://github.com/niahmiah/kad-mongo)
* [File System](https://github.com/gordonwritescode/kad-fs)

## Extensions

### Sybil/Spartacus Mitigation

You can use [kad-spartacus](https://github.com/gordonwritescode/kad-spartacus)
to mitigate 2 types of attacks to which a Kademlia DHT may be vulnerable: the
Sybil attack and it's variant, Spartacus.

[Read More →](https://github.com/gordonwritescode/kad-spartacus/blob/master/README.md)

### NAT Traversal

You can use [kad-traverse](https://github.com/gordonwritescode/kad-traverse)
to ensure your nodes are able to communicate when behind a NAT or firewall. The
extension will use different strategies based on the network configuration.

[Read More →](https://github.com/gordonwritescode/kad-traverse/blob/master/README.md)

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
