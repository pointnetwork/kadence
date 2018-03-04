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
    let nodeid1 = utils.getRandomKeyString();
    let contact1 = {
      hostname: 'localhost',
      port: 8080,
      protocol: 'http:'
    };
    let nodeid2 = utils.getRandomKeyString();
    let contact2 = {
      hostname: 'localhost',
      port: 8081,
      protocol: 'http:'
    };
    node.router.addContactByNodeId(nodeid1, contact1);
    setTimeout(function() {
      node.router.addContactByNodeId(nodeid2, contact2);
      setTimeout(function() {
        node.getBootstrapCandidates().then(function(peers) {
          expect(peers[0]).to.equal(`http://localhost:8081/#${nodeid2}`);
          expect(peers[1]).to.equal(`http://localhost:8080/#${nodeid1}`);
          done();
        }, done);
      }, 20);
    }, 20);
  });

});
