'use strict';

const async = require('async');
const assert = require('assert');
const bunyan = require('bunyan');
const merge = require('merge');
const utils = require('./utils');
const { EventEmitter } = require('events');
const RoutingTable = require('./routing-table');
const MessageProcessor = require('./messenger-jsonrpc');


/**
 * Represents a network node
 */
class AbstractNode extends EventEmitter {

  /**
   * Join event is triggered when the routing table is no longer empty
   * @event AbstractNode#join
   */

  /**
   * Error event fires when a critical failure has occurred; if no handler is
   * specified, then it will throw
   * @event AbstractNode#error
   * @type {Error}
   */

  static get DEFAULTS() {
    return {
      logger: bunyan.createLogger({ name: 'kadtools' }),
      identity: utils.getRandomKeyBuffer(),
      transport: null,
      storage: null,
      messenger: new MessageProcessor()
    };
  }

  static validate(options) {
    utils.validateStorageAdapter(options.storage);
    utils.validateLogger(options.logger);
    utils.validateTransport(options.transport);
    assert.ok(utils.keyBufferIsValid(options.identity), 'Invalid identity');
  }

  /**
   * Contructs the primary interface for a kad node
   * @constructor
   * @param {object} options
   * @param {object} options.transport - {@tutorial transport-adapters}
   * @param {buffer} options.identity - {@tutorial identities}
   * @param {object} options.storage - {@tutorial storage-adapters}
   * @param {object} options.logger - {@tutorial logging}
   * @param {object} [options.messenger] - {@tutorial messengers}
   */
  constructor(options) {
    AbstractNode.validate(options = merge(AbstractNode.DEFAULTS, options));
    super();

    this._middleware = { '*': [] };
    this._errors = { '*': [] };
    this._transport = options.transport;
    this._messenger = options.messenger;

    this.rpc = this._messenger.pipe(this._transport).pipe(this._messenger);
    this.storage = options.storage;
    this.identity = options.identity;
    this.router = new RoutingTable(this.identity);
    this.logger = options.logger;

    this._messenger.on('error', (err) => this.logger.warn(err.message));
  }

  /**
   * Accepts an arbitrary function that receives this node as context
   * for mounting protocol handlers and extending the node with other
   * methods
   * @param {function} plugin - {@tutorial plugins}
   */
  plugin(func) {
    assert(typeof func === 'function', 'Invalid plugin supplied');
    func(this);
  }

  /**
   * Mounts a message handler route for processing incoming RPC messages
   * @param {string} [method] - RPC method name to route through
   * @param {AbstractNode~middleware} middleware
   */
  use(method, middleware) {
    if (typeof method === 'function') {
      middleware = method;
      method = '*';
    }

    // NB: If middleware function takes 4 arguments, it is an error handler
    const type = middleware.length === 4 ? '_errors' : '_middleware';
    const stack = this[type][method] = this[type][method] || [];

    stack.push(middleware);
  }
  /**
   * @callback AbstractNode~middleware
   * @param {error} [error] - Error object resulting from a middleware
   * @param {?} request - The incoming message object
   * @param {?} response - The outgoing response object
   * @param {function} next - Call to proceed to next middleware
   */

  /**
   * Passes through the transport#listen
   */
  listen() {
    this._transport.listen(...arguments);
  }

  /**
   * Processes a the given arguments by sending them through the appropriate
   * middleware stack
   * @param {object}
   */
  receive(request, response) {
    const { method } = request;

    // NB: First pass the the arguments through the * middleware stack
    // NB: Then pass the arguments through the METHOD middleware stack
    function processRequest(callback) {
      async.series([
        (next) => this._middleware('*', [request, response], next),
        (next) => this._middleware(method, [request, response], next)
      ], callback)
    }

    // NB: Repeat the same steps for the error stack
    function handleErrors(err) {
      if (!err) {
        return;
      }

      async.series([
        (next) => this._error('*', [err, request, response], next),
        (next) => this._error(method, [err, request, response], next)
      ]);
    }

    processRequest(handleErrors);
  }

  /**
   * Send the arguments through the stack type
   * @private
   */
  _stack(type, method, args, callback) {
    async.eachSeries(this[type][method] || [], (middleware, done) => {
      middleware(...args, done);
    }, callback);
  }

  /**
   * Send the arguments through the middleware
   * @private
   */
  _middleware() {
    this._stack('_middleware', ...arguments);
  }

  /**
   * Send the arguments through the error handlers
   * @private
   */
  _error() {
    this._stack('_errors', ...arguments);
  }

}

module.exports = AbstractNode;
