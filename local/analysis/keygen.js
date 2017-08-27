
var crypto = require('crypto')

// This matches express's uid function. It was created so we could
// write custom session code.
exports.uid = function(len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
}

