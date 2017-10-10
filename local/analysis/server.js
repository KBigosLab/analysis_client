
var http = require('fusion/http');

exports.post = function(url,args) {
  var res = http.request({
    url: Const.analysisServer+url,
    method: 'POST',
    form: args,
    headers: {
      'Authorization': 'Basic '+(new Buffer(Const.apiSecretKey+':').toString("base64"))
    }
  });

  var statusCode = res.response.statusCode;
  if (res.body && (statusCode >= 200 && statusCode <= 300)) return JSON.parse(res.body)
  else return null;
}

