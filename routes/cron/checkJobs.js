
var vm = require('analysis/vm');
var client = require('analysis/client');
var server = require('analysis/server');
var sleep = require('fusion/sleep');

// This sets how often checkJobs runs
exports.schedule = '*/2 * * * * *';

// Set to false after initialization. While true, subsequent cron calls won't be able
// to run this script
exports.exclusive = true;

function initialize() {
  var delay = Math.round(Math.random()*30000);
  console.log('Will start in '+delay+'ms');
  sleep(delay);

  // Start any virtual machines
  vm.startAll();

  // Initialize the client
  client.init();

  // Check for dynamic nodes
  client.checkForNewNodes();

  exports.exclusive = false;
}

exports.main = function($C) {
  if ($C.count == 0) initialize();

  if (!client.isWaiting()) client.next();
}

