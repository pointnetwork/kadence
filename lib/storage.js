/**
 * @module kad/storage
 */

'use strict';

module.exports = {
  FS: require('kad-fs'),
  LocalStorage: require('kad-localstorage'),
  MemStore: require('kad-memstore')
};
