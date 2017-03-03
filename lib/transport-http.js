'use strict';

const http = require('http');
const { Duplex: DuplexStream } = require('stream');
const merge = require('merge');
const concat = require('concat-stream');
const constants = require('./constants');

/**
 * Represents a transport adapter over HTTP
 */
class HTTPTransport extends DuplexStream {

  static get DEFAULTS() {
    return {

    };
  }

  /**
   * Contructs a HTTP transport adapter
   * @constructor
   * @param {object} [options]
   */
  constructor(options) {
    super({ objectMode: true });
    this._pending = new Map();
    this._createServer(merge(HTTPTransport.DEFAULTS, options));
  }

  /**
   * Creates the HTTP server object
   * @private
   */
  _createServer() {
    this.server = http.createServer();
  }

  /**
   * Implements the readable interface
   * @private
   */
  _read() {
    this.server.once('request', (req, res) => {
      const self = this;
      const messageBuffer = concat(handleBufferedMessage);

      function handleBufferedMessage(buffer) {
        let parsed = null;

        try {
          parsed = JSON.parse(buffer.toString('utf8'));
        } catch (err) {
          return self.emit('error', err);
        }

        self._pending.set(parsed.id, { timestamp, response: res });
        self.push([buffer, self._getContactFromRequest(req)]);
      }

      req.pipe(messageBuffer);
    });
  }

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, contact], encoding, callback) {
    if (this._pending.has(id)) {
      this._pending.get(id).response.end(buffer);
      this._pending.delete(id);
      return callback(null);
    }

    // TODO: construct new HTTP request
  }

  /**
   * Extracts a contact object from an incoming request object
   * @private
   */
  _getContactFromRequest(req) {
    return {
      protocol: req.headers['x-kad-protocol'],
      address: req.headers['x-kad-address'],
      port: parseInt(req.headers['x-kad-port']),
      identity: req.headers['x-kad-identity']
    };
  }

  /**
   * Add the contact information and identity headers to an outbound request
   * @private
   */
  _setContactForRequest(req) {
    // TODO
  }

}

module.exports = HTTPTransport;
