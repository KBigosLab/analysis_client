
var apiAuth = require('analysis/apiAuth');

function Roles(parent) {
  this.$P = parent;
  if (parent.verb == 'get')
    this.msgSuffix = 'view this page';
  else this.msgSuffix = 'perform this action';
}

Roles.prototype.login = function(msg) {
  var $P = this.$P;
  var msg = 'We\'re sorry, but it looks like you do not have sufficient privileges for this action.';
  $P.assert(apiAuth.authorize($P,Const.inboundSecretKey),new Error(msg));
}

module.exports = Roles;

