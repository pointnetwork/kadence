'use strict';

const merge = require('merge');
const { Duplex: DuplexStream } = require('stream');
const dgram = require('dgram');


/**
 * Implements a UDP transport adapter
 */
class UDPTransport extends DuplexStream {

  static get DEFAULTS() {
    return {
      type: 'udp4',
      reuseAddr: false
    };
  }

  /**
   * Constructs a datagram socket interface
   * @constructor
   * @param {object} [socketOpts] - Passed to dgram.createSocket(options)
   */
  constructor(options) {
    super({ objectMode: true });
    this.socket = dgram.createSocket(merge(UDPTransport.DEFAULTS, options))
      .on('error', (err) => this.emit('error', err));
  }

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, contact], encoding, callback) {
    this.socket.send(buffer, 0, buffer.length, contact.port, contact.address,
                     callback);
  }

  /**
   * Implements the readable interface
   * @private
   */
  read() {
    this.socket.once('message', (buffer) => {
      this.push(buffer);
    });
  }

  /**
   * Binds the socket to the [port] [, address] [, callback]
   * @param {number} [port=0]
   * @param {string} [address=0.0.0.0]
   * @param {function} [callback]
   */
  listen() {
    this.socket.bind(...arguments);
  }

}

module.exports = UDPTransport;
