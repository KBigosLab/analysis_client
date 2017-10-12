
var vm = require('analysis/vm');

// This sets how often checkJobs runs
exports.schedule = '0 * * * * *';

exports.main = function($C) {

  console.log('check VM');
  vm.startAll();
}

