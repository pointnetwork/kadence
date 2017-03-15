'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const utils = require('../lib/utils');
const KademliaNode = require('../lib/node-kademlia');
const FakeTransport = require('./fixtures/transport-fake');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup('test:node-kademlia', { db: memdown });
const bunyan = require('bunyan');
const constants = require('../lib/constants');


describe('@class KademliaNode', function() {

  let logger, transport, kademliaNode, clock;

  before(() => {
    clock = sinon.useFakeTimers(Date.now(), 'setInterval');
    logger = bunyan.createLogger({
      name: 'test:node-abstract:unit',
      level: 'fatal'
    });
    transport = new FakeTransport();
    kademliaNode = new KademliaNode({
      contact: { name: 'test:node-kademlia:unit' },
      storage,
      transport,
      logger
    });
  });

  describe('@private _updateContact', function() {

    it('should add the contact to the routing table', function() {
      let contact = { hostname: 'localhost', port: 8080 }
      kademliaNode._updateContact(
        'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128',
        contact
      );
      expect(kademliaNode.router.getContactByNodeId(
        'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128'
      )).to.equal(contact);
    });

    it('should replace the head contact if ping fails', function(done) {
      let bucketIndex = kademliaNode.router.indexOf(
        'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128'
      );
      let addContactByNodeId = sinon.stub(
        kademliaNode.router,
        'addContactByNodeId'
      );
      addContactByNodeId.onCall(0).returns(
        [bucketIndex, kademliaNode.router.get(bucketIndex), -1]
      );
      addContactByNodeId.onCall(1).returns(
        [bucketIndex, kademliaNode.router.get(bucketIndex), 0]
      );
      let ping = sinon.stub(kademliaNode, 'ping').callsArgWith(
        1,
        new Error('Timeout')
      );
      let removeContactByNodeId = sinon.stub(
        kademliaNode.router,
        'removeContactByNodeId'
      );
      kademliaNode._updateContact('ea48d3f07a5241291ed0b4cab6483fa8b8fcc128',
                                  { hostname: 'localhost', port: 8080 });
      setImmediate(() => {
        addContactByNodeId.restore();
        ping.restore();
        removeContactByNodeId.restore();
        expect(addContactByNodeId.callCount).to.equal(2);
        expect(removeContactByNodeId.callCount).to.equal(1);
        done();
      });
    });

    it('should do nothing if the head contact responds', function(done) {
      let bucketIndex = kademliaNode.router.indexOf(
        'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128'
      );
      let addContactByNodeId = sinon.stub(
        kademliaNode.router,
        'addContactByNodeId'
      );
      addContactByNodeId.onCall(0).returns(
        [bucketIndex, kademliaNode.router.get(bucketIndex), -1]
      );
      addContactByNodeId.onCall(1).returns(
        [bucketIndex, kademliaNode.router.get(bucketIndex), 0]
      );
      let ping = sinon.stub(kademliaNode, 'ping').callsArg(1);
      let removeContactByNodeId = sinon.stub(
        kademliaNode.router,
        'removeContactByNodeId'
      );
      kademliaNode._updateContact('ea48d3f07a5241291ed0b4cab6483fa8b8fcc128',
                                  { hostname: 'localhost', port: 8080 });
      setImmediate(() => {
        addContactByNodeId.restore();
        ping.restore();
        removeContactByNodeId.restore();
        expect(addContactByNodeId.callCount).to.equal(1);
        expect(removeContactByNodeId.callCount).to.equal(0);
        done();
      });
    });

  });

  describe('@method listen', function() {

    it('should use kad rules and setup refresh/replicate', function(done) {
      let use = sinon.stub(kademliaNode, 'use');
      let refresh = sinon.stub(kademliaNode, 'refresh');
      let replicate = sinon.stub(kademliaNode, 'replicate').callsArg(0);
      let expire = sinon.stub(kademliaNode, 'expire');
      let listen = sinon.stub(transport, 'listen');
      kademliaNode.listen();
      clock.tick(constants.T_REPLICATE);
      setImmediate(() => {
        use.restore();
        refresh.restore();
        replicate.restore();
        expire.restore();
        listen.restore();
        expect(use.calledWithMatch('PING')).to.equal(true);
        expect(use.calledWithMatch('STORE')).to.equal(true);
        expect(use.calledWithMatch('FIND_NODE')).to.equal(true);
        expect(use.calledWithMatch('FIND_VALUE')).to.equal(true);
        expect(refresh.calledWithMatch(0)).to.equal(true);
        expect(replicate.callCount).to.equal(1);
        expect(expire.callCount).to.equal(1);
        done();
      });
    });

  });

  describe('@method join', function() {

    it('should insert contact, lookup, and refresh buckets', function(done) {
      let addContactByNodeId = sinon.stub(
        kademliaNode.router,
        'addContactByNodeId'
      );
      let iterativeFindNode = sinon.stub(
        kademliaNode,
        'iterativeFindNode'
      ).callsArg(1);
      let getBucketsBeyondClosest = sinon.stub(
        kademliaNode.router,
        'getBucketsBeyondClosest'
      ).returns([]);
      let refresh = sinon.stub(kademliaNode, 'refresh').callsArg(1);
      kademliaNode.join(['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', {
        hostname: 'localhost',
        port: 8080
      }], (err) => {
        addContactByNodeId.restore();
        iterativeFindNode.restore();
        getBucketsBeyondClosest.restore();
        refresh.restore();
        expect(err).to.equal(undefined);
        expect(addContactByNodeId.calledWithMatch(
          'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128'
        )).to.equal(true);
        expect(iterativeFindNode.calledWithMatch(
          kademliaNode.identity
        )).to.equal(true);
        expect(refresh.callCount).to.equal(1);
        done();
      });
    });

    it('should insert contact, lookup, and refresh buckets', function(done) {
      let addContactByNodeId = sinon.stub(
        kademliaNode.router,
        'addContactByNodeId'
      );
      let iterativeFindNode = sinon.stub(
        kademliaNode,
        'iterativeFindNode'
      ).callsArgWith(1, new Error('Lookup failed'));
      let getBucketsBeyondClosest = sinon.stub(
        kademliaNode.router,
        'getBucketsBeyondClosest'
      ).returns([]);
      let refresh = sinon.stub(kademliaNode, 'refresh').callsArg(1);
      kademliaNode.join(['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', {
        hostname: 'localhost',
        port: 8080
      }], (err) => {
        addContactByNodeId.restore();
        iterativeFindNode.restore();
        getBucketsBeyondClosest.restore();
        refresh.restore();
        expect(err.message).to.equal('Lookup failed');
        expect(addContactByNodeId.calledWithMatch(
          'ea48d3f07a5241291ed0b4cab6483fa8b8fcc128'
        )).to.equal(true);
        expect(iterativeFindNode.calledWithMatch(
          kademliaNode.identity
        )).to.equal(true);
        expect(refresh.callCount).to.equal(0);
        done();
      });
    });

  });

  describe('@method ping', function() {

    it('should call send with PING message', function(done) {
      let send = sinon.stub(kademliaNode, 'send').callsArg(3);
      let contact = ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', {
        hostname: 'localhost',
        port: 8080
      }];
      kademliaNode.ping(contact, () => {
        send.restore();
        expect(send.calledWithMatch('PING', [], contact)).to.equal(true);
        done();
      });
    });

  });

  describe('@method iterativeStore', function() {

    it('should send store rpc to found contacts and keep copy', function(done) {
      let sandbox = sinon.sandbox.create();
      let contact = { hostname: 'localhost', port: 8080 };
      let iterativeFindNode = sandbox.stub(
        kademliaNode,
        'iterativeFindNode'
      ).callsArgWith(
        1,
        null,
        Array(20).fill(null).map(() => [utils.getRandomKeyString(), contact])
      );
      let send = sandbox.stub(kademliaNode, 'send').callsArgWith(3, null);
      send.onCall(4).callsArgWith(3, new Error('Failed to store'));
      let put = sandbox.stub(kademliaNode.storage, 'put').callsArg(2);
      kademliaNode.iterativeStore(
        utils.getRandomKeyString(),
        'some storage item data',
        (err, stored) => {
          sandbox.restore();
          expect(stored).to.equal(19);
          expect(send.callCount).to.equal(20);
          expect(put.callCount).to.equal(1);
          done();
        }
      );
    });

    it('should send the store rpc with the existing metadata', function(done) {
      let sandbox = sinon.sandbox.create();
      let contact = { hostname: 'localhost', port: 8080 };
      let iterativeFindNode = sandbox.stub(
        kademliaNode,
        'iterativeFindNode'
      ).callsArgWith(
        1,
        null,
        Array(20).fill(null).map(() => [utils.getRandomKeyString(), contact])
      );
      let send = sandbox.stub(kademliaNode, 'send').callsArgWith(3, null);
      send.onCall(4).callsArgWith(3, new Error('Failed to store'));
      let put = sandbox.stub(kademliaNode.storage, 'put').callsArg(2);
      kademliaNode.iterativeStore(
        utils.getRandomKeyString(),
        {
          value: 'some storage item data',
          publisher: 'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127',
          timestamp: Date.now()
        },
        (err, stored) => {
          sandbox.restore();
          expect(send.args[0][1][1].publisher).to.equal(
            'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127'
          );
          expect(stored).to.equal(19);
          expect(send.callCount).to.equal(20);
          expect(put.callCount).to.equal(1);
          done();
        }
      );
    });

  });

  describe('@method iterativeFindNode', function() {

    it('should send FIND_NODE to 3 close neighbors', function(done) {
      let contact = { hostname: 'localhost', port: 8080 };
      let getClosestContactsToKey = sinon.stub(
        kademliaNode.router,
        'getClosestContactsToKey'
      ).returns([
        ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc127', contact],
        ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc128', contact],
        ['ea48d3f07a5241291ed0b4cab6483fa8b8fcc129', contact]
      ]);
      let _updateContact = sinon.stub(kademliaNode, '_updateContact');
      let send = sinon.stub(kademliaNode, 'send');
      send.onCall(0).callsArgWith(
        3,
        null,
        Array(20).fill(null).map(() => [utils.getRandomKeyString(), contact])
      );
      send.onCall(1).callsArgWith(
        3,
        new Error('Lookup failed')
      );
      send.onCall(2).callsArgWith(
        3,
        null,
        Array(20).fill(null).map(() => [utils.getRandomKeyString(), contact])
      );
      kademliaNode.iterativeFindNode(
        'ea48d3f07a5241291ed0b4cab6483fa8b8fcc126',
        (err, results) => {
          getClosestContactsToKey.restore();
          _updateContact.restore();
          send.restore();
          expect(err).to.equal(null);
          expect(_updateContact.callCount).to.equal(40);
          expect(results).to.have.lengthOf(constants.K);
          results.forEach(([key, c]) => {
            expect(utils.keyStringIsValid(key)).to.equal(true);
            expect(contact).to.equal(c);
          });
          done();
        }
      );
    });

  });

  describe('@method iterativeFindValue', function() {



  });

  describe('@method replicate', function() {



  });

  describe('@method expire', function() {



  });

  describe('@method refresh', function() {



  });

});
