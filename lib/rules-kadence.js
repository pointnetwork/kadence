'use strict';

const assert = require('assert');
const hdkey = require('hdkey');
const utils = require('./utils');
const constants = require('./constants');


/**
 * Represents Kadence protocol handlers
 */
class Rules {

  /**
   * Constructs a Kadence rules instance in the context of a Veranet node
   * @constructor
   * @param {Node} node
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * Validates all incoming RPC messages
   * @param {object} request
   * @param {object} response
   */
  validate(request, response, next) {
    const publicKey = hdkey.fromExtendedKey(request.contact[1].xpub)
      .deriveChild(request.contact[1].index).publicKey;

    try {
      assert(utils.isCompatibleVersion(request.contact[1].agent),
        `Unsupported protocol version ${request.contact[1].agent}`);
      assert(utils.satisfiesDifficulty(
        utils.scrypt(publicKey),
        constants.IDENTITY_DIFFICULTY
      ), 'Identity key does not satisfy the network difficulty');
    } catch (err) {
      return next(err);
    }

    return next();
  }

  /**
   * Performs all Kadence specific validation rules to STORE a value
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  beforeValueStored(request, response, next) {
    return next(new Error('Not implemented'));
  }

}

module.exports = Rules;
