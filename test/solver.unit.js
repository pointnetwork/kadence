'use strict';

const { expect } = require('chai');
const Solver = require('../lib/solver');
const crypto = require('crypto');
const constants = require('../lib/constants');
const Solution = require('../lib/solution');

constants.SOLUTION_DIFFICULTY = 8;


describe('@class Solver', function() {

  it('should discover a solution', function(done) {
    this.timeout(60000);
    const privateKey = crypto.randomBytes(32);
    const solver = new Solver(privateKey);

    solver.once('data', data => {
      const { solution } = data;
      expect(solution).to.be.instanceOf(Solution);
      expect(solution.result[0]).to.equal(0);
      done();
    });
  });

});
