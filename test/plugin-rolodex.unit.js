'use strict';

const { expect } = require('chai');
const rolodex = require('../lib/plugin-rolodex');
const sinon = require('sinon');
const RoutingTable = require('../lib/routing-table');
const utils = require('../lib/utils');
const path = require('path');
const os = require('os');


describe('@module kadence/rolodex', function() {

  const id = Buffer.from(utils.getRandomKeyString(), 'hex');
  const node = {
    router: new RoutingTable(id),
    logger: {
      warn: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub()
    }
  };

  rolodex(path.join(os.tmpdir(), id.toString('hex')))(node);

  it('should store the contact in the db', function(done) {
    let nodeid = utils.getRandomKeyString();
    let contact = {
      hostname: 'localhost',
      port: 8080,
      protocol: 'http:'
    };
    node.router.addContactByNodeId(nodeid, contact);
    setTimeout(function() {
      node.getBootstrapCandidates().then(function(peers) {
        const peer = peers[0];
        expect(peer).to.equal(
          `http://localhost:8080/#${nodeid}`
        );
        done();
      }, done);
    }, 20);
  });

});
