'use strict';

/**
 * Represent kademlia protocol handlers
 * @class
 */
class KademliaRules {

  /**
   * Constructs a kademlia rules instance in the context of a
   * {@link KademliaNode}
   * @constructor
   * @param {KademliaNode} node
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * This RPC involves one node sending a PING message to another, which
   * presumably replies with a PONG. This has a two-fold effect: the
   * recipient of the PING must update the bucket corresponding to the
   * sender; and, if there is a reply, the sender must update the bucket
   * appropriate to the recipient.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  ping(request, response, next) {
    // TODO
  }

  /**
   * The sender of the STORE RPC provides a key and a block of data and
   * requires that the recipient store the data and make it available for
   * later retrieval by that key.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  store(request, response, next) {
    // TODO
  }

  /**
   * The FIND_NODE RPC includes a 160-bit key. The recipient of the RPC returns
   * up to K contacts that it knows to be closest to the key. The recipient
   * must return K contacts if at all possible. It may only return fewer than K
   * if it is returning all of the contacts that it has knowledge of.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  findNode(request, response, next) {
    // TODO
  }

  /**
   * A FIND_VALUE RPC includes a B=160-bit key. If a corresponding value is
   * present on the recipient, the associated data is returned. Otherwise the
   * RPC is equivalent to a FIND_NODE and a set of K contacts is returned.
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  findValue(request, response, next) {
    // TODO
  }

}

module.exports = KademliaRules;
