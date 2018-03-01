'use strict';

const assert = require('assert');
const hdkey = require('hdkey');
const utils = require('./utils');
const constants = require('./constants');
const Solution = require('./solution');
const secp256k1 = require('secp256k1');


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
    let [key, item] = request.params;
    let solution, value, signature;

    try {
      solution = new Solution(Buffer.from(item.value[0]));
      value = item.value[1];
      signature = item.value[2];

      assert(secp256k1.verify(utils.hash256(Buffer.from(value[1], 'hex')),
        Buffer.from(signature, 'hex'), solution.publicKey.toString('hex')),
        'Invalid signature from solution owner');
      assert(utils.isHexaString(value), 'Value must be serialized as hex');
      assert(key === utils.hash160(solution.result).toString('hex'),
        'Key must be the RMD-160 hash of the solution result');
    } catch (err) {
      return next(err);
    }

    next();
  }

}

module.exports = Rules;
