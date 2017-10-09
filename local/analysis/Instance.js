
var fs = require('fusion/fs');
var path = require('path');
var sleep = require('fusion/sleep');
var http = require('fusion/http');
var Shell = require('fusion/Shell');
var s3 = require('analysis/s3');

function Instance(workerID,modelKey,node,id,name) {
  this.workerID = workerID;
  this.modelKey = modelKey;
  this.node = node;
  this.id = id;
  this.name = name;
  this.analysisDir = path.join(Const.workspaceDir,node,''+name);
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
    if (lines[k]) {
      var parts = lines[k].split('=');
      obj[parts[0]] = parts[1];
    }
  }
  return obj;
}

Instance.prototype.pushNonmemResult = function(name) {
  var filename = path.join(this.analysisDir,'NONMEM.g77',name);
  if (fs.exists(filename)) s3.gzipAndPush(filename,path.join(this.modelKey,'results',''+this.id,name.toLowerCase()));
}

Instance.prototype.getSummary = function() {
  return convert2obj(fs.readFile(this.file('Summary.txt'),'utf8').split('\r\n'));
}

Instance.prototype.remove = function() {
  if (Const.discardLocalWork) {
    // Remove analysis directory
    var shell = new Shell();
    shell.cd(path.join(Const.workspaceDir,this.node));
    shell.run('rm -rf '+this.name,[]);
  }
}

Instance.prototype.pushResults = function() {

  // Post summary
  var summary = this.getSummary();
  http.post(Const.analysisServer+'submitJob',{
    workerID: this.workerID,
    jobID: this.id,
    summary: summary,
  });

  // Upload fit file
  this.pushNonmemResult('nonmem.fit');
  this.pushNonmemResult('NONMEM.smr');
}

module.exports = Instance;

