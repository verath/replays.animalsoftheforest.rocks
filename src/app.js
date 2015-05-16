require("babel/polyfill");

const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const azureStorage = require('azure-storage');

const constants = require('./config/constants');
const PassportInitializer = require('./util/passport-initializer');
const UserService = require('./services/user-service');

let tableService = azureStorage.createTableService();
let userService = new UserService(tableService);

// Setup passport
PassportInitializer.initialize(passport, userService);

var app = express();

// View engine
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Global middleware
app.use(session({
    secret: constants.COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    // TODO: should be set to https only
    cookie: {secure: false}
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', require('./routes'));

// 404 handler
app.use((req, res, next) => {
    res.status(404);

    const preferredContentType = req.accepts(['json', 'html']);
    if (req.xhr || preferredContentType === 'json') {
        res.send({error: 'Not found'});
    } else {
        res.render('errors/404', {url: req.url});
    }
});

// Error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);

    console.error("Caught an error in global error handler!");
    console.error(err);

    const preferredContentType = req.accepts(['json', 'html']);
    if (req.xhr || preferredContentType === 'json') {
        res.status(500).send({error: 'Uh Oh, something gone wrong!'});
    } else {
        res.render('errors/500', {error: err});
    }
});

app.listen(constants.PORT);