require("babel/polyfill");

const mongoose = require('mongoose');
const express = require('express');
const passport = require('passport');

const constants = require('./config/constants');

// Create the express app
const app = express();

// Setup mongoose (mongoDB)
require('./config/mongoose')(mongoose, constants);

// Passport config
require('./config/passport')(passport);

// Express application config
require('./config/express')(app, passport);

// Route config
const routes = require('./routes')(passport);
app.use('/', routes);

app.listen(constants.PORT);