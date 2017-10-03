
var http = require('fusion/http');
var AnalysisInstance = require('analysis/Instance');
var fs = require('fusion/fs');
var csv = require('fusion/csv');
var path = require('path');
var Shell = require('fusion/Shell');

function Node(workerID,name) {
  this.workerID = workerID;
  this.name = name;
}

Node.prototype.copyDrugModel = function(analysis) {
  var model = analysis.model;
  var drugModelDir = path.join(Const.modelDir,model.key);
  var shell = new Shell();

  // Copy files from the drug model directory to the directory for analysis
  var analysisDir = path.join(Const.workspaceDir,this.name,''+analysis.job.jobID);
  if (!fs.exists(analysisDir)) fs.mkdir(analysisDir);
  shell.cd(analysisDir);

  function cp(from,to) {
    var file = from.replace(/\%/g,model.name);
    shell.run('cp ? ?',[path.join(drugModelDir,file),to.replace(/\%/g,model.name)]);
  }
  cp('%.fit.txt','fit.key.txt');
  cp('%_1.ctl','NONMEM.ctl');
  cp('%_1.ctl','NONMEM.ctl');
  cp('%.csv','%.csv');
  cp('%.base.txt','BaseObjFn.txt');

  // Copy Analyze.bat
  shell.run('cp ? .',[path.join(Const.modelDir,'Analyze.bat')]);

  // Modify the csv file
  var outputCSV = '';
  var rows = csv.csv2json(path.join(analysisDir,model.name+'.csv'));
  rows[0].push('A');

  var idx = 1;
  var id2idx = {};
  for (var k in analysis.regressor) {
    id2idx[k] = idx;
    idx++;
  }
  outputCSV += rows[0].join(',')+'\r\n';
  for (var k=1;k<rows.length;k++) {
    var id = rows[k][0];
    rows[k][0] = id2idx[id];
    var geneValue = analysis.regressor[id];
    if (geneValue != -1) {
      rows[k].push(geneValue);
      outputCSV += rows[k].join(',')+'\r\n';
    }
  }
  fs.writeFile(path.join(analysisDir,model.name+'.csv'),outputCSV);
}

Node.prototype.run = function(analysis) {

  // Reserve this node
  this.isRunning = true;

  // Get drug model for the analysis
  this.copyDrugModel(analysis);

  // Run an analysis instance
  var startTime = new Date();
  var instance = new AnalysisInstance(this.workerID,analysis.model.key,this.name,analysis.job.jobID);
  instance.run();

  // Push the results
  instance.waitForResults();
  instance.pushResults();
  var stopTime = new Date();

  console.log('**************************************');
  console.log('Done with analysis: Ran in '+(stopTime-startTime)+'ms');
  console.log('**************************************');

  // Free the node to do another job
  this.isRunning = false;
}

module.exports = Node;

