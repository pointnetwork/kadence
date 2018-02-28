'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const uuid = require('uuid');
const kad = require('kad');
const BloomFilter = require('atbf');
const QuasarRules = require('../lib/rules-quasar');


describe('QuasarRules', function() {

  const identity = kad.utils.getRandomKeyBuffer();
  const router = new kad.RoutingTable(identity);

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

  describe('@method publish', function() {

    it('should callback error if already routed', function(done) {
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        cached: { get: sinon.stub().returns(true) }
      });
      let send = sinon.stub();
      rules.publish({
        params: {
          uuid: uuid.v4(),
          topic: 'test',
          ttl: 3,
          contents: {}
        }
      }, { send }, (err) => {
        expect(err.message).to.equal('Message previously routed');
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should callback error if ttl greater than max', function(done) {
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        cached: { get: sinon.stub().returns(false) }
      });
      let send = sinon.stub();
      rules.publish({
        params: {
          uuid: uuid.v4(),
          topic: 'test',
          ttl: 24,
          contents: {}
        }
      }, { send }, (err) => {
        expect(err.message).to.equal('Message includes invalid TTL');
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should callback error if ttl greater than max', function(done) {
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        cached: { get: sinon.stub().returns(false) }
      });
      let send = sinon.stub();
      rules.publish({
        params: {
          uuid: uuid.v4(),
          topic: 'test',
          ttl: -1,
          contents: {}
        }
      }, { send }, (err) => {
        expect(err.message).to.equal('Message includes invalid TTL');
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should add to pubs, cache id, exec handler, and relay', function(done) {
      let cachedSet = sinon.stub();
      let handler = sinon.stub();
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        groups: {
          get: sinon.stub().returns(handler)
        },
        isSubscribedTo: sinon.stub().returns(true),
        cached: {
          get: sinon.stub().returns(false),
          set: cachedSet
        }
      });
      let id = uuid.v4();
      let _relayPublication = sinon.stub(rules, '_relayPublication')
                                .callsArg(2);
      let msg = {
        uuid: id,
        topic: 'test',
        ttl: 3,
        contents: {},
        publishers: []
      };
      let send = (params) => {
        expect(Array.isArray(params)).to.equal(true);
        expect(params).to.have.lengthOf(0);
        expect(cachedSet.calledWithMatch(id)).to.equal(true);
        expect(msg.publishers.indexOf(identity.toString('hex'))).to.equal(0);
        expect(_relayPublication.callCount).to.equal(3);
        expect(handler.called).to.equal(true);
        done();
      };
      rules.publish({ params: msg }, { send });
    });

    it('should do nothing if not subscribed and ttl is 1', function(done) {
      let cachedSet = sinon.stub();
      let handler = sinon.stub();
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        groups: {
          get: sinon.stub().returns(handler)
        },
        isSubscribedTo: sinon.stub().returns(false),
        cached: {
          get: sinon.stub().returns(false),
          set: cachedSet
        }
      });
      let id = uuid.v4();
      let _relayPublication = sinon.stub(rules, '_relayPublication')
                                .callsArg(2);
      let msg = {
        uuid: id,
        topic: 'test',
        ttl: 1,
        contents: {},
        publishers: []
      };
      let send = (params) => {
        expect(Array.isArray(params)).to.equal(true);
        expect(params).to.have.lengthOf(0);
        expect(cachedSet.calledWithMatch(id)).to.equal(true);
        expect(_relayPublication.callCount).to.equal(0);
        done();
      };
      rules.publish({ params: msg }, { send });
    });

    it('should relay to neighbors if interested or random', function(done) {
      let cachedSet = sinon.stub();
      let handler = sinon.stub();
      let pullFilterFrom = sinon.stub().callsArgWith(1, null, []);
      let _getRandomContact = sinon.stub().returns([])
      let rules = new QuasarRules({
        node: {
          router,
          identity
        },
        pullFilterFrom: pullFilterFrom,
        _getRandomContact: _getRandomContact,
        groups: {
          get: sinon.stub().returns(handler)
        },
        isSubscribedTo: sinon.stub().returns(false),
        cached: {
          get: sinon.stub().returns(false),
          set: cachedSet
        }
      });
      let shouldRelayPublication = sinon.stub(
        QuasarRules,
        'shouldRelayPublication'
      ).returns(true);
      shouldRelayPublication.onCall(0).returns(false);
      let id = uuid.v4();
      let _relayPublication = sinon.stub(rules, '_relayPublication')
                                .callsArg(2);
      let msg = {
        uuid: id,
        topic: 'test',
        ttl: 3,
        contents: {},
        publishers: []
      };
      let send = (params) => {
        shouldRelayPublication.restore();
        expect(Array.isArray(params)).to.equal(true);
        expect(params).to.have.lengthOf(0);
        expect(cachedSet.calledWithMatch(id)).to.equal(true);
        expect(_relayPublication.callCount).to.equal(3);
        expect(_getRandomContact.callCount).to.equal(1);
        done();
      };
      rules.publish({ params: msg }, { send });
    });

  });

  describe('@method subscribe', function() {

    it('should respond with a hex array of our filter', function(done) {
      let filter = new BloomFilter({ filterDepth: 3, bitfieldSize: 160 });
      filter[0].add('beep');
      filter[1].add('boop');
      filter[2].add('buup');
      let rules = new QuasarRules({ filter });
      rules.subscribe({}, {
        send: (params) => {
          expect(params).to.have.lengthOf(3);
          let filter = BloomFilter.from(params);
          expect(filter[0].has('beep')).to.equal(true);
          expect(filter[1].has('boop')).to.equal(true);
          expect(filter[2].has('buup')).to.equal(true);
          done();
        }
      });
    });

  });

  describe('@method update', function() {

    it('should merge the remote filter with the local filter', function(done) {
      let local = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      let rules = new QuasarRules({ filter: local });
      let send = sinon.stub();
      rules.update({ params: { bad: 'data' } }, { send }, function(err) {
        expect(err.message).to.equal('Invalid bloom filters supplied');
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should callback error if failed to merge', function(done) {
      let local = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      let rules = new QuasarRules({ filter: local });
      let send = sinon.stub();
      rules.update({ params: ['bad', 'data?'] }, { send }, function(err) {
        expect(err.message).to.equal('Invalid hex string');
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should merge the remote filter with the local filter', function(done) {
      let local = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      let remote = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      remote[0].add('test');
      let rules = new QuasarRules({ filter: local });
      rules.update({ params: remote.toHexArray() }, {
        send: (params) => {
          expect(params).to.have.lengthOf(0);
          expect(local[1].has('test')).to.equal(true);
          done();
        }
      })
    });

  });

  describe('@static shouldRelayPublication', function() {

    it('should return false if not in filter', function() {
      let request = {
        params: {
          topic: 'test topic',
          publishers: [
            'publisher 1'
          ]
        }
      };
      let filters = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      expect(
        QuasarRules.shouldRelayPublication(request, filters)
      ).to.equal(false);
    });

    it('should return false if negative publisher info', function() {
      let request = {
        params: {
          topic: 'test topic',
          publishers: [
            'publisher 1'
          ]
        }
      };
      let filters = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      filters[1].add('test topic');
      filters[2].add('publisher 1');
      expect(
        QuasarRules.shouldRelayPublication(request, filters)
      ).to.equal(false);
    });

    it('should return true if in filter and no negative info', function() {
      let request = {
        params: {
          topic: 'test topic',
          publishers: [
            'publisher 1'
          ]
        }
      };
      let filters = new BloomFilter({ bitfieldSize: 160, filterDepth: 3 });
      filters[0].add('test topic');
      expect(
        QuasarRules.shouldRelayPublication(request, filters)
      ).to.equal(true);
    });

  });

  describe('@private _relayPublication', function() {

    it('should call node#send with correct args', function(done) {
      let send = sinon.stub().callsArg(3);
      let rules = new QuasarRules({
        node: { send }
      });
      let request = {
        method: 'PUBLISH',
        params: {
          topic: 'test topic',
          ttl: 3
        }
      };
      let contact = [
        kad.utils.getRandomKeyString(),
        { hostname: 'localhost', port: 8080 }
      ]
      rules._relayPublication(request, contact, () => {
        let args = send.args[0];
        expect(args[0]).to.equal('PUBLISH');
        expect(args[1].ttl).to.equal(2);
        expect(args[2]).to.equal(contact);
        done();
      });
    });

  });

});
