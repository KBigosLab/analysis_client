
var CorePageModel = require('fusion/core/PageModel');

var extend = require('fusion/extend');

function PageModel($P,src) {
  this._$P = $P;
  this._src = src;

  var config = {
    name:$P.name,
  }
  for (var k in config) this[k] = config[k];
}
extend(PageModel,CorePageModel);

module.exports = PageModel;

