/**
 * @module kad/constants
 */

'use strict';

module.exports = {
  /**
   * @constant {number} ALPHA - Degree of parallelism
   */
  ALPHA: 3,
  /**
   * @constant {number} B - Number of bits for nodeID creation
   */
  B: 160,
  /**
   * @constant {number} K - Number of contacts held in a bucket
   */
  K: 20,
  /**
   * @constant {number} T_REFRESH - Interval for performing router refresh
   */
  T_REFRESH: 3600000,
  /**
   * @constant {number} T_REPLICATE - Interval for replicating local data
   */
  T_REPLICATE: 3600000,
  /**
   * @constant {number} T_REPUBLISH - Interval for republishing data
   */
  T_REPUBLISH: 86400000,
  /**
   * @constant {number} T_EXPIRE - Interval for expiring local data entries
   */
  T_EXPIRE: 86405000,
  /**
   * @constant {number} T_RESPONSETIMEOUT - Time to wait for RPC response
   */
  T_RESPONSETIMEOUT: 10000
};
