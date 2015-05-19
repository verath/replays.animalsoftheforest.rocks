"use strict";

require("babel/polyfill");

var Promise = require("bluebird");
var request = require("request-promise");
var constants = require("../../config/constants");
var JobHelper = require("../job-helper");

var PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

var db = JobHelper.createMongooseConnection();
var User = db.model("User");

var updateUser = function updateUser(user) {
    var reqOptions = {
        uri: PLAYER_SUMMARIES_METHOD_URL,
        qs: {
            key: constants.STEAM_WEB_API_KEY,
            steamids: user.steam_id
        },
        json: true
    };

    return request(reqOptions).then(function (res) {
        var playerData = res["response"]["players"][0];
        user.steam_persona_name = playerData["personaname"];
        user.steam_profile_url = playerData["profileurl"];
        user.steam_avatar = playerData["avatar"];
        user.steam_avatar_medium = playerData["avatarmedium"];
        user.steam_avatar_full = playerData["avatarfull"];
        user.steam_real_name = playerData["realname"];

        return user.save();
    });
};

var updateUsers = function updateUsers(users) {
    if (users != null) {
        return users.reduce(function (fetchPromise, user) {
            return fetchPromise.then(function () {
                return updateUser(user);
            });
        }, Promise.resolve());
    }
};

User.find({}).exec().then(updateUsers).then(null, function (err) {
    return console.error(err);
}).then(function () {
    return db.close();
});