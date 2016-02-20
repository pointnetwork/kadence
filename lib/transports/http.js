'use strict';

var AddressPortContact = require('../contacts/address-port-contact');
var Message = require('../message');
var assert = require('assert');
var inherits = require('util').inherits;
var http = require('http');
var RPC = require('../rpc');

/**
 * Represents an HTTP transport for RPC
 * @constructor
 * @extends {RPC}
 * @param {AddressPortContact} contact - Your node's contact instance
 * @param {Object} options
 */
function HTTPTransport(contact, options) {
  if (!(this instanceof HTTPTransport)) {
    return new HTTPTransport(contact, options);
  }

  this._queuedResponses = {};
  this._cors = options && !!options.cors;

  assert(contact instanceof AddressPortContact, 'Invalid contact supplied');
  RPC.call(this, contact, options);
}

inherits(HTTPTransport, RPC);

/**
 * Create a HTTP server
 * @private
 * @param {Function} done
 */
HTTPTransport.prototype._open = function(done) {
  var self = this;

  this._server = http.createServer(function(req, res) {
    var payload = '';
    var message = null;

    if (self._cors) {
      self._addCrossOriginHeaders(req, res);
    }

    if (req.method === 'OPTIONS') {
      return res.end();
    }

    req.on('data', function(chunk) {
      payload += chunk.toString();
    });

    req.on('end', function() {
      var buffer = new Buffer(payload);

      try {
        message = Message.fromBuffer(buffer);
      } catch(err) {
        return self.receive(null);
      }

      if (Message.isRequest(message)) {
        self._queuedResponses[message.id] = res;
      }

      self.receive(buffer, {});
    });
  });

  this._server.listen(this._contact.port, this._contact.address, done);
};

/**
 * Send a RPC to the given contact
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
HTTPTransport.prototype._send = function(data, contact) {
  var self = this;
  var parsed = JSON.parse(data.toString());

  function handleResponse(res) {
    var payload = '';

    res.on('data', function(chunk) {
      payload += chunk.toString();
    });

    res.on('end', function() {
      self.receive(new Buffer(payload), {});
    });
  }

  if (this._queuedResponses[parsed.id]) {
    this._queuedResponses[parsed.id].end(data);
    delete this._queuedResponses[parsed.id];
    return;
  }

  var req = http.request({
    hostname: contact.address,
    port: contact.port,
    method: 'POST'
  }, handleResponse);

  req.on('error', function() {
    self.receive(null);
  });

  req.end(data);
};

/**
 * Close the underlying socket
 * @private
 */
HTTPTransport.prototype._close = function() {
  this._server.close();
};

/**
 * Adds CORS headers to the given response object
 * @private
 * @param {http.IncomingMessage} res
 */
HTTPTransport.prototype._addCrossOriginHeaders = function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};

module.exports = HTTPTransport;
