'use strict';

var mongoose = require('mongoose');
var SteamStrategy = require('passport-steam').Strategy;
var constants = require('./constants');

var User = mongoose.model('User');

module.exports = function (passport) {
    // Serialize to sessions by storing the user id
    passport.serializeUser(function (user, done) {
        return done(null, user.id);
    });

    // Deserialize by lookup from database
    passport.deserializeUser(function (id, done) {
        User.findOne({ _id: id }).exec(done);
    });

    passport.use(new SteamStrategy({
        profile: false,
        returnURL: constants.SITE_URL + 'auth/steam/return',
        realm: constants.SITE_URL,
        apiKey: constants.STEAM_WEB_API_KEY
    }, function (identifier, profile, done) {
        // Validate and extract steam 64 bit id
        var idMatch = identifier.match(/.*?\/(\d+)$/);
        if (idMatch == null) {
            done(new Error('Invalid identifier'));
        }

        var steamId = idMatch[1];
        User.findOne({ steam_id: steamId }).exec().then(function (user) {
            if (user == null) {
                done(null, false, { message: 'User not found.' });
            } else {
                done(null, user);
            }
        }, function (err) {
            return done(err);
        });
    }));
};