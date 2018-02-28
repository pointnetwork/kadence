'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const kad = require('kad');
const constants = require('../lib/constants');
const BloomFilter = require('atbf');
const QuasarPlugin = require('../lib/plugin-quasar');


describe('QuasarPlugin', function() {

  const logger = {
    warn: sinon.stub(),
    info: sinon.stub(),
    debug: sinon.stub(),
    error: sinon.stub()
  };
  const identity = kad.utils.getRandomKeyBuffer();
  const router = new kad.RoutingTable(identity);
  const use = sinon.stub();

  before(function() {
    let numContacts = 32;

    while (numContacts > 0) {
      router.addContactByNodeId(kad.utils.getRandomKeyString(), {
        hostname: 'localhost',
        port: 8080
      });
      numContacts--;
    }
  });

  describe('@constructor', function() {

    it('should add middleware, self to filter, decorate node', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(use.callCount).to.equal(3);
      expect(
        use.calledWithMatch(QuasarPlugin.PUBLISH_METHOD)
      ).to.equal(true);
      expect(
        use.calledWithMatch(QuasarPlugin.SUBSCRIBE_METHOD)
      ).to.equal(true);
      expect(use.calledWithMatch(QuasarPlugin.UPDATE_METHOD)).to.equal(true);
      expect(plugin.filter[0].has(identity.toString('hex'))).to.equal(true);
      use.reset();
    });

  });

  describe('@property neighbors', function() {

    it('should return ALPHA contact objects', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(plugin.neighbors).to.have.lengthOf(kad.constants.ALPHA);
    });

  });

  describe('@method quasarPublish', function() {

    it('should node#send to each neighbor', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.node.send = sinon.stub().callsArg(3);
      plugin.quasarPublish('topic string', {
        some: 'data'
      }, () => {
        expect(plugin.node.send.callCount).to.equal(3);
        expect(
          plugin.node.send.calledWithMatch(QuasarPlugin.PUBLISH_METHOD)
        ).to.equal(true);
        let content = plugin.node.send.args[0][1];
        expect(typeof content.uuid).to.equal('string');
        expect(content.topic).to.equal('topic string');
        expect(content.contents.some).to.equal('data');
        expect(content.ttl).to.equal(constants.MAX_RELAY_HOPS);
        expect(content.publishers.indexOf(
          identity.toString('hex')
        )).to.equal(0);
        done();
      });
    });

    it('should use the routing key if supplied', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let getClosestContactsToKey = sinon.spy(
        router,
        'getClosestContactsToKey'
      );
      let routingKey = kad.utils.getRandomKeyString();
      plugin.node.send = sinon.stub().callsArg(3);
      plugin.quasarPublish('topic string', {
        some: 'data'
      }, { routingKey }, () => {
        expect(getClosestContactsToKey.calledWithMatch(
          routingKey
        )).to.equal(true);
        done();
      });
    });

  });

  describe('@method quasarSubscribe', function() {

    it('should add a topic subscription + refresh filters', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let pullFilters = sinon.stub(plugin, 'pullFilters').callsArg(0);
      let pushFilters = sinon.stub(plugin, 'pushFilters');
      plugin.quasarSubscribe('single topic', true);
      setImmediate(() => {
        expect(plugin.filter[0].has('single topic')).to.equal(true);
        expect(plugin.groups.has('single topic')).to.equal(true);
        expect(pushFilters.called).to.equal(true);
        expect(pullFilters.called).to.equal(true);
        done();
      });
    });

    it('should add a topic subscription + refresh filters', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let pullFilters = sinon.stub(plugin, 'pullFilters').callsArg(0);
      let pushFilters = sinon.stub(plugin, 'pushFilters');
      plugin.quasarSubscribe(['multi topic 1', 'multi topic 2'], true);
      setImmediate(() => {
        expect(plugin.filter[0].has('multi topic 1')).to.equal(true);
        expect(plugin.filter[0].has('multi topic 2')).to.equal(true);
        expect(plugin.groups.has('multi topic 1')).to.equal(true);
        expect(plugin.groups.has('multi topic 2')).to.equal(true);
        expect(pushFilters.called).to.equal(true);
        expect(pullFilters.called).to.equal(true);
        done();
      });
    });

  });

  describe('@method pullFilters', function() {

    it('should callback early if updated within an hour', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let pullFilterFrom = sinon.stub(plugin, 'pullFilterFrom').callsArg(1);
      plugin._lastUpdate = Date.now();
      plugin.pullFilters(() => {
        expect(pullFilterFrom.callCount).to.equal(0);
        done();
      });
    });

    it('should bubble errors from pulling the filter', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use, logger });
      sinon.stub(plugin, 'pullFilterFrom').callsArgWith(
        1,
        new Error('Request timed out')
      );
      plugin.pullFilters((err) => {
        expect(logger.warn.called).to.equal(true);
        logger.warn.reset();
        expect(err.message).to.equal('Request timed out');
        done();
      });
    });

    it('should merge all the filters with local', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let remote1 = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      let remote2 = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      let remote3 = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      remote1[0].add('remote 1');
      remote2[0].add('remote 2');
      remote3[0].add('remote 3');
      let pullFilterFrom = sinon.stub(plugin, 'pullFilterFrom');
      pullFilterFrom.onCall(0).callsArgWith(1, null, remote1);
      pullFilterFrom.onCall(1).callsArgWith(1, null, remote2);
      pullFilterFrom.onCall(2).callsArgWith(1, null, remote3);
      plugin.pullFilters(() => {
        expect(pullFilterFrom.callCount).to.equal(3);
        expect(plugin.hasNeighborSubscribedTo('remote 1')).to.equal(true);
        expect(plugin.hasNeighborSubscribedTo('remote 2')).to.equal(true);
        expect(plugin.hasNeighborSubscribedTo('remote 3')).to.equal(true);
        done();
      });
    });

  });

  describe('@method pullFilterFrom', function() {

    it('should node#send with args and callback with atbf', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let remote = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      remote[0].add('some topic');
      plugin.node.send = function(method, params, contact, callback) {
        expect(method).to.equal(QuasarPlugin.SUBSCRIBE_METHOD);
        expect(params).to.have.lengthOf(0);
        callback(null, remote.toHexArray());
      };
      plugin.pullFilterFrom([], (err, filter) => {
        expect(filter[0].has('some topic')).to.equal(true);
        done();
      });
    });

    it('should callback if transport error', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let remote = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      remote[0].add('some topic');
      plugin.node.send = function(method, params, contact, callback) {
        callback(new Error('Timeout'));
      };
      plugin.pullFilterFrom([], (err) => {
        expect(err.message).to.equal('Timeout');
        done();
      });
    });

    it('should callback if bad result', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let remote = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      remote[0].add('some topic');
      plugin.node.send = function(method, params, contact, callback) {
        callback(null, ['some', 'bad', 'data?']);
      };
      plugin.pullFilterFrom([], (err) => {
        expect(err.message).to.equal('Invalid hex string');
        done();
      });
    });

  });

  describe('@method pushFilters', function() {

    it('should push filters to each neighbor', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      let pushFilterTo = sinon.stub(plugin, 'pushFilterTo').callsArg(1);
      plugin.pushFilters(() => {
        expect(pushFilterTo.callCount).to.equal(3);
        done();
      });
    });

    it('should callback early if we updated within an hour', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin._lastUpdate = Date.now();
      let pushFilterTo = sinon.stub(plugin, 'pushFilterTo').callsArg(1);
      plugin.pushFilters(() => {
        expect(pushFilterTo.callCount).to.equal(0);
        done();
      });
    });

  });

  describe('@method pushFilterTo', function() {

    it('should call node#send with correct args', function(done) {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.node.send = function(method, params, contact, callback) {
        expect(method).to.equal(QuasarPlugin.UPDATE_METHOD);
        expect(params).to.have.lengthOf(constants.FILTER_DEPTH);
        callback();
      };
      plugin.pushFilterTo([], done);
    });

  });

  describe('@method isSubscribedTo', function() {

    it('should return true if subscribed and handling', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[0].add('local topic');
      plugin.groups.set('local topic', true);
      expect(plugin.isSubscribedTo('local topic')).to.equal(true);
    });

    it('should return false if not subscribed and handling', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      expect(plugin.isSubscribedTo('local topic')).to.equal(false);
    });

  });

  describe('@hasNeighborSubscribedTo', function() {

    it('should return true if a neighbor is subscribed', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[2].add('neighbor topic');
      expect(plugin.hasNeighborSubscribedTo('neighbor topic')).to.equal(true);
    });

    it('should return false if a neighbor is not subscribed', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      plugin.filter[2].add('neighbor topic');
      expect(plugin.hasNeighborSubscribedTo('wrong topic')).to.equal(false);
    });

  });

  describe('@private _getRandomContact', function() {

    it('should return a random contact', function() {
      let plugin = new QuasarPlugin({ identity, router, use });
      let firstResult = plugin._getRandomContact();
      expect(firstResult[0]).to.not.equal(plugin._getRandomContact()[0]);
    });

  });

});
