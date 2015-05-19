'use strict';

var fs = require('fs');
var constants = require('./constants');

module.exports = function (mongoose) {
    var connect = function connect() {
        var options = { server: { socketOptions: { keepAlive: 1 } } };
        mongoose.connect(constants.MONGODB_CONNECTION_STRING, options);
    };
    connect();

    // Mongodb error handling
    mongoose.connection.on('error', console.error.bind(console));
    mongoose.connection.on('disconnected', connect);

    // Setup mongoose models
    fs.readdirSync(__dirname + '/../models').forEach(function (file) {
        if (file.indexOf('.js') > -1) {
            require(__dirname + '/../models/' + file)(mongoose.connection);
        }
    });
};