
var AnalysisNode = require('analysis/Node');
var Shell = require('fusion/Shell');
var sleep = require('fusion/sleep');
var server = require('analysis/server');
var path = require('path');
var fs = require('fusion/fs');
var ip = require('ip');

var modelFiles = ['%.csv','%.fit.txt','%_0.ctl','%_1.ctl','%.base.txt'];

var isWaiting = false;
var nodes = [];

exports.workerID = null;

function addNode(name,workspaceDir) {
  nodes.push(new AnalysisNode(exports.workerID,name,workspaceDir));
}

function getAWSInstanceID() {
  var shell = new Shell();
  return shell.run('wget -q -O - http://169.254.169.254/latest/meta-data/instance-id',[]);
}

exports.init = function() {

  var uniqueID = Const.uniqueID == '#' ? getAWSInstanceID() : Const.uniqueID;
  console.log('Unique id: '+uniqueID);
  var res = server.post('registerWorker',{
    ip: ip.address(),
    id: uniqueID,
  });

  if (res && res.workerID) {
    exports.workerID = res.workerID;

    for (var k in Const.nodes)
      addNode(Const.nodes[k].name,Const.nodes[k].workspace);

    return res.workerID;
  }
}

function cloneDrugModel(analysis) {
  var model = analysis.model;
  var drugModelDir = path.join(Const.modelDir,model.key);
  var shell = new Shell();

  // If the drug model directory doesn't exist, create it
  if (!fs.exists(drugModelDir)) {
    fs.mkdir(drugModelDir);

    shell.cd(drugModelDir);
    for (var k in modelFiles) {
      var file = modelFiles[k].replace(/\%/g,model.name);
      var url = 'https://kb-nonmem-data.s3.amazonaws.com/'+analysis.model.key+'/model/'+file;
      shell.run('curl --compressed ? > '+file,[url]);
    }
  }
}

function getAvailableNode() {
  while(true) {
    for (var k in nodes) if (!nodes[k].isRunning) return nodes[k];
    sleep(500);
  }
}

exports.isWaiting = function() {
  return isWaiting;
}

exports.computeBaseModel = function(job) {
  // Make sure the necessary drug model exists
  cloneDrugModel(job);

  // Place the analysis on a node
  exports.workerID = 0;
  for (var k in Const.nodes)
    addNode(Const.nodes[k].name,Const.nodes[k].workspace);
  var node = getAvailableNode();
  var baseObjFn = node.computeBaseModel(job);
  console.log('Base objective function: '+baseObjFn);
}

function nodeExists(nodeName,workspaceDir) {
  for (var k in nodes)
    if (nodeName == nodes[k].name && workspaceDir == nodes[k].workspaceDir) return true;
  return false;
}

exports.checkForNewNodes = function() {
  if (Const.nodeDir) {
    var workspaces = fs.readdir(Const.nodeDir);
    for (var k in workspaces) {
      var workspaceDir = path.join(Const.nodeDir,workspaces[k]);
      var nodeDirs = fs.readdir(workspaceDir);
      for (var j in nodeDirs) {
        if (!nodeExists(nodeDirs[j],workspaceDir)) addNode(nodeDirs[j],workspaceDir);
      }
    }
  }
}

exports.process = function(job) {
  if (isWaiting) return;

  // Make sure the necessary drug model exists
  isWaiting = true;
  cloneDrugModel(job);

  // Place the analysis on a node
  var node = getAvailableNode();
  isWaiting = false;

  node.run(job);
}

