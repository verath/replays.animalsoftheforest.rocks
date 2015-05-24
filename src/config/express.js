const exphbs = require('express-handlebars');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');

const constants = require('./constants');

module.exports = (app, passport, mongoose) => {
    // View engine
    const viewDir = __dirname + '/../views/';
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
        saveUninitialized: false,
        // TODO: should be set to https only
        cookie: {secure: false},
        store: new MongoStore({
            mongooseConnection: mongoose.connection
        })
    }));

    // flash messages
    app.use(flash());

    // Passport and passport sessions for auth
    app.use(passport.initialize());
    app.use(passport.session());

};