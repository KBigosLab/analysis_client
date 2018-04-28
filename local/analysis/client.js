
var AnalysisNode = require('analysis/Node');
var Shell = require('fusion/Shell');
var sleep = require('fusion/sleep');
var server = require('analysis/server');
var path = require('path');
var fs = require('fusion/fs');
var ip = require('ip');

var modelFiles = ['%.csv','%.fit.txt','%_0.ctl','%_1.ctl','%.base.txt'];

var isWaiting = false;
var availableNodes = [];
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

  // Determines which nodes are available based on the number of cores on the system
  determineAvailableDynamicNodes();

  var uniqueID = Const.uniqueID == '#' ? getAWSInstanceID() : Const.uniqueID;
  console.log('Unique id: '+uniqueID);
  var res = server.post('registerWorker',{
    ip: ip.address(),
    id: uniqueID,
  });

  if (res && res.workerID) {
    for (var k in availableNodes)
      addNode(res.workerID,availableNodes[k].name,availableNodes[k].workspace);

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

function determineAvailableDynamicNodes() {
  var shell = new Shell();
  var coreCount = +shell.run('cat /proc/cpuinfo | grep processor | wc -l',[]) || 1;
  availableNodes = Const.nodes.slice(0,coreCount);
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
  // Use the existing node list as the available nodes
  availableNodes = Const.nodes;

  // Make sure the necessary drug model exists
  cloneDrugModel(job);

  // Place the analysis on a node
  for (var k in availableNodes)
    addNode(0,availableNodes[k].name,availableNodes[k].workspace);
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
      if (~workspaces[k].indexOf('.')) continue;

      var workerID = getWorkerIDForWorkspace(workspaces[k]);
      var workspaceDir = path.join(Const.nodeDir,workspaces[k]);
      var nodeDirs = fs.readdir(workspaceDir);
      for (var j in nodeDirs) {
        if (!nodeExists(nodeDirs[j],workspaceDir)) addNode(workerID,nodeDirs[j],workspaceDir);
      }
    }
  }
}

function checkMAF(workerID,analysis) {

  for (var k in analysis.regressor) {
    if (+analysis.regressor[k] == 1 || +analysis.regressor[k] == 2) return true;
  }

  // If we make it this far, there are no 1's and 2's in the regressor
  console.log('***************');
  console.log('**  Low MAF  **');
  console.log('***************');

  server.post('submitJob',{
    workerID: workerID,
    jobID: analysis.job.jobID,
    summary: {'Error': 'Low MAF'},
  });

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

  if (job && job.model && checkMAF(node.workerID,job)) {

    cloneDrugModel(job);

    isWaiting = false;

    node.run(job);

  } else isWaiting = false;
}

