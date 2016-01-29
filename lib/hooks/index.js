/**
 * @module kad/hooks
 */

'use strict';

module.exports = {
  /** {@link BlacklistFactory} */
  blacklist: require('./blacklist'),
  /** {@link WhitelistFactory} */
  whitelist: require('./whitelist'),
  /** {@link ProtocolFactory} */
  protocol: require('./protocol')
};
