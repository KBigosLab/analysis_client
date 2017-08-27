
var jobman = require('analysis/jobman');

// This sets how often checkJobs runs
exports.schedule = '* * * * * *';

// This will be set to false as soon as the script initializes. When it's true,
// it prevents subsequent calls from triggering the script (the currently
// running script gets an exclusive lock).
exports.exclusive = true;

function initialize() {
}

exports.main = function($C) {
  if ($C.count == 0) initialize();

  // Get a new task
  var job = jobman.getJob();

}

