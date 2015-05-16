'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var SteamStrategy = require('passport-steam').Strategy;

var constants = require('../config/constants');

var PassportInitializer = (function () {
    function PassportInitializer() {
        _classCallCheck(this, PassportInitializer);
    }

    _createClass(PassportInitializer, null, [{
        key: 'initialize',
        value: function initialize(passport, userService) {
            passport.serializeUser(userService.serializeUser.bind(userService));
            passport.deserializeUser(userService.deserializeUser.bind(userService));

            passport.use(new SteamStrategy({
                profile: false,
                returnURL: constants.SITE_URL + 'auth/steam/return',
                realm: constants.SITE_URL,
                apiKey: constants.STEAM_WEB_API_KEY
            }, userService.validate.bind(userService)));
        }
    }]);

    return PassportInitializer;
})();

module.exports = PassportInitializer;