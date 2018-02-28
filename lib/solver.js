'use strict';

const async = require('async');
const secp256k1 = require('secp256k1');
const assert = require('assert');
const { Readable } = require('stream');
const constants = require('./constants');
const Solution = require('./solution');
const utils = require('./utils');


/**
 * Kadence identity solver. Accepts a private key and exposes a
 * readable stream of signed solutions for import into a {@link Wallet}.
 */
class Solver extends Readable {

  static get difficulty() {
    return constants.SOLUTION_DIFFICULTY;
  }

  /**
   * @constructor
   * @param {buffer} privateKey - Private identity key to solve
   */
  constructor(privateKey) {
    super({ objectMode: true });
    assert(secp256k1.privateKeyVerify(privateKey),
      'Invalid private key supplied');

    this.privateKey = privateKey;
    this.publicKey = secp256k1.publicKeyCreate(this.privateKey);
  }

  /**
   * @private
   */
  _read() {
    const publicKey = this.publicKey;
    const privateKey = this.privateKey;

    let attempts = 0;
    let begin = Date.now();
    let solution, result = Buffer.alloc(32).fill(255);

    function solutionFound() {
      return utils.satisfiesDifficulty(result, Solver.difficulty);
    }

    function attemptSolution(next) {
      const noise = utils.noise33();

      solution = Buffer.concat([
        publicKey,
        noise,
        secp256k1.sign(utils.hash256(
          Buffer.concat([publicKey, noise])), privateKey).signature
      ]);

      utils.scrypt(solution, (err, hash) => {
        if (err) {
          return next();
        }

        result = hash;
        attempts++;
        next();
      });
    }

    async.until(solutionFound, attemptSolution, err => {
      if (err) {
        return this.emit('error', err);
      }

      const sol = new Solution(Buffer.concat([
        solution,
        publicKey,
        publicKey,
        Buffer.alloc(64).fill(0) // NB: Empty field for issuer sig
      ]));

      sol.signOrigin(this.privateKey);
      sol.signIssuance(this.privateKey);

      try {
        sol.verify();
      } catch (err) {
        return this.emit('error', err);
      }

      this.push({
        time: Date.now() - begin,
        attempts,
        solution: sol
      });
    });
  }

}

module.exports = Solver;
