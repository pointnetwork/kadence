'use strict';

const { EventEmitter } = require('events');
const { Transform: TransformStream } = require('stream');
const merge = require('merge');
const jsonrpc = require('jsonrpc-lite');
const uuid = require('uuid');


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
    return function([object, contact], callback) {
      let message = jsonrpc.parseObject(
        merge({ jsonrpc: '2.0', id: uuid() }, object)
      );

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          return callback(null, [
            message.id,
            Buffer.from(JSON.stringify(message.payload), 'utf8'),
            contact
          ]);
        case 'notification':
        case 'invalid':
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
    return function([buffer, contact], callback) {
      let message = jsonrpc.parse(buffer.toString('utf8'));

      switch (message.type) {
        case 'request':
        case 'error':
        case 'success':
          message.contact = contact;
          message.identity = Buffer.from(contact.identity, 'hex');
          return callback(null, [message, contact]);
        case 'notification':
        case 'invalid':
        default:
          return callback(new Error(`Invalid message type "${message.type}"`));
      }
    }
  }

  /**
   * @constructor
   */
  constructor(options=Messenger.DEFAULTS) {
    super();

    this._opts = merge(Messenger.DEFAULTS, options);
    this.serializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._serialize(object, cb)
    });
    this.deserializer = new TransformStream({
      objectMode: true,
      transform: (object, enc, cb) => this._deserialize(object, cb)
    });

    this.serializer.on('error', (err) => this.emit('error', err));
    this.deserializer.on('error', (err) => this.emit('error', err));
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
