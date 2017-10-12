
var Shell = require('fusion/Shell');

// This sets how often checkJobs runs
exports.schedule = '0 * * * * *';

function isRunningVM() {
  var shell = new Shell();
  var list = shell.run('vboxmanage list runningvms',[]).split('\n');
  for (var k in list)
    if (list[k]) return true;
  return false;
}

exports.main = function($C) {
  console.log('check VM');

  if (!isRunningVM()) {
    var shell = new Shell();
    shell.run('vboxmanage startvm WinXP --type headless',[]);
  }
}

