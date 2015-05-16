"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _PERMISSION_LEVELS;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var PERMISSIONS_KEY_USER = Symbol("USER");
var PERMISSIONS_KEY_ADMIN = Symbol("ADMIN");
var PERMISSIONS_KEY_DEFAULT = PERMISSIONS_KEY_USER;

var PERMISSION_LEVELS = (_PERMISSION_LEVELS = {}, _defineProperty(_PERMISSION_LEVELS, PERMISSIONS_KEY_USER, 1), _defineProperty(_PERMISSION_LEVELS, PERMISSIONS_KEY_ADMIN, 2), _PERMISSION_LEVELS);

var AuthHelper = (function () {
    function AuthHelper() {
        _classCallCheck(this, AuthHelper);
    }

    _createClass(AuthHelper, null, [{
        key: "PERMISSIONS_USER",
        get: function () {
            return PERMISSIONS_KEY_USER;
        }
    }, {
        key: "PERMISSIONS_ADMIN",
        get: function () {
            return PERMISSIONS_KEY_ADMIN;
        }
    }, {
        key: "ensureAuthenticated",
        value: function ensureAuthenticated() {
            var requiredPermission = arguments[0] === undefined ? PERMISSIONS_KEY_DEFAULT : arguments[0];

            var requiredPermissionLevel = PERMISSION_LEVELS[requiredPermission];
            if (!requiredPermissionLevel) {
                throw new Error("Invalid requiredPermission!");
            }

            return function (req, res, next) {
                if (req.isAuthenticated()) {
                    var permissionLevel = req.user.permissionLevel || -1;
                    if (permissionLevel < requiredPermissionLevel) {
                        req.flash("error", "Permission denied!");
                    } else {
                        return next();
                    }
                } else {
                    req.flash("error", "Unauthenticated!");
                }
                res.redirect("/");
            };
        }
    }]);

    return AuthHelper;
})();

module.exports = AuthHelper;