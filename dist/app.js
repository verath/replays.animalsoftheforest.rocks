'use strict';

require('babel/polyfill');

var fs = require('fs');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport');

var constants = require('./config/constants');

// Create the express app
var app = express();

// Connect to mongodb
var connect = function connect() {
    var options = { server: { socketOptions: { keepAlive: 1 } } };
    mongoose.connect(constants.MONGODB_CONNECTION_STRING, options);
};
connect();

// Mongodb error handling
mongoose.connection.on('error', console.log.bind(console));
mongoose.connection.on('disconnected', connect);

// Setup mongoose models
fs.readdirSync(__dirname + '/models').forEach(function (file) {
    if (file.indexOf('.js') > -1) {
        require(__dirname + '/models/' + file);
    }
});

// Passport config
require('./config/passport')(passport);

// Express application config
require('./config/express')(app, passport);

// Route config
var routes = require('./routes')(passport);
app.use('/', routes);

app.listen(constants.PORT);