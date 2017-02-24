'use strict';

const Bucket = require('./bucket');
const utils = require('./utils');
const constants = require('./constants');


/**
 * Represents a kademlia routing table
 */
class RoutingTable extends Map {

  /**
   * Don't ping contact at bucket head if seen within this time
   * @static
   * @memberof RoutingTable
   */
  static get PING_TTL() {
    return 300000;
  }

  /**
   * Constructs a routing table
   * @constructor
   * @param {buffer} identity - Reference point for calculating distances
   */
  constructor(identity) {
    super();

    this.identity = identity || utils.getRandomKeyBuffer();

    for (let b = 0; b < constants.B; b++) {
      this.set(b, new Bucket());
    }
  }

  /**
   * Returns the total contacts in the routing table
   * @property {number} size
   */
  get size() {
    let contacts = 0;
    this.forEach((bucket) => contacts += bucket.length);
    return contacts;
  }

  /**
   * Returns the total buckets in the routing table
   * @property {number} length
   */
  get length() {
    let buckets = 0;
    this.forEach(() => buckets++);
    return buckets;
  }

  /**
   * Returns the bucket index of the given node id
   * @param {string|buffer} nodeId
   * @returns {number}
   */
  indexOf(nodeId) {
    return utils.getBucketIndex(this.identity, nodeId);
  }

  /**
   * Returns the contact object associated with the given node id
   * @param {string|buffer} nodeId
   * @returns {object}
   */
  getContactByNodeId(nodeId) {
    return this.get(this.indexOf(nodeId)).get(nodeId.toString('hex'));
  }

  /**
   * Removes the contact from the routing table given a node id
   * @param {string|buffer} nodeId
   * @return {boolean}
   */
  removeContactByNodeId(nodeId) {
    return this.get(this.indexOf(nodeId)).delete(nodeId.toString('hex'));
  }

  /**
   * Adds the contact to the routing table in the proper bucket position,
   * returning the [bucketIndex, bucket, contactIndex, contact]; if the
   * returned contactIndex is -1, it indicates the bucket is full and the
   * contact was not added; kademlia implementations should PING the contact
   * at bucket.head to determine if it should be dropped before calling this
   * method again
   * @param {string|buffer} nodeId
   * @param {object} contact
   * @returns {array}
   */
  addContactByNodeId(nodeId, contact) {
    const bucketIndex = this.indexOf(nodeId);
    const bucket = this.get(bucketIndex);
    const contactIndex = bucket.set(nodeId, contact);

    return [bucketIndex, bucket, contactIndex, contact];
  }

  /**
   * Returns the [index, bucket] of the occupied bucket with the lowest index
   * @returns {array}
   */
  getClosestBucket() {
    for (let [index, bucket] of this) {
      if (index < constants.B - 1 && bucket.length === 0) {
        continue;
      }
      return [index, bucket];
    }
  }

  /**
   * Returns an array of all occupied buckets further than the closest
   * @returns {array}
   */
  getBucketsBeyondClosest() {
    const furtherBuckets = [];
    const [closestBucketIndex] = this.getClosestBucket();

    for (let i = closestBucketIndex + 1; i < constants.B; i++) {
      if (this.get(i).length === 0) {
        continue;
      }
      furtherBuckets.push([i, this.get(i)]);
    }

    return furtherBuckets;
  }

  /**
   * Returns a map of N contacts closest to the supplied key
   * @param {string|buffer} key
   * @param {number} [n=20] - Number of results to return
   * @returns {map}
   */
  getClosestContactsToKey(key, n = constants.K) {
    const bucketIndex = this.indexOf(key);
    const contactResults = new Map();

    function _addNearestFromBucket(bucket) {
      bucket.getClosestToKey(key)
        .splice(0, n - contactResults.size)
        .forEach((result) => {
          if (contactResults.size < n) {
            contactResults.set(result.nodeId, result.contact);
          }
        });
    }

    let ascIndex = bucketIndex;
    let descIndex = bucketIndex;

    _addNearestFromBucket(this.get(bucketIndex));

    while (contactResults.size < n && ascIndex < constants.B) {
      _addNearestFromBucket(this.get(ascIndex++));
    }

    while (contactResults.size < n && descIndex >= 0) {
      _addNearestFromBucket(this.get(descIndex--));
    }

    return contactResults;
  }

}

module.exports = RoutingTable;
