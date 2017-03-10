'use strict';

const { expect } = require('chai');
const { Server, ClientRequest } = require('http');
const { Socket } = require('net');
const { stub } = require('sinon');
const HTTPTransport = require('../lib/transport-http');


describe('@class HTTPTransport', function() {

  describe('@private _createRequest', function() {

    it('should return a client request object', function() {
      let httpTransport = new HTTPTransport();
      expect(httpTransport._createRequest({
        hostname: 'localhost',
        port: 8080,
        createConnection: () => new Socket()
      })).to.be.instanceOf(ClientRequest);
    });

  });

  describe('@private _createServer', function() {

    it('should return a http server object', function() {
      let httpTransport = new HTTPTransport();
      expect(httpTransport._createServer()).to.be.instanceOf(Server);
    });

  });

  describe('@private _read', function() {



  });

  describe('@private _write', function() {



  });

  describe('@method listen', function() {

    it('should call Server#listen with args', function() {
      let httpTransport = new HTTPTransport();
      let listen = stub(httpTransport.server, 'listen');
      httpTransport.listen(8080, 'localhost');
      expect(listen.calledWithMatch(8080, 'localhost'));
    });

  });

});
