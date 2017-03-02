'use strict';

/**
 * Represent error handlers
 * @class
 */
class ErrorRules {

  /**
   * Constructs a error rules instance in the context of a
   * {@link AbstractNode}
   * @constructor
   * @param {AbstractNode} node
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * Assumes if no error object exists, then there is simply no method defined
   * @param {error|null} error
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  methodNotFound(err, request, response, next) {
    if (err) {
      return next();
    }

    response.send({
      error: { message: 'Method not found', code: -32601 }
    });
  }

  /**
   * Formats the errors response according to the error object given
   * @param {error|null} error
   * @param {object} request
   * @param {object} response
   * @param {function} next
   */
  internalError(err, request, response, next) {
    response.send({
      error: { message: err.message, code: err.code || -32603 }
    });

    next();
  }

}

module.exports = ErrorRules;
