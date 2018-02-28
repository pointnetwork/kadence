'use strict';

const ip = require('ip');
const merge = require('merge');
const async = require('async');
const { get_gateway_ip: getGatewayIp } = require('network');
const natpmp = require('nat-pmp');
const natupnp = require('nat-upnp');
const url = require('url');
const concat = require('concat-stream');
const diglet = require('diglet');
const { request } = require('http');


/**
 * Establishes a series of NAT traversal strategies to execute before
 * AbstractNode#listen
 */
class TraversePlugin {

  static get TEST_INTERVAL() {
    return 600000;
  }

  /**
   * @constructor
   * @param {object} node
   * @param {object[]} strategies
   * @param {function} strategies.exec
   */
  constructor(node, strategies) {
    this.node = node;
    this.strategies = strategies;
    this._originalContact = merge({}, node.contact);

    this._wrapNodeListen();
  }

  /**
   * @private
   * @param {function} callback
   */
  _execTraversalStrategies(callback) {
    async.detectSeries(this.strategies, (strategy, test) => {
      this.node.contact = this._originalContact;
      strategy.exec(this.node, (err) => {
        if (err) {
          test(null, false);
        } else {
          this._testIfReachable(test);
        }
      });
    }, callback);
  }

  /**
   * @private
   */
  _startTestInterval() {
    clearInterval(this._testInterval);

    this._testInterval = setInterval(() => {
      this._testIfReachable((err, isReachable) => {
        /* istanbul ignore else */
        if (!isReachable) {
          this.node.logger.warn('no longer reachable, retrying traversal');
          this._execTraversalStrategies(() => null);
        }
      });
    }, TraversePlugin.TEST_INTERVAL);
  }

  /**
   * @private
   */
  _testIfReachable(callback) {
    if (!ip.isPublic(this.node.contact.hostname)) {
      return callback(null, false);
    }

    this.node.ping(
      [this.node.identity.toString('hex'), this.node.contact],
      (err) => callback(null, !err)
    );
  }

  /**
   * @private
   */
  _wrapNodeListen() {
    const self = this;
    const listen = this.node.listen.bind(this.node);

    this.node.listen = function() {
      let args = [...arguments];
      let listenCallback = () => null;

      if (typeof args[args.length - 1] === 'function') {
        listenCallback = args.pop();
      }

      listen(...args, () => {
        self._execTraversalStrategies((err, strategy) => {
          if (err) {
            self.node.logger.error('traversal errored %s', err.message);
          } else if (!strategy) {
            self.node.logger.warn('traversal failed - may not be reachable');
          } else {
            self.node.logger.info('traversal succeeded - you are reachable');
          }

          self._startTestInterval();
          listenCallback();
        });
      });
    };
  }

}

/**
 * Uses NAT-PMP to attempt port forward on gateway device
 */
class NATPMPStrategy {

  static get DEFAULTS() {
    return {
      publicPort: 0,
      mappingTtl: 0
    };
  }

  /**
   * @constructor
   * @param {object} [options]
   * @param {number} [options.publicPort=contact.port]
   * @param {number} [options.mappingTtl=0]
   */
  constructor(options) {
    this.options = merge(NATPMPStrategy.DEFAULTS, options);
  }

  /**
   * @param {object} node
   * @param {function} callback
   */
  exec(node, callback) {
    async.waterfall([
      (next) => getGatewayIp(next),
      (gateway, next) => {
        this.client = natpmp.connect(gateway);
        this.client.portMapping({
          public: this.options.publicPort || node.contact.port,
          private: node.contact.port,
          ttl: this.options.mappingTtl
        }, next);
      },
      (next) => this.client.externalIp(next)
    ], (err, info) => {
      if (err) {
        return callback(err);
      }

      node.contact.port = this.options.publicPort;
      node.contact.hostname = info.ip.join('.');

      callback(null);
    });
  }

}

/**
 * Uses UPnP to attempt port forward on gateway device
 */
class UPNPStrategy {

  static get DEFAULTS() {
    return {
      publicPort: 0,
      mappingTtl: 0
    };
  }

  /**
   * @constructor
   * @param {object} [options]
   * @param {number} [options.publicPort=contact.port]
   * @param {number} [options.mappingTtl=0]
   */
  constructor(options) {
    this.client = natupnp.createClient();
    this.options = merge(UPNPStrategy.DEFAULTS, options);
  }

  /**
   * @param {object} node
   * @param {function} callback
   */
  exec(node, callback) {
    async.waterfall([
      (next) => {
        this.client.portMapping({
          public: this.options.publicPort || node.contact.port,
          private: node.contact.port,
          ttl: this.options.mappingTtl
        }, next);
      },
      (next) => this.client.externalIp(next)
    ], (err, ip) => {
      if (err) {
        return callback(err);
      }

      node.contact.port = this.options.publicPort;
      node.contact.hostname = ip;

      callback(null);
    });
  }

}

/**
 * Uses a reverse HTTP tunnel via the diglet package to traverse NAT
 */
class ReverseTunnelStrategy {

  static get DEFAULTS() {
    return {
      remoteAddress: 'diglet.me',
      remotePort: 80
    };
  }

  /**
   * @constructor
   * @param {object} [options]
   * @param {string} [options.remoteAddress=diglet.me]
   * @param {number} [options.remotePort=80]
   */
  constructor(options) {
    this.options = merge(ReverseTunnelStrategy.DEFAULTS, options);
  }

  /**
   * @param {object} node
   * @param {function} callback
   */
  exec(node, callback) {
    async.waterfall([
      (next) => {
        let requestOptions = {
          host: this.options.remoteAddress,
          port: this.options.remotePort,
          path: `/?id=${node.identity.toString('hex')}`,
          method: 'GET'
        };
        let responseHandler = (res) => {
          res.pipe(concat((body) => {
            try {
              body = JSON.parse(body);
            } catch (err) {
              return next(new Error('Failed to parse response'));
            }

            if (res.statusCode !== 200 && res.statusCode !== 201) {
              return next(new Error(body.error));
            }

            next(null, body);
          }));
        };
        request(requestOptions, responseHandler).on('error', next).end();
      },
      (info, next) => {
        this.tunnel = new diglet.Tunnel({
          localAddress: '127.0.0.1',
          localPort: node.contact.port,
          remoteAddress: info.tunnelHost,
          remotePort: info.tunnelPort,
          logger: node.logger
        });
        this.tunnel.open();

        node.contact.hostname = url.parse(info.publicUrl).hostname;
        node.contact.port = 80;
        node.contact.protocol = 'http:';

        setImmediate(next);
      }
    ], callback);
  }

}

module.exports = function(strategies) {
  return function(node) {
    return new module.exports.TraversePlugin(node, strategies);
  };
};

module.exports.ReverseTunnelStrategy = ReverseTunnelStrategy;

module.exports.UPNPStrategy = UPNPStrategy;

module.exports.NATPMPStrategy = NATPMPStrategy;

module.exports.TraversePlugin = TraversePlugin;
