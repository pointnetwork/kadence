'use strict';

const { expect } = require('chai');
const kad = require('kad');
const network = require('kad/test/fixtures/node-generator');
const hashcash = require('..');


kad.constants.T_RESPONSETIMEOUT = 4000;

describe('Kad HashCash E2E (w/ UDPTransport)', function() {

  let [node1, node2] = network(2, kad.UDPTransport);

  before(function(done) {
    [node1, node2].forEach((node) => {
      node.hashcash = node.plugin(hashcash());
      node.listen(node.contact.port);
    });
    setTimeout(done, 1000);
  });

  after(function() {
    process._getActiveHandles().forEach((h) => h.unref());
  })

  it('should stamp and verify proof of work', function(done) {
    this.timeout(8000);
    node1.ping([node2.identity.toString('hex'), node2.contact], (err) => {
      expect(err).to.equal(null);
      done();
    });
  });

});
