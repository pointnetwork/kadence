'use strict';

const { expect } = require('chai');
const { stub } = require('sinon');
const ErrorRules = require('../lib/rules-errors');


describe('@class ErrorRules', function() {

  const errors = new ErrorRules();

  describe('@method methodNotFound', function() {

    it('should call the next function if error', function(done) {
      let send = stub();
      errors.methodNotFound(new Error('Some error'), {}, { send }, () => {
        expect(send.called).to.equal(false);
        done();
      });
    });

    it('should call send with error params', function(done) {
      errors.methodNotFound(null, {}, {
        send: (data) => {
          expect(data.error.message).to.equal('Method not found');
          expect(data.error.code).to.equal(-32601);
          done();
        }
      });
    });

  });

  describe('@method internalError', function() {

    it('should call send with error params and next', function(done) {
      errors.internalError(new Error('Some error'), {}, {
        send: (data) => {
          expect(data.error.message).to.equal('Some error');
          expect(data.error.code).to.equal(-32603);
        }
      }, done);
    });

    it('should call use the given error code', function(done) {
      let err = new Error('Some error');
      err.code = 500;
      errors.internalError(err, {}, {
        send: (data) => {
          expect(data.error.message).to.equal('Some error');
          expect(data.error.code).to.equal(500);
        }
      }, done);
    });

  });

});
