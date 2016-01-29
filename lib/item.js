'use strict';

var assert = require('assert');
var utils = require('./utils');

/**
 * Represents an item to store
 * @constructor
 * @param {String} key - Lookup key
 * @param {String} value - Stored value
 * @param {String} publisher - Original publisher's nodeID
 * @param {Number} timestamp - Optional UNIX timestamp of original publication
 */
function Item(key, value, publisher, timestamp) {
  if (!(this instanceof Item)) {
    return new Item(key, value, publisher, timestamp);
  }

  assert(typeof key === 'string', 'Invalid key supplied');
  assert(typeof value === 'string', 'Value must be a string');
  assert(utils.isValidKey(publisher), 'Invalid publisher nodeID supplied');

  if (timestamp) {
    assert(typeof timestamp === 'number', 'Invalid timestamp supplied');
    assert(Date.now() >= timestamp, 'Timestamp cannot be in the future');
  }

  this.key = key;
  this.value = value;
  this.publisher = publisher;
  this.timestamp = timestamp || Date.now();
}

module.exports = Item;
