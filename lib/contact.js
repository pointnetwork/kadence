'use strict';

var assert = require('assert');
var utils = require('./utils');

/**
 * Represents a contact (or peer)
 * @constructor
 * @param {Object} options
 * @param {String} options.nodeID - Optional known 160 bit node ID
 */
function Contact(options) {
  if (!(this instanceof Contact)) {
    return new Contact(options);
  }

  assert(options instanceof Object, 'Invalid options were supplied');

  Object.defineProperty(this, 'nodeID', {
    value: options.nodeID || this._createNodeID(),
    configurable: false,
    enumerable: true
  });

  assert(utils.isValidKey(this.nodeID), 'Invalid nodeID was supplied');

  this.seen();
}

/**
 * Updates the lastSeen property to right now
 */
Contact.prototype.seen = function() {
  this.lastSeen = Date.now();
};

/**
 * Unimplemented stub, called when no nodeID is passed to constructor.
 * @private
 */
Contact.prototype._createNodeID = function() {
  throw new Error('Method not implemented');
};

module.exports = Contact;
