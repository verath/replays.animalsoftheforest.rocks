'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var fs = require('fs');
var mongoose = require('mongoose');

var constants = require('../config/constants');

var JobHelper = (function () {
    function JobHelper() {
        _classCallCheck(this, JobHelper);
    }

    _createClass(JobHelper, null, [{
        key: 'createMongooseConnection',
        value: function createMongooseConnection() {
            var connection = mongoose.createConnection(constants.MONGODB_CONNECTION_STRING);
            connection.on('error', console.error.bind(console));

            // Setup mongoose models for the connection
            fs.readdirSync(__dirname + '/../models').forEach(function (file) {
                if (file.indexOf('.js') > -1) {
                    require(__dirname + '/../models/' + file)(connection);
                }
            });

            return connection;
        }
    }]);

    return JobHelper;
})();

module.exports = JobHelper;