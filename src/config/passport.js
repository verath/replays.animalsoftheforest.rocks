const mongoose = require('mongoose');
const SteamStrategy = require('passport-steam').Strategy;
const constants = require('./constants');

const User = mongoose.model('User');

module.exports = (passport) => {
    // Serialize to sessions by storing the user id
    passport.serializeUser((user, done) => done(null, user.id));

    // Deserialize by lookup from database
    passport.deserializeUser((id, done) => {
        User.findOne({_id: id}).exec(done)
    });

    passport.use(new SteamStrategy({
            profile: false,
            returnURL: constants.SITE_URL + 'auth/steam/return',
            realm: constants.SITE_URL,
            apiKey: constants.STEAM_WEB_API_KEY
        }, (identifier, profile, done) => {
            // Validate and extract steam 64 bit id
            const idMatch = identifier.match(/.*?\/(\d+)$/);
            if (idMatch == null) {
                done(new Error("Invalid identifier"));
            }

            const steamId = idMatch[1];
            User.findOne({steam_id: steamId}).exec()
                .then((user) => {
                    if (user == null) {
                        done(null, false, {message: 'User not found.'})
                    } else {
                        done(null, user);
                    }
                }, (err) => done(err));
        }
    ));
};