/* global module, __dirname, process, require */

var express = require('express')
,	fs = require('fs')
,	path = require('path')
,	favicon = require('serve-favicon')
,	logger = require('morgan')
,	cookieParser = require('cookie-parser')
,	bodyParser = require('body-parser')
,	session = require('cookie-session')
,	routes = require('./routes')
,	pmx = require('pmx')
,	confLocations = [
		'/etc/mongui',
		'/usr/local/etc/mongui',
		path.join(process.env.HOME, '.mongui'),
		path.join(process.env.PWD, 'mongui'),
		__dirname
	];

pmx.init();

var file;

confLocations.some(function(loc){
	loc += '/config.json';

	return !!(file = fs.existsSync(loc) && loc);
});

var conf = require(file);

console.info('Config file "%s" loaded', file);

var app = express();

app.set('conf', conf);
app.set('version', require('./package.json').version);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(logger('dev'));
//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session(conf.cookieSession));

app.use(require('./modules/setup'));
app.use(require('./modules/access'));
app.use(require('./modules/multilang')(app));
app.use(require('./modules/mongomng'));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
		next(err);
    });
}

// production error handler
// no stacktraces leaked to user
else {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
		next(err);
	});
}

app.use(pmx.expressErrorHandler());

module.exports = app;