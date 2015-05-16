'use strict';

require('babel/polyfill');

var express = require('express');
var exphbs = require('express-handlebars');
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport');
var azureStorage = require('azure-storage');

var constants = require('./config/constants');
var PassportInitializer = require('./util/passport-initializer');
var UserService = require('./services/user-service');

var tableService = azureStorage.createTableService();
var userService = new UserService(tableService);

// Setup passport
PassportInitializer.initialize(passport, userService);

var app = express();

// View engine
var viewDir = __dirname + '/views/';
app.set('views', viewDir);
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    layoutsDir: viewDir + 'layouts/',
    partialsDir: viewDir + 'partials/'
}));
app.set('view engine', 'handlebars');

// Global middleware
app.use(session({
    secret: constants.COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    // TODO: should be set to https only
    cookie: { secure: false }
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', require('./routes'));

// 404 handler
app.use(function (req, res, next) {
    res.status(404);

    var preferredContentType = req.accepts(['json', 'html']);
    if (req.xhr || preferredContentType === 'json') {
        res.send({ error: 'Not found' });
    } else {
        res.render('errors/404', { url: req.url });
    }
});

// Error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);

    console.error('Caught an error in global error handler!');
    console.error(err);

    var preferredContentType = req.accepts(['json', 'html']);
    if (req.xhr || preferredContentType === 'json') {
        res.status(500).send({ error: 'Uh Oh, something gone wrong!' });
    } else {
        res.render('errors/500', { error: err });
    }
});

app.listen(constants.PORT);