/**
* @module kad/transports/udp
*/

'use strict';

var AddressPortContact = require('../contacts/address-port-contact');
var Message = require('../message');
var inherits = require('util').inherits;
var assert = require('assert');
var dgram = require('dgram');
var RPC = require('../rpc');
var msgpack = require('msgpack5')();

/**
* Represents an UDP transport for RPC
* @constructor
* @param {object} contact
* @param {object} options
*/
function UDPTransport(contact, options) {
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(contact, options);
  }

  assert(contact instanceof AddressPortContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
}

inherits(UDPTransport, RPC);

UDPTransport.MAX_MESSAGE_SIZE = 512; // bytes

/**
* Create a UDP socket
* #_open
* @param {function} done
*/
UDPTransport.prototype._open = function(done) {
  var self = this;

  function createSocket(address, port) {
    self._socket = dgram.createSocket(
      { type: 'udp4', reuseAddr: true },
      self._receive.bind(self)
    );

    self._socket.on('listening', done);

    self._socket.on('error', function(err) {
      self._log.error('rpc encountered an error: %s', err.message);

      if (err.code === 'EADDRNOTAVAIL') {
        self._log.warn('binding to all interfaces as a fallback');
        createSocket('0.0.0.0', port);
      }
    });

    self._socket.bind(port, address);
  }

  createSocket(self._contact.address, self._contact.port);
};

/**
* Send a RPC to the given contact (encode with msgpack before sending)
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
UDPTransport.prototype._send = function(data, contact) {
  var message = Message.fromBuffer(data);
  var buffer = msgpack.encode(message);

  if (buffer.length > UDPTransport.MAX_MESSAGE_SIZE) {
    this._log.warn(
      'outbound message greater than %sb (%sb) and risks fragmentation',
      UDPTransport.MAX_MESSAGE_SIZE,
      buffer.length
    );
  }

  this._socket.send(buffer, 0, buffer.length, contact.port, contact.address);
};

/**
* Decode messages with msgpack before receiving
* #_receive
* @param {buffer} data
* @param {Contact} contact
*/
UDPTransport.prototype._receive = function(buffer) {
  var json, message;

  try {
    // Peers should now be compressing message with msgpack
    json = msgpack.decode(buffer);
    assert(typeof json === 'object');
    message = Message(json).serialize();
  } catch(err) {
    // However, peers running older versions of Kad should still be supported
    this.receive(buffer);
  }

  this.receive(message);
};

/**
* Close the underlying socket
* #_close
*/
UDPTransport.prototype._close = function() {
  this._socket.close();
};

module.exports = UDPTransport;
