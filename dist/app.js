'use strict';

var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport');

var constants = require('./config/constants');

// Create the express app
var app = express();

// Setup mongoose (mongoDB)
require('./config/mongoose')(mongoose, constants);

// Passport config
require('./config/passport')(passport);

// Express application config
require('./config/express')(app, passport, mongoose);

// Route config
var routes = require('./routes')(passport);
app.use('/', routes);

app.listen(constants.PORT);