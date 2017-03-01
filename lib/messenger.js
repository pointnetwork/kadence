'use strict';

const { Transform: TransformStream } = require('stream');
const merge = require('merge');

/**
 * Represents and duplex stream for dispatching messages to a given transport
 * adapter and receiving messages to process through middleware stacks
 * @class
 */
class Messenger {

  /**
   * @property {object} DEFAULTS - Default options for {@link Messenger}
   * @static
   * @memberof Messenger
   */
  static get DEFAULTS() {
    return {
      serializer: Messenger.JsonRpcSerializer,
      deserializer: Messenger.JsonRpcDeserializer
    };
  }

  /**
   * @function JsonRpcSerializer
   * @static
   * @memberof Messenger
   */
  static get JsonRpcSerializer() {
    return function(object, callback) {
      let { data, contact } = object;

      // TODO: Validate data
      // TODO: Serialize data to buffer
      // TODO: Callback with [contact, buffer]
    }
  }

  /**
   * @function JsonRpcDeserializer
   * @static
   * @memberof Messenger
   */
  static get JsonRpcDeserializer() {
    return function(object, callback) {
      let { data, contact } = object;

      // TODO: Validate data
      // TODO: Deserialize data to object
      // TODO: Callback with [contact, data]
    }
  }

  /**
   * @constructor
   */
  constructor(options=Messenger.DEFAULTS) {
    this._opts = merge(Messenger.DEFAULTS, options);
    this.serializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._serialize(object, cb)
    });
    this.deserializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._deserialize(object, cb)
    });
  }

  /**
   * Serializes a message to a buffer
   * @private
   */
  _serialize(object, callback) {
    this._opts.serializer(object, (err, data) => {
      callback(err, data);
    });
  }

  /**
   * Deserializes a buffer into a message
   * @private
   */
  _deserialize(object, callback) {
    if (!Buffer.isBuffer(object.data)) {
      return callback(new Error('Cannot deserialize non-buffer chunk'));
    }

    this._opts.deserializer(object, (err, data) => {
      callback(err, data);
    });
  }

}

module.exports = Messenger;
