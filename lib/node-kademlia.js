'use strict';

const AbstractNode = require('./node-abstract');
const KademliaRules = require('./rules-kademlia');


/**
 * Extends {@link AbstractNode} with Kademlia-specific rules
 * @class
 */
class KademliaNode extends AbstractNode {

  /**
   * @constructor
   */
  constructor(options) {
    super(options);

    let handlers = new KademliaRules(this);

    this.use('PING', handlers.ping);
    this.use('STORE', handlers.store);
    this.use('FIND_NODE', handlers.findNode);
    this.use('FIND_VALUE', handlers.findValue);
  }

  /**
   * Inserts the given contact into the routing table and uses it to perform
   * a {@link KademliaProtocol#iterativeFindNode} for this node's identity,
   * then refreshes all buckets further than it's closest neighbor, which will
   * be in the occupied bucket with the lowest index
   * @param {string|object} contact - Address data for the initial contact
   * @emits AbstractNode#join
   */
  join(contact) {
    // TODO
  }

  /**
   * Sends a PING message to the supplied contact
   * @param {string|object} contact
   * @param {KademliaNode~pingCallback} callback
   */
  ping(contact, callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~pingCallback
   * @param {error|null} error
   * @param {number} latency - Milliseconds before response received
   */

  /**
   * Performs a {@link KademliaNode#iterativeFindNode} to collect K contacts
   * closests to the given key, sending a STORE message to each of them
   * @param {buffer|string} key
   * @param {buffer|string} value
   * @param {KademliaNode~iterativeStoreCallback} callback
   */
  iterativeStore(key, value, callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~iterativeStoreCallback
   * @param {error|null} error
   * @param {number} stored - Total nodes who stored the pair
   */

  /**
   * Basic kademlia lookup operation that builds a set of K contacts closest
   * to the given key
   * @param {buffer|string} key
   * @param {KademliaNode~iterativeFindNodeCallback} callback
   */
  iterativeFindNode(key, callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~iterativeFindNodeCallback
   * @param {error|null} error
   * @param {string[]|object[]} contacts - Result of the lookup operation
   */

  /**
   * Kademlia search operation that is conducted as a node lookup and builds
   * a list of K closest contacts. If at any time during the lookup the value
   * is returned, the search is abandoned. If no value is found, the K closest
   * contacts are returned. Upon success, we must store the value at the
   * nearest node seen during the search that did not return the value.
   * @param {buffer|string} key
   * @param {KademliaNode~iterativeFindValueCallback} callback
   */
  iterativeFindValue(key, callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~iterativeFindValueCallback
   * @param {error|null} error
   * @param {buffer|null} value
   * @param {string[]|object[]} contacts
   */

  /**
   * Performs a scan of the storage adapter and performs
   * republishing/replication of items stored. Items that we did not publish
   * ourselves get republished every T_REPLICATE. Items we did publish get
   * republished every T_REPUBLISH.
   * @param {KademliaNode~replicateCallback} callback
   */
  replicate(callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~replicateCallback
   * @param {error|null} error
   * @param {number} itemsReplicated
   */

  /**
   * Items expire T_EXPIRE seconds after the original publication. All items
   * are assigned an expiration time which is "exponentially inversely
   * proportional to the number of nodes between the current node and the node
   * whose ID is closest to the key", where this number is "inferred from the
   * bucket structure of the current node".
   * @param {KademliaNode~expireCallback} callback
   */
  expire(callback) {
    // TODO
  }
  /**
   * @callback KademliaNode~expireCallback
   * @param {error|null} error
   * @param {number} itemsExpired
   */

}

module.exports = KademliaNode;
