class SteamUtils {
    static steamId32To64(steamId32) {
        return '765' + (parseInt(steamId32, 10) + 61197960265728);
    }

    static steamId64To32(steamId64) {
        return parseInt(steamId64.substr(3), 10) - 61197960265728 + "";
    }
}

module.exports = SteamUtils;