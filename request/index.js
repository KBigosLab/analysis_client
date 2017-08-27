
var ua = require('ua-parser');
var signature = require('cookie-signature');
var sanitize = require('validator').sanitize;
var _url = require('url');

exports.handlePageError = function($P,e,args) {
  // Print the message to the console
  console.error('ERROR: '+e.message);
  console.error(e.stack);
  if (e.details) console.error(e.details);

  // Determine the message the user will see
  if (e.tellUser) {
    var errorObj = {error:{msg:e.message}};
  } else {
    var errorObj = {error:{msg:'Internal server error. It would be greatly appreciated if you report this as a bug.',type:'Internal'}};
    e.httpStatus = 500;
  }

  // Route the message based on whether this is a get or post request
  if ($P.verb == 'get')
    specialPage.errorPage($P,errorObj.error.msg)
  else {
    console.log(e.httpStatus);
    if (e.httpStatus)
      $P.res.status(e.httpStatus).send(errorObj)
    else $P.res.send(errorObj,400);
  }
}


exports.preSession = function($P) {
  // Set access control
  $P.res.header('Access-Control-Allow-Origin','*');
}

exports.loadSession = function($P,script) {
  // If we've made it this far, all is good and we can load the page
  return true;
}

exports.setupEnv = function($P) {
}

exports.checkLogin = function($P,script) {
  return true;
}

