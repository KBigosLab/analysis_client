
var fs = require('fusion/fs');
var path = require('path');
var sleep = require('fusion/sleep');
var Shell = require('fusion/Shell');

function Instance(node,id) {
  this.node = node;
  this.id = id;
  this.analysisDir = path.join(Const.workspaceDir,node,''+id);
}

Instance.prototype.file = function(name) {
  return path.join(this.analysisDir,name);
}

Instance.prototype.inProgress = function() {
  return fs.exists(this.file('Analyzing'));
}

Instance.prototype.rm = function(name) {
  if (fs.exists(this.file(name))) fs.unlink(this.file(name));
}

Instance.prototype.run = function() {
  if (!this.inProgress()) {
    this.rm('Done');
    this.rm('Summary.txt');
    fs.writeFile(path.join(this.analysisDir,'Ready'),'');
  }
}

Instance.prototype.waitForResults = function() {
  while(true) {
    if (fs.exists(this.file('Done'))) return;
    sleep(500);
  }
}

function convert2obj(lines) {
  var obj = {};
  for (var k in lines) {
    var parts = lines[k].split('=');
    obj[parts[0]] = parts[1];
  }
  return obj;
}

Instance.prototype.pushResults = function() {
  var summary = convert2obj(fs.readFile(this.file('Summary.txt'),'utf8').split('\r\n'));
  http.post(Const.analysisServer+'submitJob',{
    id: this.id,
    data: summary,
  });
}

module.exports = Instance;

