
var http = require('fusion/http');
var AnalysisInstance = require('analysis/Instance');
var fs = require('fusion/fs');
var csv = require('fusion/csv');
var path = require('path');
var Shell = require('fusion/Shell');

var modelFiles = ['Fields.txt','%.csv','%.fit.txt','%_0.ctl','%_1.ctl','%.base.txt'];

function cloneDrugModel(nodeName,analysis) {
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

  // Copy files from the drug model directory to the directory for analysis
  var analysisDir = path.join(Const.workspaceDir,nodeName,''+analysis.job.jobID);
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
    rows[k].push(analysis.regressor[id]);
    outputCSV += rows[k].join(',')+'\r\n';
  }
  fs.writeFile(path.join(analysisDir,model.name+'.csv'),outputCSV);
}

function startAnalysis(workerID,nodeName,analysis) {

  // Get drug model for the analysis
  cloneDrugModel(nodeName,analysis);

  var instance = new AnalysisInstance(workerID,analysis.model.key,nodeName,analysis.job.jobID);
  instance.run();

  instance.waitForResults();
  instance.pushResults();
  console.log('Done with analysis');
}


exports.main = function() {
/*  var res = { model:
   { model: 1,
     name: 'Olanzapine',
     key: 'HgkfvrZiQGuNaqMA58_xquq8RbimUECr' },
  job: { jobID: 9, name: 'gene8', model: 1 },
  regressors: [ [] ],
  success: 1 };
*/
  var res = JSON.parse(http.post(Const.analysisServer+'nextJob',{
    ip: '127.0.0.1',
  }));

  if (res && res.model) startAnalysis(res.workerID,'Analysis_Node1',res)
  else console.log('No available jobs.');

//  startAnalysis('Analysis_Node1');
//  startAnalysis('Analysis_Node2');
}

