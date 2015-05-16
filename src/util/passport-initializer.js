const SteamStrategy = require('passport-steam').Strategy;

const constants = require('../config/constants');

class PassportInitializer {
    static initialize(passport, validateCallback) {
        passport.serializeUser((user, done) => done(null, user));
        passport.deserializeUser((obj, done) => done(null, obj));

        passport.use(new SteamStrategy({
            profile: false,
            returnURL: constants.SITE_URL + 'auth/steam/return',
            realm: constants.SITE_URL,
            apiKey: constants.STEAM_WEB_API_KEY,
            passReqToCallback: true
        }, validateCallback));
    }
}

module.exports = PassportInitializer;