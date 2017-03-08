/**
* @module kad/utils
*/

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const constants = require('./constants');

/**
 * Returns a random valid key/identity as a string
 * @returns {string}
 */
exports.getRandomKeyString = function() {
  return exports.getRandomKeyBuffer().toString('hex');
};

/**
 * Returns a random valid key/identity as a buffer
 * @returns {buffer}
 */
exports.getRandomKeyBuffer = function() {
  return crypto.randomBytes(constants.B / 8);
};

/**
 * Determines if the given string key is valid
 * @param {string} key - Node ID or item key
 * @returns {boolean}
 */
exports.keyStringIsValid = function(key) {
  let buf;

  try {
    buf = Buffer.from(key, 'hex');
  } catch (err) {
    return false;
  }

  return exports.keyBufferIsValid(buf);
};

/**
 * Determines if the given buffer key is valid
 * @param {buffer} key - Node ID or item key
 * @returns {boolean}
 */
exports.keyBufferIsValid = function(key) {
  return Buffer.isBuffer(key) && key.length === constants.B / 8;
};

/**
 * Calculate the distance between two keys
 * @param {string} key1
 * @param {string} key2
 * @returns {buffer}
 */
exports.getDistance = function(id1, id2) {
  id1 = !Buffer.isBuffer(id1)
      ? Buffer.from(id1, 'hex')
      : id1;
  id2 = !Buffer.isBuffer(id2)
      ? Buffer.from(id2, 'hex')
      : id2;

  assert(exports.keyBufferIsValid(id1), 'Invalid key supplied');
  assert(exports.keyBufferIsValid(id2), 'Invalid key supplied');

  return Buffer(constants.B / 8).map((b, index) => id1[index] ^ id2[index]);
};

/**
 * Compare two buffers for sorting
 * @param {buffer} b1
 * @param {buffer} b2
 * @returns {number}
 */
exports.compareKeyBuffers = function(b1, b2) {
  assert(exports.keyBufferIsValid(b1), 'Invalid key supplied');
  assert(exports.keyBufferIsValid(b2), 'Invalid key supplied');

  for (let index = 0; index < b1.length; index++) {
    let bits = b1[index];

    if (bits !== b2[index]) {
      return bits < b2[index] ? -1 : 1;
    }
  }

  return 0;
};

/**
 * Calculate the index of the bucket that key would belong to
 * @param {string} referenceKey
 * @param {string} foreignKey
 * @returns {number}
 */
exports.getBucketIndex = function(referenceKey, foreignKey) {
  let distance = exports.getDistance(referenceKey, foreignKey);
  let bucketIndex = constants.B;

  for (let byteValue of distance) {
    if (byteValue === 0) {
      bucketIndex -= 8;
      continue;
    }

    for (let i = 0; i < 8; i++) {
      if (byteValue & (0x80 >> i)) {
        return --bucketIndex;
      } else {
        bucketIndex--;
      }
    }
  }

  return bucketIndex;
};

/**
 * Returns a buffer with a power-of-two value given a bucket index
 * @param {string|buffer} referenceKey
 * @param {number} bucketIndex
 * @returns {buffer}
 */
exports.getPowerOfTwoBufferForIndex = function(referenceKey, exp) {
  assert(exp >= 0 && exp < constants.B, 'Index out of range');

  const buffer = Buffer.isBuffer(referenceKey)
               ? Buffer.from(referenceKey)
               : Buffer.from(referenceKey, 'hex');
  const byteValue = parseInt(exp / 8);

  // NB: We set the byte containing the bit to the right left shifted amount
  buffer[constants.K - byteValue - 1] = 1 << (exp % 8);

  return buffer;
};

/**
 * Generate a random number within the bucket's range
 * @param {buffer} referenceKey
 * @param {number} index
 */
exports.getRandomBufferInBucketRange = function(referenceKey, index) {
  let base = exports.getPowerOfTwoBufferForIndex(referenceKey, index);
  let byte = parseInt(index / 8); // NB: Randomize bytes below the power of two

  for (let i = constants.K - 1; i > (constants.K - byte - 1); i--) {
    base[i] = parseInt(Math.random() * 256);
  }

  // NB: Also randomize the bits below the number in that byte and remember
  // NB: arrays are off by 1
  for (let j = index - 1; j >= byte * 8; j--) {
    let one = Math.random() >= 0.5;
    let shiftAmount = j - byte * 8;

    base[constants.K - byte - 1] |= one ? (1 << shiftAmount) : 0;
  }

  return base;
};

/**
 * Validates the given object is a storage adapter
 * @param {object} storageAdapter
 */
exports.validateStorageAdapter = function(storage) {
  assert(typeof storage === 'object',
         'No storage adapter supplied');
  assert(typeof storage.get === 'function',
         'Store has no get method');
  assert(typeof storage.put === 'function',
         'Store has no put method');
  assert(typeof storage.del === 'function',
         'Store has no del method');
  assert(typeof storage.createReadStream === 'function',
         'Store has no createReadStream method');
};

/**
 * Validates the given object is a logger
 * @param {object} logger
 */
exports.validateLogger = function(logger) {
  assert(typeof logger === 'object',
         'No logger object supplied');
  assert(typeof logger.debug === 'function',
         'Logger has no debug method');
  assert(typeof logger.info === 'function',
         'Logger has no info method');
  assert(typeof logger.warn === 'function',
         'Logger has no warn method');
  assert(typeof logger.error === 'function',
         'Logger has no error method');
};

/**
 * Validates the given object is a transport
 * @param {object} transport
 */
exports.validateTransport = function(transport) {
  assert(typeof transport === 'object',
         'No transport adapter supplied');
  assert(typeof transport.read === 'function',
         'Transport has no read method');
  assert(typeof transport.write === 'function',
         'Transport has no write method');
};
