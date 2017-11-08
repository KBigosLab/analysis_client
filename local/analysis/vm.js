
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
  var shell = new Shell();
  var coreCount = +shell.run('cat /proc/cpuinfo | grep processor | wc -l',[]);
  var vms = Const.vms.slice(0,coreCount);

  if (vms && vms.length) {
    var shell = new Shell();
    var list = shell.run('vboxmanage list runningvms',[]).split('\n');

    for (var k in vms) {
      if (!isRunning(list,vms[k])) startVM(vms[k]);
    }
  }
}

