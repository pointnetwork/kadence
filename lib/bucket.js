'use strict';

const constants = require('./constants');

/**
 * Represents a column of the routing table holding up to K contacts
 */
class Bucket extends Map {

  /**
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * @property {number} length - The number of contacts in the bucket
   */
  get length() {
    return super.size;
  }

  /**
   * @property {object} head - The contact at the bucket head
   */
  get head() {
    return [...super.values()].pop();
  }

  /**
   * @property {object} tail - The contact at the bucket tail
   */
  get tail() {
    return [...super.values()].shift();
  }

  /**
   * Sets the contact to the node ID in the bucket if it is not full
   * @param {string} nodeId - The identity key for the contact
   * @param {object} contact - The address information for the contact
   */
  set(nodeId, contact) {
    if (this.size === constants.K) {
      return false;
    }

    super.delete(nodeId);
    super.set(nodeId, contact);

    return this;
  }

}

module.exports = Bucket;
