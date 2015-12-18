'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var utils = require('../lib/utils');
var constants = require('../lib/constants');
var Item = require('../lib/item');
var AddressPortContact = require('../lib/contacts/address-port-contact');
var KNode = require('../lib/node');
var Logger = require('../lib/logger');

function FakeStorage() {
  this.data = {};
}

FakeStorage.prototype.get = function(key, cb) {
  if (!this.data[key]) {
    return cb(new Error('not found'));
  }
  cb(null, this.data[key]);
};

FakeStorage.prototype.put = function(key, val, cb) {
  this.data[key] = val;
  cb(null, this.data[key]);
};

FakeStorage.prototype.del = function(key, cb) {
  delete this.data[key];
  cb(null);
};

FakeStorage.prototype.createReadStream = function() {

};

describe('Router', function() {

  describe('#findValue', function() {

    it('should callback with an error if no value is found', function(done) {
      var node = KNode({
        address: '0.0.0.0',
        port: 65528,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var _find = sinon.stub(node._router, 'lookup', function(k, t, cb) {
        cb(new Error(), 'NODE');
      });
      node._router.findValue('beep', function(err) {
        expect(err.message).to.equal('Failed to find value for key: beep');
        _find.restore();
        done();
      });
    });

  });

  describe('#_queryContact', function() {

    it('should remove the contact from the shortlist on error', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var router = node._router;
      var _rpc = sinon.stub(router._rpc, 'send', function(c, m, cb) {
        cb(new Error());
      });
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var state = router._createLookupState('VALUE', 'foo');
      state.shortlist.push(contact);
      router._queryContact(state, contact, function() {
        expect(state.shortlist).to.have.lengthOf(0);
        _rpc.restore();
        done();
      });
    });

  });

  describe('#_handleFindResult', function() {

    it('should track contact without value to store later', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var router = node._router;
      var _rpc = sinon.stub(router._rpc, 'send', function(c, m, cb) {
        cb(new Error());
      });
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var state = router._createLookupState('VALUE', 'foo');
      state.shortlist.push(contact);
      state.closestNodeDistance = '00000000000000000001';
      router._handleFindResult(state, {
        result: {
          nodes: []
        },
        id: utils.createID('test')
      }, contact, function() {
        expect(state.contactsWithoutValue).to.have.lengthOf(1);
        _rpc.restore();
        done();
      });
    });

    it('should remove contact from shortlist when JSON is bad', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var router = node._router;
      var _rpc = sinon.stub(router._rpc, 'send', function(c, m, cb) {
        cb(new Error());
      });
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var state = router._createLookupState('VALUE', 'foo');
      state.shortlist.push(contact);
      state.closestNodeDistance = '00000000000000000001';
      router._handleFindResult(state, {
        result: {
          value: 'BAD JSON',
          nodes: []
        },
        id: utils.createID('test')
      }, contact, function() {
        expect(state.contactsWithoutValue).to.have.lengthOf(0);
        _rpc.restore();
        done();
      });
    });

    it('should remove contact from shortlist when invalid', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0),
        validate: function(key, value, callback) {
          callback(false);
        }
      });
      var router = node._router;
      var _rpc = sinon.stub(router._rpc, 'send', function(c, m, cb) {
        cb(new Error());
      });
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var state = router._createLookupState('VALUE', 'foo');
      state.shortlist.push(contact);
      state.closestNodeDistance = '00000000000000000001';
      var itemKey = utils.createID('beep');
      var publisherKey = utils.createID('publisher');
      var item = new Item(itemKey, 'boop', publisherKey);
      router._handleFindResult(state, {
        result: {
          value: JSON.stringify(item),
          nodes: []
        }
      }, contact, function() {
        expect(state.shortlist).to.have.lengthOf(0);
        _rpc.restore();
        done();
      });
    });

    it('should send key/value pair to validator', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        validate: function(key, value) {
          expect(key).to.equal('foo');
          expect(value).to.equal('boop');
          done();
        },
        logger: new Logger(0)
      });
      var itemKey = utils.createID('foo');
      var publisherKey = utils.createID('publisher');
      var item = new Item(itemKey, 'boop', publisherKey);
      var state = node._router._createLookupState('VALUE', 'foo');
      var contact = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      state.shortlist.push(contact);
      state.closestNodeDistance = '00000000000000000001';
      node._router._handleFindResult(state, {
        result: {
          value: JSON.stringify(item),
          nodes: []
        },
        id: utils.createID('test')
      }, contact, expect.fail);
    });
  });

  describe('#_handleQueryResults', function() {

    it('should callback with the shortlist if it is full', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var state = node._router._createLookupState(
        'VALUE',
        utils.createID('foo')
      );
      state.shortlist = new Array(constants.K);
      node._router._handleQueryResults(state, function(err, type, contacts) {
        expect(contacts).to.equal(state.shortlist);
        done();
      });
    });

  });

  describe('#_handleValueReturned', function() {

    it('should store at closest node that did not have value', function(done) {
      var node = new KNode({
        address: '127.0.0.1',
        port: 0,
        storage: new FakeStorage(),
        logger: new Logger(0)
      });
      var _send = sinon.stub(node._router._rpc, 'send');
      var contact1 = new AddressPortContact({ address: '0.0.0.0', port: 1234 });
      var contact2 = new AddressPortContact({ address: '0.0.0.0', port: 1235 });
      var state = node._router._createLookupState(
        'NODE',
        utils.createID('foo')
      );
      state.contactsWithoutValue = [contact1, contact2];
      node._router._handleValueReturned(state, function() {
        expect(_send.callCount).to.equal(1);
        expect(_send.calledWith(contact1)).to.equal(true);
        done();
      });
    });

  });

});
