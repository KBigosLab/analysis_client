
var AnalysisNode = require('analysis/Node');
var Shell = require('fusion/Shell');
var sleep = require('fusion/sleep');
var server = require('analysis/server');
var path = require('path');
var fs = require('fusion/fs');
var ip = require('ip');

var modelFiles = ['Fields.txt','%.csv','%.fit.txt','%_0.ctl','%_1.ctl','%.base.txt'];

var isWaiting = false;
var nodes = [];

exports.workerID = null;

function addNode(name) {
  nodes.push(new AnalysisNode(exports.workerID,name));
}

exports.init = function() {

  var res = server.post('registerWorker',{
    ip: ip.address(),
  });

  if (res && res.workerID) {
    exports.workerID = res.workerID;

    for (var k=1;k<=Const.nodeCount;k++)
      addNode('Analysis_Node'+k);

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

