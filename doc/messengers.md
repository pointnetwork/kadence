Kad implements a generic {@link Messenger} class that is used as the interface 
between the application layer and the transport adapter. This interface exposes 
2 primary members: `serializer` and `deserializer`.

As you might expect, both of these objects are streams. Both are transform 
streams. The transport adapter's readable end is piped through the 
deserializer which is then processed by the middleware stack implemented by 
the {@link AbstractNode}. The serializer is piped through the transport 
adapter's writable end, which dispatches the message.

By default, the messenger uses a built-in JSON-RPC serializer and deserializer. 
It is possible to completely change the message format sent over the network 
if desired by passing {@link KademliaNode} your own instance of 
{@link Messenger} using your own serializer and deserializer.

```
const messenger = new kad.Messenger({
  serializer: MyCustomSerializer,
  deserializer: MyCustomDeserializer
});
const node = kad({
  // ...
  messenger: messenger
});
```

> Note that the {@link KademliaRules} still expect the deserialized message to 
> include `method` and `params` properties.

