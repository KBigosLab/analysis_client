
var watch = require('analysis/watch');

exports.main = function() {
  watch.deleteInactiveAlarms('us-east-2');
}

