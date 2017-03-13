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
    return {};
  }

  /**
   * Contructs a HTTP transport adapter
   * @constructor
   * @param {object} [options]
   */
  constructor(options) {
    super({ objectMode: true });

    this._options = merge({}, HTTPTransport.DEFAULTS, options);
    this._pending = new Map();
    this.server = this._createServer(this._options);

    this.server.on('error', (err) => this.emit('error', err));
    setInterval(() => this._timeoutPending(), constants.T_RESPONSETIMEOUT);
  }

  /**
   * Creates the HTTP server object
   * @private
   */
  _createServer() {
    return http.createServer();
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
      req.on('error', (err) => this.emit('error', err));
      res.on('error', (err) => this.emit('error', err));

      if (!req.headers['x-kad-message-id']) {
        res.statusCode = 400;
        return res.end();
      }

      res.setHeader('X-Kad-Message-ID', req.headers['x-kad-message-id']);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      if (!['POST', 'OPTIONS'].includes(req.method)) {
        res.statusCode = 405;
      }

      if (req.method !== 'POST') {
        return res.end();
      }

      req.pipe(concat((buffer) => {
        this._pending.set(req.headers['x-kad-message-id'], {
          timestamp: Date.now(),
          response: res
        });
        this.push(buffer);
      }));
    });
  }

  /**
   * Every T_RESPONSETIMEOUT, we destroy any open sockets that are still
   * waiting
   * @private
   */
  _timeoutPending() {
    const now = Date.now();

    this._pending.forEach(({ timestamp, response }, id) => {
      let timeout = timestamp + constants.T_RESPONSETIMEOUT;

      if (now >= timeout) {
        response.statusCode = 504;
        response.end();
        this._pending.delete(id);
      }
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
    });

    request.on('error', (err) => this.emit('error', err));
    callback();
  }

  /**
   * Binds the server to the given address/port
   */
  listen() {
    this.server.listen(...arguments);
  }

}

module.exports = HTTPTransport;
