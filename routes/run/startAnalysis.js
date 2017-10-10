
var client = require('analysis/client');
var server = require('analysis/server');

exports.main = function() {
  var workerID = client.init();
  if (workerID) {
    var res = server.post('nextJob',{
      workerID: workerID,
    });

    if (res && res.model) client.process(res)
    else console.log('No available jobs.');
  }
}

