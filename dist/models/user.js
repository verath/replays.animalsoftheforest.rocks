/**
 * A wrapper around a user table entity, providing more sensible names
 */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var User = (function () {
    function User(userEntity) {
        _classCallCheck(this, User);

        this._entity = userEntity;
    }

    _createClass(User, [{
        key: 'entity',

        /**
         * Getter for the underlying entity this model is for.
         * @returns {*} The entity for this user
         */
        get: function () {
            return this._entity;
        }
    }, {
        key: 'id',

        /**
         * Returns the Id for this user.
         * @returns {String} The id for this user. This is the same as the 64-bit SteamId.
         */
        get: function () {
            return this._entity.RowKey['_'];
        }
    }, {
        key: 'permissionLevel',

        /**
         * Returns this user's permission level.
         * @returns {Number} The user's permission level.
         */
        get: function () {
            return this._entity.PermissionLevel['_'];
        }
    }]);

    return User;
})();

module.exports = User;