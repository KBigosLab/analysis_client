
var client = require('analysis/client');

exports.main = function() {
  if (process.argv.length == 5) {
    var job = {model: {name: process.argv[3], key: process.argv[4]} };
    client.computeBaseModel(job);

  } else console.log('USAGE: computeBaseModel modelName modelHash');
}

