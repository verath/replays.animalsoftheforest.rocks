'use strict';

var exphbs = require('express-handlebars');
var session = require('express-session');
var flash = require('connect-flash');

var constants = require('./constants');

module.exports = function (app, passport) {
    // View engine
    var viewDir = __dirname + '/../views/';
    app.set('views', viewDir);
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: viewDir + 'layouts/',
        partialsDir: viewDir + 'partials/'
    }));
    app.set('view engine', 'handlebars');

    // Session cookies support
    app.use(session({
        secret: constants.COOKIE_SECRET,
        resave: false,
        saveUninitialized: true,
        // TODO: should be set to https only
        cookie: { secure: false }
    }));

    // flash messages
    app.use(flash());

    // Passport and passport sessions for auth
    app.use(passport.initialize());
    app.use(passport.session());
};