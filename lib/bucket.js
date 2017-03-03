'use strict';

const constants = require('./constants');
const utils = require('./utils');

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
   * Sets the contact to the node ID in the bucket if it is not full; if the
   * bucket already contains the contact, move it to the tail - otherwise we
   * place it at the head
   * @param {string} nodeId - The identity key for the contact
   * @param {object} contact - The address information for the contact
   * @returns {number} index
   */
  set(nodeId, contact) {
    if (this.has(nodeId)) {
      super.delete(nodeId);
      super.set(nodeId, contact);
    } else if (this.size < constants.K) {
      let bucketEntries = [...this.entries()];

      super.clear();
      super.set(nodeId, contact);

      for (let [nodeId, contact] of bucketEntries) {
        super.set(nodeId, contact);
      }
    }

    return this.indexOf(nodeId);
  }

  /**
   * Returns the index of the given node id
   * @param {string} key
   * @returns {number}
   */
  indexOf(key) {
    let isMissing = -1;
    let index = isMissing;

    for (let nodeId of this.keys()) {
      index++;

      if (key !== nodeId) {
        continue;
      }

      return index;
    }

    return isMissing;
  }

  /**
   * Returns an array of contacts in the bucket that are closest to the given
   * key
   * @param {string|buffer} key
   * @returns {array}
   */
  getClosestToKey(key) {
    let contacts = [];

    for (let [nodeId, contact] of this.entries()) {
      contacts.push({
        contact, nodeId, distance: utils.getDistance(nodeId, key)
      });
    }

    return contacts.sort((a, b) => {
      return utils.compareKeyBuffers(
        Buffer.from(a.distance, 'hex'),
        Buffer.from(b.distance, 'hex')
      );
    }).filter((result) => {
      return result.nodeId !== key.toString('hex');
    });
  }
}

module.exports = Bucket;
