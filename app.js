"use strict";

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('cookie-session');
const routes = require('./routes');
const device = require('express-device');

const conf = require('./modules/config')();

const app = express();

app.set('conf', conf);
app.set('version', require('./package.json').version);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ limit: '1gb', extended: false }));
app.use(cookieParser());
app.use(session(conf.cookieSession));
app.use(device.capture());

app.use(require('./modules/setup'));
app.use(require('./modules/access'));
app.use(require('./modules/multilang')(app));
app.use(require('./modules/mongomng')(app));

app.use('/', routes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
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
	app.use((err, req, res, next) => {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
		next(err);
	});
}

module.exports = app;
