'use strict';

const constants = require('./constants');
const version = require('./version');
const Solution = require('./solution');


/**
 * Exposes an API for the control server to use
 */
class Control {

  /**
   * @constructor
   * @param {Node} node - Kadence node instance
   */
  constructor(node) {
    this.node = node;
  }

  /**
   * @private
   */
  _parseMethodSignature(name) {
    const method = name;
    const func = this[method].toString();
    const args = func.split(`${method}(`)[1].split(')')[0];
    const params = args.split(', ').map(s => s.trim());

    params.pop();

    return { method, params };
  }

  /**
   * Returns a list of the support methods from the controller
   * @param {Control~listMethodsCallback} callback
   */
  listMethods(callback) {
    callback(null, Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(method => {
        return method[0] !== '_' && method !== 'constructor' &&
          typeof this[method] === 'function';
      }).map(this._parseMethodSignature.bind(this)));
  }
  /**
   * @callback Control~listMethodsCallback
   * @param {error|null} error
   * @param {object[]} methods
   * @param {string} methods.method
   * @param {string[]} methods.params
   */

  /**
   * Returns basic informations about the running node
   * @param {Control~getProtocolInfoCallback} callback
   */
  getProtocolInfo(callback) {
    const peers = [], dump = this.node.router.getClosestContactsToKey(
      this.node.identity,
      constants.K * constants.B
    );

    for (let peer of dump) {
      peers.push(peer);
    }

    callback(null, {
      versions: version,
      identity: this.node.identity.toString('hex'),
      contact: this.node.contact,
      peers
    });
  }
  /**
   * @callback Control~getProtocolInfoCallback
   * @param {error|null} error
   * @param {object} info
   * @param {object} info.versions
   * @param {string} info.versions.software
   * @param {string} info.versions.protocol
   * @param {string} info.identity
   * @param {object} info.contact
   * @param {array[]} info.peers
   */

  /**
   * Returns the local wallet balance
   * @param {Control~getBalanceCallback}
   */
  getBalance(callback) {
    callback(null, { total: this.node.wallet.balance });
  }
  /**
   * @callback Control~getBalanceCallback
   * @param {error|null} error
   * @param {object} balances
   * @param {number} balances.total
   */

  /**
   * Returns the complete list of solution keys
   * @param {Control~getSolutionKeysCallback} callback
   */
  getSolutionKeys(callback) {
    callback(null, this.node.wallet.solutions);
  }
  /**
   * @callback Control~getSolutionKeysCallback
   * @param {error|null}
   * @param {string[]} solutionsKeys
   */

  /**
   * Loads the local solution by it's key
   * @param {string} hexSolutionKey
   * @param {Control~getSolutionCallback} callback
   */
  getSolution(hexSolutionKey, callback) {
    const sol = this.node.wallet.get(hexSolutionKey)
      .toBuffer().toString('hex');

    callback(null, sol);
  }
  /**
   * @callback Control~getSolutionCallback
   * @param {error|null} error
   * @param {string} hexSolution
   */

  /**
   * Inserts the solution into the wallet - overwriting existing versions of
   * the same key
   * @param {string} hexSolution
   * @param {Control~putSolutionCallback} callback
   */
  putSolution(hexSolution, callback) {
    this.node.wallet.put(new Solution(Buffer.from(hexSolution, 'hex')));
    callback(null);
  }
  /**
   * @callback Control~putSolutionCallback
   * @param {error|null} error
   */

  /**
   *
   */
  transferSolution(hexSolutionKey, publicKey, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  ping(contact, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  iterativeFindNode(hexKey, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  iterativeFindValue(hexKey, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  iterativeStore(hexSolutionKey, hexMemoValue, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  quasarSubscribe(hexKey, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  quasarPublish(hexKey, hexContentValue, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  signMessage(hexMessage, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

  /**
   *
   */
  verifyMessage(hexMessage, hexPublicKey, hexSignature, callback) {
    callback(new Error('Not implemented'));
  }
  /**
   *
   */

}

module.exports = Control;
