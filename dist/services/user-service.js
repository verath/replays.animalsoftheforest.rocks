"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Promise = require("bluebird");

var USER_TABLE = "users";

var UserService = (function () {
    function UserService(tableService) {
        _classCallCheck(this, UserService);

        this.createTableIfNotExistsAsync = Promise.promisify(tableService.createTableIfNotExists, tableService);
        this.retrieveEntityAsync = Promise.promisify(tableService.retrieveEntity, tableService);
    }

    _createClass(UserService, [{
        key: "validate",
        value: function validate(identifier, profile, done) {
            var _this = this;

            var idMatch = identifier.match(/.*?\/(\d+)$/);
            if (idMatch == null) {
                done(new Error("Invalid identifier"));
            } else {
                (function () {
                    var steamId = idMatch[1];
                    _this.validateUserBySteamIdAsync(steamId).then(function (dbUser) {
                        if (dbUser == null) {
                            done(null, false, { message: "User not found." });
                        } else {
                            var user = { steamId: steamId };
                            done(null, user);
                        }
                    }, function (err) {
                        return done(err);
                    });
                })();
            }
        }
    }, {
        key: "validateUserBySteamIdAsync",
        value: function validateUserBySteamIdAsync(steamId) {
            var _this2 = this;

            return this.createTableIfNotExistsAsync(USER_TABLE).then(function () {
                return _this2.retrieveEntityAsync(USER_TABLE, "users_default_partition", steamId);
            })["catch"](function (err) {
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