/**
 * @module kad/constants
 */

'use strict';

/**
 * @constant {number} ALPHA - Degree of parallelism
 */
exports.ALPHA = 3;

/**
 * @constant {number} B - Number of bits for nodeID creation
 */
exports.B = 160;

/**
 * @constant {number} K - Number of contacts held in a bucket
 */
exports.K = 20;

/**
 * @constant {number} T_REFRESH - Interval for performing router refresh
 */
exports.T_REFRESH = 3600000;

/**
 * @constant {number} T_REPLICATE - Interval for replicating local data
 */
exports.T_REPLICATE = 3600000;

/**
 * @constant {number} T_REPUBLISH - Interval for republishing data
 */
exports.T_REPUBLISH = 86400000;

/**
 * @constant {number} T_EXPIRE - Interval for expiring local data entries
 */
exports.T_EXPIRE = 86405000;

/**
 * @constant {number} T_RESPONSETIMEOUT - Time to wait for RPC response
 */
exports.T_RESPONSETIMEOUT = 10000;
