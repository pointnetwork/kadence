'use strict';

const [,, sender, target, method, difficulty] = process.argv;
const { HashCashPlugin: hc } = require('./plugin-hashcash');

function _err(msg) {
  process.stderr.write(msg);
  process.exit(1);
}

try {
  hc._worker(sender, target, method, parseInt(difficulty), function(err, result) {
    if (err) {
      return _err(err.message);
    }

    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  });
} catch (err) {
  _err(err.message);
}
