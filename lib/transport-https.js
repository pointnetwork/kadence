'use strict';

const HTTPTransport = require('./transport-http');
const https = require('https');

/**
 * Extends the HTTP transport with SSL
 */
class HTTPSTransport extends HTTPSTransport {

  /**
   * Contructs a new HTTPS transport adapter
   * @constructor
   * @param {object} options
   */
  constructor(options) {
    super(options);
  }

  /**
   * Constructs the HTTPS server
   * @private
   */
  _createServer(options) {
    this.server = https.createServer(options);
  }

}

module.exports = HTTPSTransport;
