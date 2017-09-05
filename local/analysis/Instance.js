
var fs = require('fusion/fs');
var path = require('path');
var Shell = require('fusion/Shell');

function Instance(node,id) {
  this.node = node;
  this.id = id;
  this.analysisDir = path.join(Const.workspaceDir,node,id);
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

Instance.prototype.rmdir = function(name) {
  if (fs.exists(this.file(name))) {
    var sh = new Shell();
    sh.run('rm -rf ?',this.file(name));
  }
}

Instance.prototype.run = function(id) {
  if (!this.inProgress()) {
    this.rm('Done');
    this.rm('Summary.txt');
    this.rmdir('NONMEM.g77')
//    fs.writeFile(path.join(this.analysisDir,'Ready'),'');
  }
}

module.exports = Instance;

