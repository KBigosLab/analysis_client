
var client = require('analysis/client');
var http = require('fusion/http');

// This sets how often checkJobs runs
exports.schedule = '* * * * * *';

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
    var res = JSON.parse(http.post(Const.analysisServer+'nextJob',{
      workerID: client.workerID,
    }));

    if (res && res.model) client.process(res);
  }
}

