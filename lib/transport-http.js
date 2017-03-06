'use strict';

const http = require('http');
const { Duplex: DuplexStream } = require('stream');
const merge = require('merge');
const concat = require('concat-stream');

/**
 * Represents a transport adapter over HTTP
 */
class HTTPTransport extends DuplexStream {

  static get DEFAULTS() {
    return {};
  }

  /**
   * Contructs a HTTP transport adapter
   * @constructor
   * @param {object} [options]
   */
  constructor(options) {
    super({ objectMode: true });
    this._pending = new Map();
    this.server = this._createServer(merge(HTTPTransport.DEFAULTS, options));
  }

  /**
   * Creates the HTTP server object
   * @private
   */
  _createServer() {
    return http.createServer(...arguments);
  }

  /**
   * Returns a HTTP request object
   * @private
   */
  _createRequest() {
    return http.request(...arguments);
  }

  /**
   * Implements the readable interface
   * @private
   */
  _read() {
    this.server.once('request', (req, res) => {
      req.pipe(concat((buffer) => {
        let parsed = null;
        let timestamp = Date.now();

        try {
          parsed = JSON.parse(buffer.toString('utf8'));
        } catch (err) {
          return this.emit('error', err);
        }

        this._pending.set(parsed.id, { timestamp, response: res });
        this.push(buffer);
      }));
    });
  }

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, contact], encoding, callback) {
    // NB: If responding to a received request...
    if (this._pending.has(id)) {
      this._pending.get(id).response.end(buffer);
      this._pending.delete(id);
      return callback(null);
    }

    // NB: If originating an outbound request...
    const request = this._createRequest({
      hostname: contact.hostname,
      port: contact.port,
      protocol: contact.protocol,
      method: 'POST'
    });

    request.on('response', (response) => {
      response
        .on('error', (err) => this.emit('error', err))
        .pipe(concat((buffer) => this.push(buffer)));
    }).on('error', (err) => this.emit('error', err));
  }

}

module.exports = HTTPTransport;
