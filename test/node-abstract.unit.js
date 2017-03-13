'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const AbstractNode = require('../lib/node-abstract');
const FakeTransport = require('./fixtures/transport-fake');
const levelup = require('levelup');
const memdown = require('memdown');
const storage = levelup('test:node-abstract', { db: memdown });
const bunyan = require('bunyan');
const constants = require('../lib/constants');


describe('@class AbstractNode', function() {

  let logger, logwarn, transport, abstractNode, clock;

  before(() => {
    clock = sinon.useFakeTimers(Date.now(), 'setInterval');
    logger = bunyan.createLogger({
      name: 'test:node-abstract:unit',
      level: 'fatal'
    });
    logwarn = sinon.stub(logger, 'warn');
    transport = new FakeTransport();
    abstractNode = new AbstractNode({
      contact: { name: 'test:node-abstract:unit' },
      storage,
      transport,
      logger
    });
  });

  describe('@private _init', function() {

    it('should log warnings on messenger error', function(done) {
      abstractNode.rpc.emit('error', new Error('Messenger error'));
      setImmediate(() => {
        expect(logwarn.called).to.equal(true);
        logwarn.reset();
        done();
      });
    });

    it('should call _process on data from deserializer', function(done) {
      let _process = sinon.stub(abstractNode, '_process');
      let message = [];
      abstractNode.rpc.deserializer.emit('data', message);
      setImmediate(() => {
        _process.restore();
        expect(_process.called).to.equal(true);
        done();
      });
    });

    it('should log warnings on transport error', function(done) {
      abstractNode._transport.emit('error', new Error('Transport error'));
      setImmediate(() => {
        expect(logwarn.called).to.equal(true);
        logwarn.reset();
        done();
      });
    });

    it('should call the _timeout method on interval', function(done) {
      let _timeout = sinon.stub(abstractNode, '_timeout');
      setImmediate(() => {
        _timeout.restore();
        expect(_timeout.called).to.equal(true);
        done();
      }, constants.T_RESPONSETIMEOUT);
      clock.tick(constants.T_RESPONSETIMEOUT);
    });

  });

  describe('@private _process', function() {



  });

  describe('@private _timeout', function() {

    it('should call handlers of old requests and reap references', function() {
      let handler0 = sinon.stub();
      let handler1 = sinon.stub();
      let handler2 = sinon.stub();
      abstractNode._pending.set(0, {
        handler: handler0,
        timestamp: Date.now()
      });
      abstractNode._pending.set(1, {
        handler: handler1,
        timestamp: Date.now() - constants.T_RESPONSETIMEOUT - 200
      });
      abstractNode._pending.set(2, {
        handler: handler2,
        timestamp: 0
      });
      abstractNode._timeout();
      expect(handler0.called).to.equal(false);
      expect(handler1.called).to.equal(true);
      expect(handler1.args[0][0]).to.be.instanceOf(Error);
      expect(handler2.called).to.equal(true);
      expect(handler2.args[0][0]).to.be.instanceOf(Error);
      expect(abstractNode._pending.size).to.equal(1);
    });

  });

  describe('@private _updateContact', function() {

    it('should call RoutingTable#addContactByNodeId', function() {
      let _addContactByNodeId = sinon.stub(abstractNode.router,
                                           'addContactByNodeId');
      abstractNode._updateContact('node id', {});
      _addContactByNodeId.restore();
      expect(
        _addContactByNodeId.calledWithMatch('node id', {})
      ).to.equal(true);
    });

  });

  describe('@private _stack', function() {

    it('should call all functions in the stack with args', function(done) {
      let mw1 = sinon.stub().callsArg(2);
      let mw2 = sinon.stub().callsArg(2);
      let mw3 = sinon.stub().callsArg(2);
      let mw4 = sinon.stub().callsArg(2);
      let request = {};
      let response = {};
      abstractNode._testStack = {
        '*': [mw1, mw2, mw3, mw4]
      };
      abstractNode._stack('_testStack', '*', [request, response], () => {
        delete abstractNode._testStack;
        expect(mw1.calledWithMatch(request, response));
        expect(mw2.calledWithMatch(request, response));
        expect(mw3.calledWithMatch(request, response));
        expect(mw4.calledWithMatch(request, response));
        done();
      });
    });

    it('should fire callback if no stack exists', function(done) {
      abstractNode._stack('_middlewares', 'NOTAMETHOD', [{}, {}], done);
    });

  });

  describe('@private _middleware', function() {

    it('should call _stack with the correct arguments', function() {
      let _stack = sinon.stub(abstractNode, '_stack');
      let args = ['REQUEST', 'RESPONSE'];
      abstractNode._middleware(...args);
      _stack.restore();
      expect(
        _stack.calledWithMatch('_middleware', 'REQUEST', 'RESPONSE')
      ).to.equal(true);
    });

  });

  describe('@private _error', function() {

    it('should call _stack with the correct arguments', function() {
      let _stack = sinon.stub(abstractNode, '_stack');
      let args = ['REQUEST', 'RESPONSE'];
      abstractNode._error(...args);
      _stack.restore();
      expect(
        _stack.calledWithMatch('_errors', 'REQUEST', 'RESPONSE')
      ).to.equal(true);
    });

  });

  describe('@method send', function() {

    it('should write to serializer and queue handler', function() {
      let write = sinon.stub(abstractNode.rpc.serializer, 'write');
      let handler = sinon.stub();
      abstractNode.send('PING', [], {
        hostname: 'localhost',
        port: 8080
      }, handler);
      let [calledWith] = write.args[0];
      expect(calledWith[0].method).to.equal('PING');
      expect(calledWith[0].params).to.have.lengthOf(0);
      expect(typeof calledWith[0].id).to.equal('string');
      expect(calledWith[1][0]).to.equal(abstractNode.identity.toString('hex'));
      expect(calledWith[1][1].name).to.equal('test:node-abstract:unit');
      expect(calledWith[2].hostname).to.equal('localhost');
      expect(calledWith[2].port).to.equal(8080);
    });

  });

  describe('@method use', function() {

    it('should use the * method if none supplied', function() {
      abstractNode.use((req, res, next) => next());
      expect(abstractNode._middlewares['*']).to.have.lengthOf(1);
    });

    it('should place it in _errors if 4 args', function() {
      abstractNode.use((err, req, res, next) => next());
      expect(abstractNode._errors['*']).to.have.lengthOf(1);
    });

    it('should use a custom method stack', function() {
      abstractNode.use('TEST', (req, res, next) => next());
      expect(abstractNode._middlewares.TEST).to.have.lengthOf(1);
    });

  });

  describe('@method plugin', function() {

    it('should throw if not a function', function() {
      expect(function() {
        abstractNode.plugin({});
      }).to.throw(Error, 'Invalid plugin supplied');
    });

    it('should call the function with itself as the first arg', function(done) {
      abstractNode.plugin(function(node) {
        expect(node).to.equal(abstractNode);
        done();
      });
    });

  });

  describe('@method receive', function() {

    it('should pass the args through all middleware', function(done) {
      let _middleware = sinon.stub(abstractNode, '_middleware').callsArg(2);
      let _error = sinon.stub(abstractNode, '_error').callsArg(2);
      let args = [{ method: 'TEST' }, {}];
      abstractNode.receive(...args);
      setTimeout(() => {
        expect(_middleware.calledWithMatch('*', args)).to.equal(true);
        expect(_middleware.calledWithMatch('TEST', args)).to.equal(true);
        expect(
          _error.calledWithMatch('*', [null, ...args])
        ).to.equal(true);
        expect(
          _error.calledWithMatch('TEST', [null, ...args])
        ).to.equal(true);
        done();
      }, 50);
    });

  });

  describe('@method listen', function() {

    it('should add error middleware and init transport', function() {
      let _listen = sinon.stub(abstractNode._transport, 'listen');
      abstractNode._errors['*'] = [];
      abstractNode.listen(8080, 'localhost');
      _listen.restore();
      expect(_listen.calledWithMatch(8080, 'localhost')).to.equal(true);
      expect(abstractNode._errors['*']).to.have.lengthOf(2);
    });

  });

});
