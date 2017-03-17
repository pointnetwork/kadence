Kad represents other peers by using a identity-contact pair. Any time an entry 
in a {@link Bucket} is retrieved or placed, it is in the format of a tuple. 
The item at index 0 is *always* the string representation of the `B` size 
identity key in hexadecimal. The item at index 1 can be any arbitrary JSON 
serializable object that the {@link transport-adapters transport adapter} in 
use understands.

For example the {@link HTTPTransport} and the {@link UDPTransport} both accept 
an object cotaining `hostname` and `port` properties. Other transports may 
accept whatever they need. When constructing your {@link KademliaNode} 
instance, these properties are set by you as `identity` and `contact`. If the 
`identity` value is omitted, it will be randomly generated.

> Take note that for a stable network, you will need to persist identities 
> generated as nodes store data based on this key.

```js
const node = kad({
  // ...
  identity: '059e5ce8d0d3ee0225ffe982e38f3f5f6f748328',
  contact: {
    hostname: 'my.reachable.hostname',
    port: 1337
  }
})
```

Since nodes may be using 
[NAT traversal techniques](https://github.com/kadtools/kad-traverse) to 
become addressable on the internet, this identity-contact pair is included in 
every message payload instead of relying on inferred return address 
information at the transport layer. This makes every JSON-RPC message payload
an array, containing one request message and one notification message.

```json
[
  {
    "jsonrpc": "2.0",
    "id": "<uuid>",
    "method": "FIND_NODE",
    "params": ["059e5ce8d0d3ee0225ffe982e38f3f5f6f748328"]
  },
  {
    "jsonrpc": "2.0",
    "method": "IDENTITY",
    "params": [
      "059e5ce8d0d3ee0225ffe982e38f3f5f6f748328",
      {
        "hostname": "<reachable hostname>",
        "port": 1337
      }
    ]
  }
]
```
