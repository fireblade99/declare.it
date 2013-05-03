
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , form = require('./routes/form')
  , http = require('http')
  , olinapps = require('olinapps')
  , sis = require('./routes/sis')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.set('host', 'localhost:3000');
  app.use(express.errorHandler());
});

app.configure('production', function () {
  // app.set('host', 'quotes.olinapps.com');
});

var loginRequired = function(){
  return function(req, res, next) {
    user = req.session.user;
    console.log("USER LOGIN REQUIRED", user);
      if (!user){

        res.redirect("/login");
      } else {
        console.log("USER LOGGED IN BITCHES!!!!");
        next();
      }
    }
}

app.get('/', loginRequired(), form.index);
app.get('/fakeData', form.fakeData);
app.get('/login', sis.login);
app.post('/login', sis.doLogin);


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});