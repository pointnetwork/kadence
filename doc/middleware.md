Kad exposes an interface similar to 
[connect](https://github.com/senchalabs/connect)'s `use()` method to allow for 
extending the protocol via message processing middleware.

### Global

Global middleware is applied to any and all deserialized messages. 

```js
const blacklist = new Set([/* misbehaving node ids */]);

/**
 * @example blacklist
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use(function(request, response, next) {
  let [identity] = request.contact;

  if (blacklist.includes(identity)) {
    return next(new Error('Go away!'));
  }

  next();
});
```

### Protocol

Protocol middleware is applied to messages that match the defined method name.

```js
/**
 * @example echo
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use('ECHO', function(request, response, next) {
  let [message] = request.params;

  if (!message) {
    return next(new Error('Nothing to echo'));
  }

  response.send([message]);
});
```

### Error

Error handling middleware is applied to any message which previously resulting 
in a call to `next(err)`. They are defined by including an `err` argument in 
position 0. These can be scoped globally or by protocol.

```js
/**
 * @example catch-all
 * @param {null|error} err
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use(function(err, request, response, next) {
  if (!err) {
    response.error('Method not found', -32602);
  } else {
    response.error(err.message, err.code);
  }
});

/**
 * @example catch-echo
 * @param {error} err
 * @param {object} request
 * @param {object} response
 * @param {function} next
 */
node.use('ECHO', function(err, request, response, next) {
  response.error(`ECHO error: ${err.message}`);
});
```

