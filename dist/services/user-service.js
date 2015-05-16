'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Promise = require('bluebird');

var User = require('../models/user');

var USER_TABLE = 'users';

var UserService = (function () {
    function UserService(tableService) {
        _classCallCheck(this, UserService);

        this.createTableIfNotExistsAsync = Promise.promisify(tableService.createTableIfNotExists, tableService);
        this.retrieveEntityAsync = Promise.promisify(tableService.retrieveEntity, tableService);
    }

    _createClass(UserService, [{
        key: 'serializeUser',
        value: function serializeUser(user, done) {
            var userEntity = user.entity;
            done(null, {
                PartitionKey: userEntity.PartitionKey['_'],
                RowKey: userEntity.RowKey['_']
            });
        }
    }, {
        key: 'deserializeUser',
        value: function deserializeUser(obj, done) {
            var partitionKey = obj.PartitionKey;
            var rowKey = obj.RowKey;
            this.getUserByIdAsync(partitionKey, rowKey).then(function (user) {
                if (user == null) {
                    done(null, new Error('Could deserialize user, user not found in table.'));
                } else {
                    done(null, user);
                }
            }, function (err) {
                return done(err);
            });
        }
    }, {
        key: 'validate',
        value: function validate(identifier, profile, done) {
            var idMatch = identifier.match(/.*?\/(\d+)$/);
            if (idMatch == null) {
                done(new Error('Invalid identifier'));
            } else {
                var steamId = idMatch[1];
                this.getUserByIdAsync('users_default_partition', steamId).then(function (user) {
                    if (user == null) {
                        done(null, false, { message: 'User not found.' });
                    } else {
                        done(null, user);
                    }
                }, function (err) {
                    return done(err);
                });
            }
        }
    }, {
        key: 'getUserByIdAsync',
        value: function getUserByIdAsync(partitionKey, steamId) {
            var _this = this;

            return this.createTableIfNotExistsAsync(USER_TABLE).then(function () {
                return _this.retrieveEntityAsync(USER_TABLE, partitionKey, steamId);
            }).spread(function (result) {
                return new User(result);
            })['catch'](function (err) {
                if (err.statusCode && err.statusCode === 404) {
                    return null;
                } else {
                    return err;
                }
            });
        }
    }]);

    return UserService;
})();

module.exports = UserService;