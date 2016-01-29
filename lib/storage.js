/**
 * @module kad/storage
 */

'use strict';

module.exports = {

  /** @external kad-fs */
  /**
   * @constructor
   * @param {String} datadir - Directory to store items
   */
  FS: require('kad-fs'),

  /** @external kad-localstorage */
  /**
   * @constructor
   * @param {String} namespace - Prefix for keys in localStorage
   */
  LocalStorage: require('kad-localstorage'),

  /** @external kad-memstore */
  /**
   * @constructor
   */
  MemStore: require('kad-memstore')

};
