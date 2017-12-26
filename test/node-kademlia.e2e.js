'use strict';

const { expect } = require('chai');
const kad = require('..');
const network = require('./fixtures/node-generator');
const async = require('async');
const TOTAL_NODES = 32;

function registerEndToEndSuite(transportName, transportAdapter) {

  describe(`Kad E2E (w/ ${transportName})`, function() {
    this.timeout(20000);

    let nodes, seed, pairs;

    before(function(done) {
      nodes = network(TOTAL_NODES, transportAdapter);
      async.each(nodes, (node, done) => {
        node.listen(node.contact.port, node.contact.hostname, done);
      }, function() {
        seed = nodes.shift();
        nodes.forEach((node) => {
          seed.router.addContactByNodeId(
            node.identity.toString('hex'),
            node.contact
          );
        });
        pairs = nodes.map(() => {
          return [
            kad.utils.getRandomKeyString(),
            kad.utils.getRandomKeyString()
          ];
        });
        done();
      });
    });

    after(function() {
      nodes.forEach((node) => {
        switch (transportName) {
          case 'UDPTransport':
            node.transport.socket.close();
            break;
          case 'HTTPTransport':
            node.transport.server.close();
            break;
          default:
        }
      });
    });

    describe('@method join', function() {

      this.timeout(400000);

      it('all nodes should succeed in joining the network', function(done) {
        async.eachLimit(nodes, 3, function(node, next) {
          node.join([
            seed.identity.toString('hex'),
            seed.contact
          ], next);
        }, function(err) {
          expect(err).to.equal(null);
          nodes.forEach((node) => {
            expect(node.router.size > TOTAL_NODES / 2).to.equal(true);
          });
          done();
        });
      });

    });

    describe('@method iterativeFindNode', function() {

      it('all nodes should be able to find K contacts', function(done) {
        async.eachLimit(nodes, 3, function(node, next) {
          node.iterativeFindNode(
            node.identity.toString('hex'),
            function(err, result) {
              expect(err).to.equal(null);
              expect(result).to.have.lengthOf(kad.constants.K);
              next();
            }
          );
        }, done);
      });

      it('all nodes should find the closest node to a key', function(done) {
        let key = kad.utils.getRandomKeyString();
        let closest = nodes.map( node => {
          return {
            identity: node.identity,
            distance: kad.utils.getDistance(node.identity, key)
          };
        }).sort( (a, b) => {
          return kad.utils.compareKeyBuffers(
            Buffer.from(a.distance, 'hex'),
            Buffer.from(b.distance, 'hex')
          );
        })[0].identity.toString('hex')

        async.eachLimit(nodes, 3, function(node, next) {
          node.iterativeFindNode(
            key,
            function(err, result) {
              expect(err).to.equal(null);
              expect(result[0][0]).to.equal(closest);
              next();
            }
          );
        }, done);
      });

    });

    describe('@method iterativeStore', function() {

      it('all nodes should be able to store key-values', function(done) {
        async.eachOfLimit(nodes, 3, function(node, index, next) {
          let [key, value] = pairs[index];
          node.iterativeStore(key, value, function(err, totalStored) {
            expect(totalStored).to.equal(20);
            next();
          });
        }, done);
      });

    });

    describe('@method iterativeFindValue', function() {

      it('all nodes should be able to retrieve key-values', function(done) {
        async.eachOfLimit(nodes, 3, function(node, index, next) {
          let [key, value] = pairs[index];
          node.iterativeFindValue(key, function(err, result) {
            expect(value).to.equal(result.value);
            next();
          });
        }, (err) => {
          // Use a timeout here because if we close the sockets early,
          // responses from STORE operations will fail
          setTimeout(done.bind(this, err), 3000);
        });
      });

    });

    describe('@method expire / @method replicate', function() {

      before(function(done) {
        async.eachLimit(nodes, 3, function(node, next) {
          node.replicate(() => node.expire(() => next()));
        }, done);
      });

      it('all nodes should be able to retrieve after expire', function(done) {
        async.eachOfLimit(nodes, 3, function(node, index, next) {
          let [key, value] = pairs[index];
          node.iterativeFindValue(key, function(err, result) {
            expect(value).to.equal(result.value);
            next();
          });
        }, (err) => {
          // Use a timeout here because if we close the sockets early,
          // responses from STORE operations will fail
          setTimeout(done.bind(this, err), 3000);
        });
      });

    });

  });

}

registerEndToEndSuite('UDPTransport', kad.UDPTransport);
registerEndToEndSuite('HTTPTransport', kad.HTTPTransport);
