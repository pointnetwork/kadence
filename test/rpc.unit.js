'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var AddressPortContact = require('../lib/contacts/address-port-contact');
var RPC = require('../lib/rpc');
var Message = require('../lib/message');
var inherits = require('util').inherits;

function FakeTransport(contact, options) {
  RPC.call(this, contact, options);
}

inherits(FakeTransport, RPC);

FakeTransport.prototype._createContact = function(options) {
  return new AddressPortContact(options);
};

describe('RPC', function() {

  describe('#_createContact', function() {

    it('should throw if not implemented', function() {
      expect(function() {
        var rpc = new RPC({}, {});
        rpc._createContact();
      }).to.throw(Error);
    });

    it('should use replyto if it exists', function() {
      var rpc = new FakeTransport({
        address: '0.0.0.0',
        port: 8080
      }, {
        replyto: {
          address: 'mydomain.tld',
          port: 80
        }
      });
      expect(rpc._contact.address).to.equal('mydomain.tld');
      expect(rpc._contact.port).to.equal(80);
    });

  });

  describe('#_close', function() {

    it('should throw if not implemented', function() {
      expect(function() {
        var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
        rpc._close();
      }).to.throw(Error);
    });

  });

  describe('#_send', function() {

    it('should throw if not implemented', function() {
      expect(function() {
        var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
        rpc._send();
      }).to.throw(Error);
    });

  });

  describe('#use', function() {

    it('should add the function to the middleware stack', function() {
      var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
      var middleware = function() {};
      rpc.use(middleware);
      expect(rpc._middleware[0]).to.equal(middleware);
    });

  });

  describe('#_initMiddlewareStack', function() {

    it('should return a copy of the stack bound to rpc', function() {
      var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
      var middleware = function() { return this; };
      rpc.use(middleware);
      var stack = rpc._initMiddlewareStack();
      expect(stack[0]()).to.equal(rpc);
    });

  });

  describe('#_handleMessage', function() {

    it('should emit an error if a middleware breaks', function(done) {
      var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
      var middleware = function(message, contact, next) {
        next(new Error('FAIL'));
      };
      rpc.use(middleware);
      var message = Message({
        method: 'PING',
        params: { contact: { address: '0.0.0.0', port: 8080 } },
        id: 'test'
      });
      rpc.on('error', function(err) {
        expect(err.message).to.equal('FAIL');
        done();
      });
      rpc._handleMessage(message.serialize());
    });

  });

  describe('#_execPendingCallback', function() {

    it('should should warn about dropped message', function(done) {
      var rpc = new FakeTransport({ address: '0.0.0.0', port: 8080 });
      var message = Message({
        result: { contact: { address: '0.0.0.0', port: 8080 } },
        id: 'test'
      });
      var _log = sinon.stub(rpc._log, 'warn', function() {
        _log.restore();
        done();
      });
      rpc._execPendingCallback(message);
    });

  });

});
