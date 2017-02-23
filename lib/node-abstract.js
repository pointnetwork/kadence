'use strict';

const bunyan = require('bunyan');
const merge = require('merge');
const utils = require('./utils');
const { EventEmitter } = require('events');
const RoutingTable = require('./routing-table');


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
      storage: null
    };
  }

  static validate(options) {
    utils.validateStorageAdapter(options.storage);
    // TODO: validate logger, identity, transport
  }

  /**
   * Contructs the primary interface for a kad node
   * @constructor
   * @param {object} options
   * @param {object} options.transport - {@tutorial transport-adapters}
   * @param {buffer} options.identity - {@tutorial identities}
   * @param {object} options.storage - {@tutorial storage-adapters}
   * @param {object} options.logger - {@tutorial logging}
   */
  constructor(options) {
    AbstractNode.validate(options = merge(AbstractNode.DEFAULTS, options));
    super();

    this.storage = options.storage;
    this.identity = options.identity;
    this.router = new RoutingTable(this.identity);
    this.logger = options.logger;
    this.rpc = {}; // TODO: Determine interface
  }

  /**
   * Accepts an arbitrary function that receives this node as an argument
   * for mounting protocol handlers and extending the node with other
   * methods
   * @param {function} plugin - {@tutorial plugins}
   */
  plugin(func) {
    // TODO
  }

  /**
   * Mounts a message handler route for processing incoming RPC messages
   * @param {string} [method] - RPC method name to route through
   * @param {AbstractNode~middleware} middleware
   */
  use(method, middleware) {
    // TODO
  }

  /**
   * Constructs the supplied transport adapter and initializes it
   */
  listen() {
    // TODO
  }

}

module.exports = AbstractNode;
