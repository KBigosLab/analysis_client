
var server = require('analysis/server');
var AnalysisInstance = require('analysis/Instance');
var fs = require('fusion/fs');
var csv = require('fusion/csv');
var path = require('path');
var _ = require('underscore');
var Shell = require('fusion/Shell');

// Maximum amount of time analysis can run for without timing out
var timeout = 600; // 10 minutes

function Node(workerID,name,workspaceDir) {
  this.workerID = workerID;
  this.name = name;
  this.workspaceDir = workspaceDir;
}

function computeIds(rows) {
  var idx = 1;
  var id2idx = {};
  for (var k=1;k<rows.length;k++) {
    var subjID = rows[k][0];
    if (!id2idx[subjID]) {
      id2idx[subjID] = idx;
      idx++;
    }
  }
  return id2idx;
}

Node.prototype.createAnalysisDir = function(analysis,instance,analysisName,options) {
  options = options || {};

  var files = [];
  instance.files = files;
  var model = analysis.model;
  var drugModelDir = path.join(Const.modelDir,model.key);
  var shell = new Shell();

  // Copy files from the drug model directory to the directory for analysis
  var analysisDir = path.join(this.workspaceDir,this.name,analysisName);
  if (!fs.exists(analysisDir)) fs.mkdir(analysisDir);
  shell.cd(analysisDir);

  function cp(from,to) {
    var file = from.replace(/\%/g,model.name);
    var toFile = to.replace(/\%/g,model.name);
    files.push(toFile);
    shell.run('cp ? ?',[path.join(drugModelDir,file),toFile]);
  }

  // Copy the model
  if (options.type == 'base') cp('%_0.ctl','NONMEM.ctl')
  else cp('%_1.ctl','NONMEM.ctl');

  // Copy the subject data csv
  cp('%.csv','%.csv');

  // Copy the fit file column key
  cp('%.fit.txt','fit.key.txt');

  // Determine if the base objective function is the default or was re-run
  if (options.baseObjFn) {
    fs.writeFile(path.join(analysisDir,'BaseObjFn.txt'),''+options.baseObjFn);
  } else cp('%.base.txt','BaseObjFn.txt');

  // Copy Analyze.bat
  shell.run('cp ? .',[path.join(Const.modelDir,'Analyze.bat')]);
  files.push('Analyze.bat');

  // Modify the csv file
  if (!options.noCSVMod) {
    var outputCSV = '';
    var rows = csv.csv2json(path.join(analysisDir,model.name+'.csv'));
    if (options.type == 'gene') rows[0].push('A');

    var omitted = {};
    var id2idx = computeIds(rows);
    outputCSV += rows[0].join(',')+'\r\n';
    for (var k=1;k<rows.length;k++) {
      var id = rows[k][0];
      rows[k][0] = id2idx[id];
      var geneValue = analysis.regressor[id];
      if (geneValue == 0 || geneValue == 1 || geneValue == 2) {
        if (options.type == 'gene') rows[k].push(geneValue);
        outputCSV += rows[k].join(',')+'\r\n';
      } else omitted[id] = true;
    }
    omitted = _.map(omitted,function(v,i) { return i });
    if (omitted.length) {
      console.log('******************');
      console.log('******************');
      console.log('******************');
      console.log(omitted);
      console.log('******************');
      console.log('******************');
      console.log('******************');
    }
    instance.omitted = omitted;
  } else {
    var outputCSV = '';
    var rows = csv.csv2json(path.join(analysisDir,model.name+'.csv'));
    if (options.type == 'gene') rows[0].push('A');

    var omitted = {};
    var id2idx = computeIds(rows);
    outputCSV += rows[0].join(',')+'\r\n';
    for (var k=1;k<rows.length;k++) {
      var id = rows[k][0];
      rows[k][0] = id2idx[id];
      outputCSV += rows[k].join(',')+'\r\n';
    }
  }
  fs.writeFile(path.join(analysisDir,model.name+'.csv'),outputCSV);
}

Node.prototype.canUseCachedBaseModel = function(analysis) {
  var index = {};
  var model = analysis.model;
  var drugModelDir = path.join(Const.modelDir,model.key);
  var rows = csv.csv2json(path.join(drugModelDir,model.name+'.csv'));
  for (var k=1;k<rows.length;k++) index[rows[k][0]] = true;
  for (var id in analysis.regressor) {
    var geneValue = analysis.regressor[id];
    if (geneValue == 0 || geneValue == 1 || geneValue == 2)
      index[id] = false;
  }
  for (var k in index) if (index[k]) return false

  return true;
}

Node.prototype.analyze = function(analysis,options) {
  options = options || {};

  var analysisName = options.type == 'base' ? analysis.job.jobID+'_base' : analysis.job.jobID+'_gene';

  // Make sure an old analysis directory isn't present
  var shell = new Shell();
  shell.cd(path.join(this.workspaceDir,this.name));
  shell.run('rm -rf '+analysisName,[]);

  // Create analysis instance
  var instance = new AnalysisInstance(this.workerID,this.workspaceDir,analysis.model.key,this.name,analysis.job.jobID,analysisName);

  // Get drug model for the analysis
  this.createAnalysisDir(analysis,instance,analysisName,options);

  // Run an analysis instance
  instance.run();

  instance.waitForResults();

  return instance;
}

Node.prototype.computeBaseModel = function(analysis) {
  var analysisName = 'base_model_'+analysis.model.name;

  // Make sure an old analysis directory isn't present
  var shell = new Shell();
  shell.cd(path.join(this.workspaceDir,this.name));
  shell.run('rm -rf '+analysisName,[]);

  // Create analysis instance
  var instance = new AnalysisInstance(0,this.workspaceDir,analysis.model.key,this.name,0,analysisName);

  // Get drug model for the analysis
  this.createAnalysisDir(analysis,instance,analysisName,{type: 'base', noCSVMod: true});

  // Run an analysis instance
  instance.run();

  // Wait for analysis to complete
  instance.waitForResults();

  // Extract base objective function from summary stats
  var stats = instance.getSummary();
  return stats.ObjFn;
}

Node.prototype.hasTimedOut = function() {
  var currentTime = new Date();
  var elapsedTime = Math.round(+(currentTime-this.startTime)/1000);
  console.log('elapsedTime: '+elapsedTime+'s');
  console.log('timeout: '+timeout+'s');
  console.log('hasTimedOut: '+(elapsedTime > timeout));
  return elapsedTime > timeout;
}

Node.prototype.run = function(analysis) {

  // Reserve this node
  this.startTime = new Date();
  this.isRunning = true;

  // Determine if the cached base model can be used
  var useCachedBaseModel = this.canUseCachedBaseModel(analysis);

  // Run analysis for base model
  var baseObjFn = null;
  if (!useCachedBaseModel) {
    // Run base model
    var instance = this.analyze(analysis,{type: 'base'});

    // Extract base objective function from summary stats
    var stats = instance.getSummary();
    baseObjFn = stats.ObjFn;

    // Remove base model analysis directory
    instance.remove();
  }

  // Run gene analysis
  var instance = this.analyze(analysis,{type: 'gene', baseObjFn: baseObjFn});

  // Push the results
  instance.pushResults();

  // Remove gene analysis directory
  instance.remove();

  var stopTime = new Date();

  console.log('**************************************');
  console.log('Done with analysis: Ran in '+(stopTime-this.startTime)+'ms');
  console.log('**************************************');

  // Free the node to do another job
  this.isRunning = false;
}

module.exports = Node;

