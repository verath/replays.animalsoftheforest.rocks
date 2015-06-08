const fs = require('fs');
const mongoose = require('mongoose');
const request = require('request-promise');
const requestErrors = require('request-promise/errors');

const constants = require('../config/constants');

/**
 * A class representing a background job.
 */
class BackgroundJob {

    constructor() {
        this._mongooseConnection = null;
    }

    /**
     * Creates a new mongoose connection and registers all models on the connection.
     * @returns {Connection}
     * @private
     */
    static _createMongooseConnection() {
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

    static doSteamWebAPIRequest(URL, params) {
        params.key = constants.STEAM_WEB_API_KEY;
        const requestPromise = request({uri: URL, qs: params, json: true});
        return requestPromise.catch(requestErrors.StatusCodeError, (err) => {
            throw new Error(`Steam API responded with a ${err.statusCode} error code!`);
        });
    }

    openMongooseConnection() {
        if (!this._mongooseConnection) {
            this._mongooseConnection = BackgroundJob._createMongooseConnection();
        }
    }

    closeMongooseConnection() {
        if (this._mongooseConnection) {
            this._mongooseConnection.close();
            this._mongooseConnection = null;
        }
    }

    get mongooseConnection() {
        this.openMongooseConnection();
        return this._mongooseConnection;
    }


    run() {
        throw new Error("#run must be implemented in subclass!");
    }
}

/**
 * The number of milliseconds that must elapse between two calls to the steam web API.
 * @const
 * @type {number}
 */
BackgroundJob.STEAM_API_REQUEST_DELAY = 1000;

module.exports = BackgroundJob;
