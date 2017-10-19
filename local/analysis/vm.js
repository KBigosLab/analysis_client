
var Shell = require('fusion/Shell');

function startVM(name) {
  var shell = new Shell();
  shell.run('vboxmanage startvm '+name+' --type headless',[]);
}

function isRunning(list,name) {
  for (var k in list)
    if (~list[k].indexOf('"'+name+'"')) return true;
  return false;
}

exports.startAll = function() {
  if (Const.vms && Const.vms.length) {
    var shell = new Shell();
    var list = shell.run('vboxmanage list runningvms',[]).split('\n');

    for (var k in Const.vms) {
      if (!isRunning(list,Const.vms[k])) startVM(Const.vms[k]);
    }
  }
}

