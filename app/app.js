/**
 * Module dependencies.
 */

var express = require('express');
var when = require('when');
var http = require('http');
var path = require('path');
var _ = require('lodash');
var app = express();

app.set('allow seed', !!process.env.ALLOW_SEED);
app.set('allow cross origin', !!process.env.ALLOW_CROSS_ORIGIN);
app.set('enable coverage', !!process.env.ENABLE_COVERAGE);

if (app.get('enable coverage')) {
  var im = require('istanbul-middleware');
  im.hookLoader(__dirname);
  app.use('/api/coverage', im.createHandler({ verbose: true, resetOnGet: false }));
}

var skipMiddleware = require("./lib/skip_middleware");

app.Models = require('./models');
app.Controllers = require('./controllers');
app.Routes = require('./routes');

when(app)
  .then(app.Models.init)
  .then(app.Controllers.init)
  .then(skipMiddleware.init)
  .then(appConfig)
  .then(app.Routes.init)
  .then(appStart)
  .catch(function(err) {
    console.error(err.stack);
  });

function appConfig(app) {
  var AuthController = app.Controllers.AuthController;

  // all environments
  app.set('port', process.env.APP_PORT || 3000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(express.compress());
  app.use(express.favicon());
  app.use(function(req, res, next) {
    if (req.url == "/api/status") {
      return next();
    }
    express.logger('dev').apply(this, arguments);
  });
  app.use(express.bodyParser({limit: '105mb'}));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.cookieParser(process.env.COOKIE_SALT));
  app.use(express.session());
  app.use(express.static(path.join(__dirname, 'public')));

  if (app.get('allow cross origin')) {
    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,HEAD');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // intercept OPTIONS method
      if ('OPTIONS' == req.method) {
        res.send(200);
      }
      else {
        next();
      }
    });
  }

  app.useMiddleware(AuthController, 'authorize', {except: [
    '/api/status',
    '/api/session',
    '/api/change_password',
    '/api/forgot_password',
    '/api/sign_up',
    '/seed'
  ]});

  app.use(app.router);

  app.use(function(err, req, res, next) {
    console.error("---------\n", err, "---------\n");
    next(err);
  });

  app.use(express.errorHandler());

  return app;
}

function appStart() {
  http.createServer(app).listen(app.get('port'), function() {
    console.log('Bunsen server listening on port ' + app.get('port'));
  })
};
