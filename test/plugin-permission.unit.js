'use strict';

const { expect } = require('chai');
const permission = require('../lib/plugin-permission');
const crypto = require('crypto');
const constants = require('../lib/constants');

constants.SOLUTION_DIFFICULTY = 8;


describe('@module kadence/permission', function() {

  describe('@class PermissionSolver', function() {

    it('should discover a solution', function(done) {
      this.timeout(60000);
      const privateKey = crypto.randomBytes(32);
      const solver = new permission.PermissionSolver(privateKey);

      solver.once('data', data => {
        const { solution } = data;
        expect(solution).to.be.instanceOf(permission.PermissionSolution);
        expect(solution.result[0]).to.equal(0);
        done();
      });
    });

  });

});
