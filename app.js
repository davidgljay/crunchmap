
/**
 * Module dependencies.
 */



var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var tags = require('./routes/tag')
var http = require('http');
var path = require('path');

var app = express();

if ('development' == app.get('env')) {
	var config = require('./config.js');
	config.setup();
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use( express.cookieParser() );
app.use(express.bodyParser());
app.use(express.session({ secret: process.env.SESSION_SECRET }));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/tags/:name', tags.map)


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
