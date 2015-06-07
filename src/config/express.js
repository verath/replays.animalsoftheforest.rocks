const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser')
const csurf = require('csurf');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const compression = require('compression')

const constants = require('./constants');

module.exports = (app, passport, mongoose) => {

    // deflate, gzip compression
    app.use(compression());

    // Serve static files in /public
    app.use(express.static(__dirname + '/../../public'));

    // View engine
    const viewDir = __dirname + '/../views/';
    app.set('views', viewDir);
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: viewDir + 'layouts/',
        partialsDir: viewDir + 'partials/'
    }));
    app.set('view engine', 'handlebars');

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    // Session cookies support
    app.use(session({
        secret: constants.COOKIE_SECRET,
        resave: false,
        saveUninitialized: false,
        // TODO: should be set to https only
        cookie: {secure: false},
        store: new MongoStore({
            mongooseConnection: mongoose.connection
        })
    }));

    // flash messages
    app.use(flash());

    // Anti-CSRF
    app.use(csurf());

    // Passport and passport sessions for auth
    app.use(passport.initialize());
    app.use(passport.session());

};