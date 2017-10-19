
var client = require('analysis/client');

// This sets how often this job runs (once per minute)
exports.schedule = '0 * * * * *';

exports.main = function() {
  client.checkForNewNodes();
}

