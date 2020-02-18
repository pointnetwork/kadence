An increasing number of users have reported difficulty with using Kadence for 
network-wide broadcast messages. In many cases the Quasar plugin is used to 
satisfy this need. Quasar is a distributed publish/subscribe system that was 
originally designed for use with large decentralized social networks wherein 
a wide number of participants would be subscribed to a diverse set of 
categories or "topics". The system boasted high a percentage of message 
delivery based on a probablistic delivery model.

However, this design is unsuitable for scenarios where a message must 
propagate the entire network. Because of Quasar's relay properties, certain 
nodes end up in "dead zones" in networks where all nodes are subscribed to the 
same topic. This is also a function of Kademlia's design, where a single node 
does not need to know of all other nodes - nor does any given node need to 
"broadcast" messages to the entire network.

Generally, these scenarios where Kadence is being used to fill this role is 
largely in the development of various distributed ledger technology systems 
(such as blockchain-centered networks). Historically, these use cases were 
largely considered out of scope for Kadence given that its core focus is to 
implement a hardened and more robust implementation of the Kademlia distributed 
hash table. However, there is a growing demand for leveraging Kademlia
as a decentralized peer discovery system within what would otherwise be an 
unstructured network. This specification documents a broadcast/flood routing 
extension for Kadence that aims to satisfy this use case.

### Routing Issues

The primary routing table is maintained according to Kademlia's bucket 
sorting, refresh, and eviction rules. Because of the nature of that design, 
many discovered peers do not make it into an individual node's table. This is 
because the number of nodes that are XOR furthest from any given node is 
exponentially higher than those that are the next closest bucket. 

This means that even though any given node may at some point become aware of 
all or most nodes in the network, after K(=20) contacts are placed in a bucket, 
none of them will be evicted until they have been unresponsive for some time. 
If we were to deliver a message to every node in our routing table, we'd still 
fail to deliver our message to more and more participants the bigger our network
grows.

One possible approach to this might be to maintain a secondary peer list that 
tracks every contact that a node learns about and periodically performs 
connectivity checks to maintain a list of peers known to be online. However, 
this approach may suffer from similar "dead-zone" issues depending on the 
network topography - some contacts may never be shared with a given node due to 
a combination of far XOR distance, good network health - longer lived nodes 
staying online, and how frequently the node is making queries in those 
keyspaces. 

### Broadcast and Relay

Considering this understanding of the way routing works in Kadence, we 
acknowledge that in order to deal with these "dead-zones" (which might be 
considered a "feature" of Kademlia's simple and efficient lookup algorithm), 
there must be facilities in place to relay broadcast messages further into the 
network, irrespective of adjustments/additions made to the routing 
implementation.

Kademlia's lookup protocol is centered around finding peer and data that are 
XOR *closest* to a key, which is why nodes have more information and data that 
is XOR closest to them and less information and data that is furthest. Since 
the issue in question is with delivering messages to nodes which are furthest 
from the message origin, broadcast originators can deliver their message to 
every contact in their routing table (which, while highly improbable, could be 
as many as B\*K(=3200)).

This new `FLOOD` message should be sent to all known contacts using a 
parallelism degree equal to ALPHA(=3). Upon receipt of a `FLOOD` message, a 
node must check if they have received/relayed the message already. If they 
have, they must do nothing aside from ACK receipt. If the node has never 
received/relayed the message, they must ACK receipt *and* forward contents. 
The relayed message is sent as a `FLOOD` message to K(=20) nodes that are 
*further than recipient from the origin*.

There is no TTL, the flood ends when every peer has received the message and 
attempted to relay it to nodes further than them from the origin. This approach 
allows us to keep taking advantage of Kademlia's routing, doesn't require 
maintaining a separate routing table or connection pool, and should yield a 
deeper and more consistent network penetration with less duplicate messages 
and more reliable delivery for network wide subscriptions than is currently 
achieved with Quasar.

### Message Structure

The message format follows the same envelope structure as all other Kadence 
messages. Its payload includes an `origin` - which is a {@link Bucket~contact}, 
`content` - which can be any JSON-serializable data, and `signature` - a 
secp256k1 signature of `{origin, content}`.  Validity checks are performed on 
the `FLOOD` messages before handling to ensure they have not been tampered with.

### Example Usage

> This API is not finalized

```js
const node = new kadence.KademliaNode({
  logger,
  transport,
  contact,
  storage
});

function onReceiveFloodMessage(content, origin) {
  // handle flooded messages
}

node.plugin(kadence.flood(onReceiveFloodMessage, {
  sign: function(origin, content) {
    // optional pluggable integrity checking
  },
  verify: function(origin, content, signature) {
    // optional pluggable integrity checking
  },
}));

node.floodBroadcast({ any, json, content});
```
