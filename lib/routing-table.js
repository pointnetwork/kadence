'use strict';

const Bucket = require('./bucket');
const utils = require('./utils');
const constants = require('./constants');


/**
 * Represents a kademlia routing table
 */
class RoutingTable extends Map {

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

  // TODO

}

module.exports = RoutingTable;
