
var fs = require('fusion/fs');
var path = require('path');
var Shell = require('fusion/Shell');
var server = require('analysis/server');
var client = require('analysis/client');
var prompt = require('analysis/prompt');
var _ = require('underscore');
var s3 = require('analysis/s3');
var sleep = require('fusion/sleep');

var modelFiles = ['%.csv','%.fit.txt','%_0.ctl','%_1.ctl','%.base.txt'];

function checkCTLFiles(dirName,modelName,modelDir) {
  var sh = new Shell();
  sh.cd(path.join(dirName,modelName));

  function checkCTLFile(ctl) {
    var found = false;
    for (var k in modelDir) {
      var filename = modelDir[k];
      if (filename.toLowerCase().indexOf(ctl) == filename.length-6 && filename.length > 7) {
        if (found) throw new Error('Found multiple '+ctl+' files.');
        found = true;
        if (filename != modelName+ctl) {
          console.log(filename);
          console.log(modelName+ctl);
          console.log(filename+' does not match directory name...fixing');
          sh.run('mv ? ?',[filename,modelName+ctl]);
        }
      }
    }
  }

  checkCTLFile('_0.ctl');
  checkCTLFile('_1.ctl');
}

function checkFITFile(dirName,modelName,modelDir) {
  if (fs.exists(path.join(dirName,modelName,modelName+'.fit.txt'))) {
    var choice = prompt('fit.txt map file already exists. Overwrite? (y/n):');
    if (choice != 'y') return;
  }

  var map = [];
  var hasClearance = false;
  var hasGene = false;

  var lines = fs.readFile(path.join(dirName,modelName,modelName+'_1.ctl'),'utf8').split('\n');
  for (var k in lines) {
    if (lines[k].indexOf('$TABLE') == 0) {
      console.log(lines[k]);
      var table = lines[k].split(' ').slice(1);
      for (var j in table) {
        if (table[j] == 'CL' || table[j] == 'CLP') {
          map.push('CL='+j);
          hasClearance = true;
        } else if (table[j] == 'A') {
          map.push('Gene='+j);
          hasGene = true;
        }
      }
    }
  }

  if (!hasClearance) throw new Error('Clearance is missing from the ctl file.');
  if (!hasGene) throw new Error('The gene is missing from the ctl file.');

  fs.writeFile(path.join(dirName,modelName,modelName+'.fit.txt'),map.join('\n'));
}

function computeBaseModel(dirName,modelName,key) {
  var job = {model: {name: modelName, key: key} };
  var baseObjFn = client.computeBaseModel(job);
  fs.writeFile(path.join(dirName,modelName,modelName+'.base.txt'),baseObjFn);
}

function checkCSV(dirName,modelName,modelDir) {
  var sh = new Shell();
  sh.cd(path.join(dirName,modelName));

  for (var k in modelDir) {
    var found = false;
    var filename = modelDir[k];
    if (filename.toLowerCase().indexOf('.csv') == filename.length-4 && filename.length > 5) {
      if (found) throw new Error('Multiple csv files found.');
      found = true;

      if (filename != modelName+'.csv') {
        console.log(filename);
        console.log(modelName+'.csv');
        console.log(filename+' does not match directory name...fixing');
        sh.run('mv ? ?',[filename,modelName+'.csv']);
      }
    }
  }
}

function filterCSV(dirName,modelName,modelDir) {
  var sh = new Shell();
  sh.cd(path.join(dirName,modelName));

  var res = server.post('getSubjectList',{});
  if (!res.subjects) throw new Error('Could not get subject list.');
  var subjIndex = _.indexBy(res.subjects,_.identity);

  // Save the original csv
  if (!fs.exists(path.join(dirName,modelName,modelName+'.csv.orig'))) sh.run('mv ? ?',[modelName+'.csv',modelName+'.csv.orig']);

  // Create the filtered CSV
  var lines = fs.readFile(path.join(dirName,modelName,modelName+'.csv.orig'),'utf8').split('\n');
  var res = [lines[0]];
  for (var k=1;k<lines.length;k++) {
    var row = lines[k].split(',');
    if (subjIndex[row[0]]) res.push(lines[k]);
  }
  fs.writeFile(path.join(dirName,modelName,modelName+'.csv'),res.join('\n'));
  console.log('Wrote '+modelName+'.csv');
}

function registerModel(dirName,modelName) {
  var modelKey = '';

  // Check and see if a key file already exists
  if (fs.exists(path.join(dirName,modelName,'key'))) {
    modelKey = fs.readFile(path.join(dirName,modelName,'key'),'utf8');
    return modelKey;
  }

  // Register the model with the remote server
  var res = server.post('registerModel',{
    name: modelName,
  });
  console.log(res);

  // Check for errors
  if (res.error) throw new Error(res.error);

  // Store the key file
  if (res.key) {
    modelKey = res.key;
    fs.writeFile(path.join(dirName,modelName,'key'),modelKey);
  } else throw new Error('Server request did not return a registered key.');

  return modelKey;
}

function pushModel(dirName,modelName,key) {
  for (var k in modelFiles) {
    var file = modelFiles[k].replace(/\%/g,modelName);
    s3.gzipAndPush(path.join(dirName,modelName,file),path.join(key,'model',file));
  }
}

exports.main = function() {
  if (process.argv.length == 4) {
    var dirName = process.argv[3]

    // Select model to import
    var dir = fs.readdir(dirName);
    for (var k in dir) console.log((+k+1)+': '+dir[k]);
    var choice = prompt('Select a model from the list above: ');
    if (isNaN(choice) || choice < 0 || choice > dir.length) {
      console.log('Please select a number.');
      process.exit();
    }

    // Confirm model
    var modelName = dir[choice-1];
    var confirm = prompt('Confirm import: '+modelName+'? (y/n)');
    if (confirm != 'y') {
      console.log('Ok bye!');
      process.exit();
    }

    var modelDirName = path.join(dirName,modelName);
    var modelDir = fs.readdir(modelDirName);

    // Check basic files
    checkCTLFiles(dirName,modelName,modelDir);
    checkFITFile(dirName,modelName,modelDir);

    // Register the new model
    var key = registerModel(dirName,modelName);

    // Filter the csv based on the data
    checkCSV(dirName,modelName,modelDir);
    filterCSV(dirName,modelName,modelDir);

    // Push the model to s3 (sans the actual base model file)
    fs.writeFile(path.join(dirName,modelName,modelName+'.base.txt'),'1000000');
    pushModel(dirName,modelName,key);
    console.log('Waiting 5 seconds...');
    sleep(5000);

    // Compute the base model
    computeBaseModel(dirName,modelName,key);

    // Push the final model to s3
    pushModel(dirName,modelName,key);

    console.log('done');
  } else console.log('USAGE: import originalModelsDir');
}

