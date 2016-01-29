/**
 * @module kad/constants
 */

'use strict';

var ms = require('ms');

module.exports = {

  /** @constant {Number} ALPHA */
  ALPHA: 3,

  /** @constant {Number} B */
  B: 160,

  /** @constant {Number} K */
  K: 20,

  /** @constant {Number} T_REFRESH */
  T_REFRESH: ms('3600s'),

  /** @constant {Number} T_REPLICATE */
  T_REPLICATE: ms('3600s'),

  /** @constant {Number} T_REPUBLISH */
  T_REPUBLISH: ms('86400s'),

  /** @constant {Number} T_EXPIRE */
  T_EXPIRE: ms('86405s'),

  /** @constant {Number} T_RESPONSETIMEOUT */
  T_RESPONSETIMEOUT: ms('5s'),

  /** @constant {Array} MESSAGE_TYPES */
  MESSAGE_TYPES: [
    'PING',
    'STORE',
    'FIND_NODE',
    'FIND_VALUE'
  ]

};
