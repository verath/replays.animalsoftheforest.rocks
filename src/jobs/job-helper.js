const fs = require('fs');
const mongoose = require('mongoose');

const constants = require('../config/constants');

class JobHelper {
    static createMongooseConnection() {
        const connection = mongoose.createConnection(constants.MONGODB_CONNECTION_STRING);
        connection.on('error', console.error.bind(console));

        // Setup mongoose models for the connection
        fs.readdirSync(__dirname + '/../models').forEach(function (file) {
            if (file.indexOf('.js') > -1) {
                require(__dirname + '/../models/' + file)(connection);
            }
        });

        return connection;
    }
}

module.exports = JobHelper;