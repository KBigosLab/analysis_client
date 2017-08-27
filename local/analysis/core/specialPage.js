
// Special pages
exports.blockIE = function($P) {
  $P.render($P.views.blockIE);
}

exports.errorPage = function($P,errorMsg) {
  $P.exports.MID = 0;
  $P.name = 'error.js';
  $P.exports.errorMsg = errorMsg;
  $P.render();
}

