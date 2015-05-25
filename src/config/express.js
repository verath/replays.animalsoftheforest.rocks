const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser')
const csurf = require('csurf');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');

const constants = require('./constants');

module.exports = (app, passport, mongoose) => {

    // Serve static files in /public in develop mode. In production this is done by Azure
    if (process.env['NODE_ENV'] !== 'production') {
        console.log('Not production, using express for serving static files.');
        app.use(express.static(__dirname + '/../../public'));
    }

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