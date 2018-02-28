'use strict';

const async = require('async');
const mkdirp = require('mkdirp');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Solution = require('./solution');
const secp256k1 = require('secp256k1');
const { EventEmitter } = require('events');


/**
 * Manages owned solutions as files in a directory
 */
class Wallet extends EventEmitter {

  /**
   * @constructor
   * @param {string} directory - Path to wallet directory
   * @param {buffer} privateKey - Owner private key
   */
  constructor(directory, privateKey) {
    super();
    assert(fs.existsSync(directory), 'Invalid wallet directory');
    assert(privateKey && privateKey.length === 32, 'Invalid private key');

    this.directory = directory;
    this.privateKey = privateKey;
  }

  /**
   * @property {string[]} solutions - List of solution results
   */
  get solutions() {
    return fs.readdirSync(this.directory).filter(name => {
      return !fs.statSync(path.join(this.directory, name)).isDirectory();
    });
  }

  /**
   * @property {number} balance - Total number of solutions stored
   */
  get balance() {
    return this.solutions.length;
  }

  /**
   * Scans all solutions in the wallet and moves invalid ones to a directory
   * named ".invalid"
   * @returns {Promise}
   */
  validate() {
    return new Promise(resolve => {
      mkdirp.sync(path.join(this.directory, '.invalid'));
      mkdirp.sync(path.join(this.directory, '.transferred'));
      async.eachSeries(this.solutions, (key, next) => {
        /* eslint max-statements: [2, 22] */
        const invalidate = () => {
          fs.rename(path.join(this.directory, key),
            path.join(this.directory, '.invalid', key), next);
        };

        const archive = () => {
          fs.rename(path.join(this.directory, key),
            path.join(this.directory, '.transferred', key), next);
        };

        let solution = null;

        try {
          solution = this.get(key);
        } catch (err) {
          invalidate();
          return next();
        }

        const publicKey = secp256k1.publicKeyCreate(this.privateKey);
        const isOwner = Buffer.compare(solution.owner, publicKey) === 0;
        const isIssuer = Buffer.compare(solution.issuer, publicKey) === 0;

        if (!isOwner) {
          if (isIssuer) {
            try {
              solution.verify();
            } catch (err) {
              return invalidate();
            }
            archive();
          } else {
            return invalidate();
          }
        } else {
          try {
            solution.verify();
          } catch (err) {
            return invalidate();
          }
          next();
        }
      }, resolve);
    });
  }

  /**
   * Returns the {@link Solution} by it's result key
   * @param {buffer|string} key
   * @returns {Solution}
   */
  get(key) {
    if (Buffer.isBuffer(key)) {
      key = key.toString('hex');
    }

    assert(fs.existsSync(path.join(this.directory, key)),
      'Solution does not exist in wallet');

    return new Solution(fs.readFileSync(path.join(this.directory, key)));
  }

  /**
   * Creates or overwrites a solution
   * @param {Solution} solution
   */
  put(solution) {
    assert(solution instanceof Solution, 'Invalid solution object supplied');
    assert(Buffer.compare(solution.owner,
      secp256k1.publicKeyCreate(this.privateKey)) === 0,
      'Refusing to insert solution - you are not the owner');
    solution.verify();
    fs.writeFileSync(path.join(this.directory,
      solution.result.toString('hex')), solution.toBuffer());
  }

  /**
   * Transfers ownership of a solution to a new public key and removes the
   * solution from the wallet
   * @param {string|buffer} solutionKey
   * @param {buffer} publicKey
   * @returns {Solution}
   */
  transfer(solutionKey, publicKey) {
    const solution = this.get(solutionKey);

    solution.issuer = solution.owner;
    solution.owner = publicKey;

    solution.sign(this.privateKey);
    solution.verify();
    mkdirp.sync(path.join(this.directory, '.transferred'));
    fs.renameSync(path.join(this.directory, solutionKey.toString('hex')),
      path.join(this.directory, '.transferred', solutionKey));

    return solution;
  }

}

module.exports = Wallet;
