'use strict';

const utils = require('./utils');
const secp256k1 = require('secp256k1');
const assert = require('assert');
const constants = require('./constants');


/**
 * Represents a solution that can be serialized and stored
 */
class Solution {

  /**
   * @constructor
   * @param {buffer} solution - Byte representation of the solution input
   * @param {buffer} [owner] - Identity key of owner
   */
  constructor(solution) {
    assert(solution.length === 260, 'Invalid solution length');

    this.origin = solution.slice(0, 33);
    this.noise = solution.slice(33, 66);
    this.originSignature = solution.slice(66, 130);
    this.issuer = solution.slice(130, 163);
    this.owner = solution.slice(163, 196);
    this.issuerSignature = solution.slice(196, 260);
    this.result = utils.scrypt(Buffer.concat([
      this.origin,
      this.noise,
      this.originSignature
    ]));
  }

  /**
   * Signs the solution with the supplied private key
   * @param {buffer} prv
   * @returns {Solution}
   */
  signOrigin(prv) {
    assert(Buffer.compare(secp256k1.publicKeyCreate(prv), this.origin) === 0,
      'Refusing to sign solution to which you are not the origin');

    this.originSignature = secp256k1.sign(
      utils.hash256(Buffer.concat([this.origin, this.noise])),
      prv
    ).signature;

    return this;
  }

  /**
   * Signs the solution with the supplied private key
   * @param {buffer} prv
   * @returns {Solution}
   */
  signIssuance(prv) {
    assert(Buffer.compare(secp256k1.publicKeyCreate(prv), this.issuer) === 0,
      'Refusing to sign solution to which you are not the owner');

    this.issuerSignature = secp256k1.sign(
      utils.hash256(Buffer.concat([this.issuer, this.owner])),
      prv
    ).signature;

    return this;
  }

  /**
   * Verifies the solution is valid
   * @returns {Solution}
   */
  verify() {
    assert(this.toBuffer().length === 260, 'Invalid solution length');
    assert(utils.satisfiesDifficulty(this.result,
      constants.SOLUTION_DIFFICULTY), 'Invalid solution difficulty');
    assert(secp256k1.verify(utils.hash256(
      Buffer.concat([this.origin, this.noise])
    ), this.originSignature, this.origin), 'Invalid signature from origin');
    assert(secp256k1.verify(utils.hash256(
      Buffer.concat([this.issuer, this.owner])
    ), this.issuerSignature, this.issuer), 'Invalid signature from issuer');

    return this;
  }

  /**
   * Converts to a buffer
   * @returns {buffer}
   */
  toBuffer() {
    return Buffer.concat([
      this.origin,
      this.noise,
      this.originSignature,
      this.issuer,
      this.owner,
      this.issuerSignature
    ]);
  }

  /**
   * Serializes the solution object for storage in the DHT
   * @returns {string[]}
   */
  pack() {
    return [
      utils.hash160(this.result).toString('hex'),
      this.toBuffer().toString('hex')
    ];
  }

}

module.exports = Solution;
