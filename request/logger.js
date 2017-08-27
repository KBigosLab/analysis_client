
var fs = require('fs');
var onFinished = require('on-finished');
var onHeaders = require('on-headers');

function recordStartTime () {
  this._startAt = process.hrtime()
  this._startTime = new Date()
}

function getip (req) {
  return req.ip ||
    req._remoteAddress ||
    (req.connection && req.connection.remoteAddress) ||
    undefined
}

function getResponseTime(req,res,digits) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return
  }

  // calculate diff
  var ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits)
}

module.exports = function(options) {
  var moment, parse, url;
  if (options == null) {
    options = {};
  }
  url = require('url');
  moment = require('moment');
  options.date || (options.date = 'YY.MM.DD HH:mm:ss');
  options.format || (options.format = '%method %status %url %time - %size - %date');
  parse = function(req, res, format) {
    var status = res._header ? res.statusCode : '-';
    var statusColor;
    statusColor = (function() {
      switch (true) {
        case 500 <= status:
          return '\x1b[31m';
        case 400 <= status:
          return '\x1b[33m';
        case 300 <= status:
          return '\x1b[36m';
        case 200 <= status:
          return '\x1b[32m';
        default: return '';
      }
    })();

    return {
      method: req.method.toUpperCase(),
      status: status,
      statusColor: statusColor,
      url: req.originalUrl || req.url,
      ip: req._remoteAddress,
      time: getResponseTime(req,res) || '-',
      size: (res._headers['content-length'] || '-'),
      timestamp: moment().format(options.date),
    }
  }

  return function(req, res, next) {

    // request data
    req._startAt = undefined;
    req._startTime = undefined;
    req._remoteAddress = getip(req);

    // response data
    res._startAt = undefined;
    res._startTime = undefined;

    // record request start
    recordStartTime.call(req);

    // record response start
    onHeaders(res, recordStartTime);

    // log when response finished
    onFinished(res, logRequest);

    function logRequest () {

      var e = parse(req, res, options.format);

      if (Const.requestLog) {
        fs.appendFile(Const.requestLog,[
          options.id || '',
          e.method,
          e.status,
          e.url,
          e.time,
          e.size,
          e.timestamp,
          e.ip,
        ].join(',')+'\n');
      }

      var output = [
        e.method,
        options.useColor ? e.statusColor + e.status + "\x1b[0m" : e.status,
        e.url,
        e.time+' ms',
        '- '+e.size,
        options.useColor ? "- \x1b[90m" + e.timestamp + "\x1b[0m" : e.timestamp,
      ].join(' ');

      return process.nextTick(function() {
        return process.stdout.write(output+'\n');
      });
    };

    return next();
  };
};
