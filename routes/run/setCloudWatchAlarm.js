
var watch = require('analysis/watch');
var sleep = require('fusion/sleep');

exports.main = function() {
  if (Const.wantsCloudWatch) {
    // Sleep for 10 minutes before setting the alarm to allow for startup
    sleep(60000*10);

    watch.set();
    sleep(60000*10);
    watch.reset();
  }
}

