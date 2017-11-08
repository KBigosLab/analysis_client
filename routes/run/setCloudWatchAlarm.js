
var watch = require('analysis/watch');
var sleep = require('fusion/sleep');

exports.main = function() {
  if (Const.wantsCloudWatch) {
    // Sleep for 1 minute before setting the alarm to allow for startup
    sleep(60000);

    watch.set();
  }
}

