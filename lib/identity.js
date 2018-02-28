/**
 * @module kadence/identity
 */

'use strict';

const { EventEmitter } = require('events');
const async = require('async');
const hdkey = require('hdkey');
const utils = require('./utils');
const constants = require('./constants');


/**
 * Validates the given extended private key and index
 * @function
 * @param {string} xprv - Private extended key string
 * @param {number} index - Child derivation index
 * @returns {boolean}
 */
module.exports.validate = function(xprv, index) {
  const parent = hdkey.fromExtendedKey(xprv)
    .derive(constants.HD_KEY_DERIVATION_PATH);
  const child = parent.deriveChild(index);
  const result = utils.scrypt(child.publicKey);

  return utils.satisfiesDifficulty(result, constants.IDENTITY_DIFFICULTY);
};

/**
 * Finds the correct derivation index starting at counter
 * @function
 * @returns {Promise}
 */
module.exports.solve = function(xprv, index = 0, events = new EventEmitter()) {
  return new Promise((resolve, reject) => {
    async.until(
      () => module.exports.validate(xprv, index),
      (done) => {
        index++;
        events.emit('index', index);

        if (index > constants.MAX_NODE_INDEX) {
          return done(new Error('Derivation indexes exhausted'));
        }

        setImmediate(done);
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(index);
        }
      }
    );
  });
};
