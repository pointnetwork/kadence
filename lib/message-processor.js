'use strict';

const { Transform: TransformStream } = require('stream');
const merge = require('merge');

/**
 * Represents and duplex stream for dispatching messages to a given transport
 * adapter and receiving messages to process through middleware stacks
 * @class
 */
class MessageProcessor {

  /**
   * @property {object} DEFAULTS - Default options for {@link MessageProcessor}
   * @static
   * @memberof MessageProcessor
   */
  static get DEFAULTS() {
    return {
      serializer: MessageProcessor.JsonRpcSerializer,
      deserializer: MessageProcessor.JsonRpcDeserializer
    };
  }

  /**
   * @function JsonRpcSerializer
   * @static
   * @memberof MessageProcessor
   */
  static get JsonRpcSerializer() {
    return function(data, callback) {
      // TODO
    }
  }

  /**
   * @function JsonRpcDeserializer
   * @static
   * @memberof MessageProcessor
   */
  static get JsonRpcDeserializer() {
    return function(data, callback) {
      // TODO
    }
  }

  /**
   * @constructor
   */
  constructor(options=MessageProcessor.DEFAULTS) {
    this._opts = merge(MessageProcessor.DEFAULTS, options);
    this.serializer = new TransformStream({
      objectMode: true,
      transform: (data, enc, cb) => this._serialize(data, cb)
    });
    this.deserializer = new TransformStream({
      objectMode: true,
      transform: (data, enc, cb) => this._deserialize(data, cb)
    });
  }

  /**
   * Serializes a message to a buffer
   * @private
   */
  _serialize(chunk, encoding, callback) {
    this._opts.serializer(chunk, encoding, (err, data) => {
      callback(err, data);
    });
  }

  /**
   * Deserializes a buffer into a message
   * @private
   */
  _deserialize(chunk, encoding, callback) {
    if (!Buffer.isBuffer(chunk)) {
      return callback(new Error('Cannot deserialize non-buffer chunk'));
    }

    this._opts.deserializer(chunk, encoding, (err, data) => {
      callback(err, data);
    });
  }

}

module.exports = MessageProcessor;
