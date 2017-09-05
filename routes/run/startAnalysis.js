
var http = require('fusion/http');
var AnalysisInstance = require('analysis/Instance');

var fs = require('fusion/fs');
var path = require('path');
var Shell = require('fusion/Shell');

var modelFiles = ['Fields.txt','%.csv','%.fit.txt','%_0.ctl','%_1.ctl'];

function cloneDrugModel(analysis) {
  var model = analysis.model;
  var drugModelDir = path.join(Const.modelDir,model.key);
  if (!fs.exists(drugModelDir)) {
    fs.mkdir(drugModelDir);

    var shell = new Shell();
    shell.cd(drugModelDir);
    for (var k in modelFiles) {
      var file = modelFiles[k].replace(/\%/g,model.name);
      var url = 'https://kb-nonmem-data.s3.amazonaws.com/'+analysis.model.key+'/model/'+file;
      shell.run('curl --compressed ? > '+file,[url]);
    }
  }
}

function startAnalysis(analysis) {

  cloneDrugModel(analysis);

  //var instance = new AnalysisInstance(name,'792429');
  //instance.run();
}

exports.main = function() {
  var res = JSON.parse(http.post(Const.analysisServer+'nextJob',{
    ip: '127.0.0.1',
  }));

  if (res) startAnalysis(res);

//  startAnalysis('Analysis_Node1');
//  startAnalysis('Analysis_Node2');
}

