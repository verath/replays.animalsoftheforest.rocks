"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SteamUtils = (function () {
    function SteamUtils() {
        _classCallCheck(this, SteamUtils);
    }

    _createClass(SteamUtils, null, [{
        key: "steamId32To64",
        value: function steamId32To64(steamId32) {
            return "765" + (parseInt(steamId32, 10) + 61197960265728);
        }
    }, {
        key: "steamId64To32",
        value: function steamId64To32(steamId64) {
            return parseInt(steamId64.substr(3), 10) - 61197960265728 + "";
        }
    }]);

    return SteamUtils;
})();

module.exports = SteamUtils;