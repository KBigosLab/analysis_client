
var keygen = require('analysis/keygen');
var signature = require('cookie-signature');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

exports.cookieParser = null;
exports.sessionStore = null;

var mobileSessions = function(req, res, next) {
  if ('cookie' in req.query) {
    var val = signature.unsign(req.query.cookie,Const.cookieSecret);
    if (val) {
      if ('cookie' in req.headers) {
        var hasCookie = false;
        var cookies = req.headers.cookie.split(';');
        for (var k in cookies) {
          if (cookies[k].trim().search('connect.sid') == 0) {
            cookies[k] = 'connect.sid=s%3A'+encodeURIComponent(req.query.cookie);
            hasCookie = true;
          }
          else cookies[k] = cookies[k].trim();
        }
      } else cookies = ['connect.sid=s%3A'+encodeURIComponent(req.query.cookie)];
      if (!hasCookie) cookies.push('connect.sid=s%3A'+encodeURIComponent(req.query.cookie));
      req.headers.cookie = cookies.join('; ');

      // Make sure that this session id is used
      req.regenerateSessionID = val;
    }
  }
  next();
  return;
}

exports.configure = function(express,app) {
  if (live) {
    var RedisStore = require('connect-redis')(expressSession);
    console.log('loading redis');
    app.use(mobileSessions);
    exports.cookieParser = cookieParser();
    app.use(exports.cookieParser);
    exports.sessionStore = new RedisStore;
    app.use(expressSession({ store: exports.sessionStore, secret: Const.cookieSecret }));
  } else {
    // Session support
    app.use(mobileSessions);
    exports.cookieParser = cookieParser(Const.cookieSecret);
    app.use(exports.cookieParser);
    exports.sessionStore = new expressSession.MemoryStore;
    app.use(expressSession({store: exports.sessionStore} ));
  }

  // We modify the session store here so that if a properly signed cookie is
  // passed that does not exist, it will be restored with a session containing
  // the exact same session id
  exports.sessionStore.generate = function(req) {
    if (!req.regenerateSessionID)
      req.sessionID = keygen.uid(24)
    else req.sessionID = req.regenerateSessionID;
    req.session = new expressSession.Session(req);
    req.session.cookie = new expressSession.Cookie({});
  };
}

