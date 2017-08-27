
var http = require('fusion/http');

exports.getJob = function() {
  console.log('running');
  var res = http.post('http://localhost:3000/getJob',{
    testArg: 5,
  });
  console.log(res);
}

