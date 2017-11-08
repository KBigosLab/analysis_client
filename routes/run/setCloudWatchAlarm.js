
var watch = require('analysis/watch');
var sleep = require('fusion/sleep');

exports.main = function() {
  if (Const.wantsCloudWatch) {
    // Sleep for 15 minutes before setting the alarm to allow for startup
    sleep(60000*15);

    watch.set();
    sleep(5000);
    watch.reset();
  }
}

