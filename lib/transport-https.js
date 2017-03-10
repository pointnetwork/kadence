'use strict';

const HTTPTransport = require('./transport-http');
const https = require('https');
const merge = require('merge');

/**
 * Extends the HTTP transport with SSL
 */
class HTTPSTransport extends HTTPTransport {

  static get DEFAULTS() {
    return {};
  }

  /**
   * Contructs a new HTTPS transport adapter
   * @constructor
   * @param {object} options
   */
  constructor(options) {
    super(merge({}, HTTPSTransport.DEFAULTS, options));
  }

  /**
   * Constructs the HTTPS server
   * @private
   */
  _createServer() {
    return https.createServer(...arguments);
  }

  /**
   * Constructs the HTTPS request
   * @private
   */
  _createRequest() {
    return https.request(...arguments);
  }

}

module.exports = HTTPSTransport;
