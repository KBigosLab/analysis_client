
var client = require('analysis/client');
var http = require('fusion/http');

exports.main = function() {
  var workerID = client.init();
  if (workerID) {
    var res = JSON.parse(http.post(Const.analysisServer+'nextJob',{
      workerID: workerID,
    }));

    if (res && res.model) client.process(res)
    else console.log('No available jobs.');
  }
}

