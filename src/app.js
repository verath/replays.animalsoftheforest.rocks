require("babel/polyfill");

const fs = require('fs');
const mongoose = require('mongoose');
const express = require('express');
const passport = require('passport');

const constants = require('./config/constants');

// Create the express app
const app = express();

// Connect to mongodb
var connect = function () {
    var options = {server: {socketOptions: {keepAlive: 1}}};
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
const routes = require('./routes')(passport);
app.use('/', routes);

app.listen(constants.PORT);