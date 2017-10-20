
var fs = require('fusion/fs');
var path = require('path');
var sleep = require('fusion/sleep');
var server = require('analysis/server');
var Shell = require('fusion/Shell');
var s3 = require('analysis/s3');

function Instance(workerID,workspaceDir,modelKey,node,id,name) {
  this.workerID = workerID;
  this.workspaceDir = workspaceDir;
  this.omitted = [];
  this.modelKey = modelKey;
  this.node = node;
  this.id = id;
  this.name = name;
  this.analysisDir = path.join(this.workspaceDir,node,''+name);
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

    var lines = [];
    for (var k in this.files) {
      var stats = fs.stat(path.join(this.analysisDir,this.files[k]));
      lines.push(this.files[k]+'='+stats.size);
    }
    lines.push('-=-');
    fs.writeFile(path.join(this.analysisDir,'Ready'),lines.join('\r\n'));
  }
}

Instance.prototype.hasAllFiles = function() {
  // Extract data into the done object
  var done = {};
  var lines = fs.readFile(this.file('Done'),'utf8').split('\r\n');
  for (var k in lines) {
    if (!lines[k]) continue;
    var parts = lines[k].split('=');
    done[parts[0]] = parts[1];
  }

  // Verify that all returned files are the right size
  if (done['-'] == '-') {
    for (var filename in done) {
      if (filename == '-') continue;
      if (fs.exists(path.join(this.analysisDir,filename))) {
        var stats = fs.stat(path.join(this.analysisDir,filename));
        if (+done[filename] != stats.size) return false;
      } else return false;
    }
  } else return false;

  return true;
}

Instance.prototype.waitForResults = function() {
  while(true) {
    if (fs.exists(this.file('Done')) && this.hasAllFiles()) return;
    sleep(100);
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
  var obj = convert2obj(fs.readFile(this.file('Summary.txt'),'utf8').split('\r\n'));
  obj.Missing = this.omitted.length;
  return obj;
}

Instance.prototype.remove = function() {
  if (Const.discardLocalWork) {
    // Remove analysis directory
    var shell = new Shell();
    shell.cd(path.join(this.workspaceDir,this.node));
    shell.run('rm -rf '+this.name,[]);
  }
}

Instance.prototype.pushResults = function() {

  // Post summary
  var summary = this.getSummary();
  server.post('submitJob',{
    workerID: this.workerID,
    jobID: this.id,
    summary: summary,
  });

  // Upload fit file
  this.pushNonmemResult('nonmem.fit');
  this.pushNonmemResult('NONMEM.smr');
}

module.exports = Instance;

