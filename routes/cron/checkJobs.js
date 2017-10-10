
var client = require('analysis/client');
var server = require('analysis/server');

// This sets how often checkJobs runs
exports.schedule = '*/2 * * * * *';

// Set to false after initialization. While true, subsequent cron calls won't be able
// to run this script
exports.exclusive = true;

function initialize() {
  // Initialize the client
  client.init();
  exports.exclusive = false;
}

exports.main = function($C) {
  if ($C.count == 0) initialize();

  if (client.workerID && !client.isWaiting()) {
    var res = server.post('nextJob',{
      workerID: client.workerID,
    });

    if (res && res.model) client.process(res);
  }
}

