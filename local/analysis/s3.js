
var s3 = require('fusion/s3');
var Shell = require('fusion/Shell');
var path = require('path');

exports.gzipAndPush = function(srcFilename,destFilename,options) {
  var shell = new Shell();

  options = options || {};

  shell.cd(path.dirname(srcFilename));
  var ext = path.extname(srcFilename);
  var srcName = path.basename(srcFilename,ext);
  shell.script(
    'cp ? ?',[srcName+ext,srcName+'.min'+ext],
    'gzip -9 ?',[srcName+'.min'+ext]
  );

  // Push the source to s3
  console.log('Uploading to '+destFilename);
  options.ContentType = options.ContentType || 'text/plain';
  options.ContentEncoding = 'gzip';
  s3.put(Const.AWSBucket,path.join(shell.pwd,srcName+'.min'+ext+'.gz'),destFilename,options);

  shell.run('rm ?',[srcName+'.min'+ext+'.gz']);
}

