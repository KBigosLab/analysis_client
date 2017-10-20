
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
var workspace2workerID = {};

function addNode(workerID,name,workspaceDir) {
  nodes.push(new AnalysisNode(workerID,name,workspaceDir));
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
    for (var k in Const.nodes)
      addNode(res.workerID,Const.nodes[k].name,Const.nodes[k].workspace);

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
  for (var k in Const.nodes)
    addNode(0,Const.nodes[k].name,Const.nodes[k].workspace);
  var node = getAvailableNode();
  var baseObjFn = node.computeBaseModel(job);
  console.log('Base objective function: '+baseObjFn);
}

function nodeExists(nodeName,workspaceDir) {
  for (var k in nodes)
    if (nodeName == nodes[k].name && workspaceDir == nodes[k].workspaceDir) return true;
  return false;
}

function getWorkerIDForWorkspace(workspace) {
  var workerID = workspace2workerID[workspace];

  if (!workerID) {
    var res = server.post('registerWorker',{
      ip: ip.address(),
      id: workspace,
    });
    workerID = res.workerID;
    workspace2workerID[workspace] = workerID;
  }

  return workerID;
}

exports.checkForNewNodes = function() {
  if (Const.nodeDir) {
    var workspaces = fs.readdir(Const.nodeDir);
    for (var k in workspaces) {
      var workerID = getWorkerIDForWorkspace(workspaces[k]);
      var workspaceDir = path.join(Const.nodeDir,workspaces[k]);
      var nodeDirs = fs.readdir(workspaceDir);
      for (var j in nodeDirs) {
        if (!nodeExists(nodeDirs[j],workspaceDir)) addNode(workerID,nodeDirs[j],workspaceDir);
      }
    }
  }
}

exports.next = function() {
  if (isWaiting) return;

  // Make sure the necessary drug model exists
  isWaiting = true;

  // Select a node to process the analysis
  var node = getAvailableNode();

  var job = server.post('nextJob',{
    workerID: node.workerID,
  });

  if (job && job.model) {
    cloneDrugModel(job);

    isWaiting = false;

    node.run(job);

  } else isWaiting = false;
}

