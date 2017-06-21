'use strict';

const { EventEmitter } = require('events');
const { Transform: TransformStream } = require('stream');
const merge = require('merge');
const jsonrpc = require('jsonrpc-lite');
const uuid = require('uuid');
const MetaPipe = require('metapipe');


/**
 * Represents and duplex stream for dispatching messages to a given transport
 * adapter and receiving messages to process through middleware stacks
 * @class
 */
class Messenger extends EventEmitter {

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
    return function([object, sender, receiver], callback) {
      let message = jsonrpc.parseObject(
        merge({ jsonrpc: '2.0', id: uuid() }, object)
      );
      let notification = jsonrpc.notification('IDENTIFY', sender);

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          return callback(null, [
            message.payload.id,
            Buffer.from(JSON.stringify([
              message.payload,
              notification
            ]), 'utf8'),
            receiver
          ]);
        case 'invalid':
        case 'notification':
        default:
          return callback(new Error(`Invalid message type "${message.type}"`));
      }
    }
  }

  /**
   * @function JsonRpcDeserializer
   * @static
   * @memberof Messenger
   */
  static get JsonRpcDeserializer() {
    return function(buffer, callback) {
      let [message, notification] = jsonrpc.parse(buffer.toString('utf8'));

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          return callback(null, [message, notification]);
        case 'invalid':
        case 'notification':
        default:
          return callback(new Error(`Invalid message type "${message.type}"`));
      }
    }
  }

  /**
   * @constructor
   * @param {object} [options]
   * @param {function} [options.serializer] - Serializer function
   * @param {function} [options.deserializer] - Deserializer function
   */
  constructor(options=Messenger.DEFAULTS) {
    super();

    this._opts = merge(Messenger.DEFAULTS, options);
    this.serializer = new MetaPipe({ objectMode: true });
    this.deserializer = new MetaPipe({ objectMode: true });

    this.serializer.append(new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._serialize(object, cb)
    }));
    this.deserializer.append(new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._deserialize(object, cb)
    }));

    this.serializer.on('error', (err) => this.emit('error', err));
    this.deserializer.on('error', (err) => this.emit('error', err));
  }

  /**
   * Serializes a message to a buffer
   * @private
   */
  _serialize(object, callback) {
    this._opts.serializer(object, (err, data) => {
      callback(null, err ? undefined : data);
    });
  }

  /**
   * Deserializes a buffer into a message
   * @private
   */
  _deserialize(object, callback) {
    if (!Buffer.isBuffer(object)) {
      return callback(new Error('Cannot deserialize non-buffer chunk'));
    }

    this._opts.deserializer(object, (err, data) => {
      callback(null, err ? undefined : data);
    });
  }

}

module.exports = Messenger;
