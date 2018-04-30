
var client = require('analysis/client');

exports.main = function($C) {
  // Initialize the client
  client.init();

  // Check for dynamic nodes
  client.checkForNewNodes();

  client.next();
}

