"use strict";

require("babel/polyfill");

var Promise = require("bluebird");
var request = require("request-promise");
var constants = require("../../config/constants");
var JobHelper = require("../job-helper");

var RUN_INTERVAL = 60 * 1000; // Run every 6th hour
var REQUEST_DELAY = 1000; // Delay between requests to the steam api
var PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

function run() {
    console.log("Running update_users");

    var db = JobHelper.createMongooseConnection();
    var User = db.model("User");

    var updateUser = function updateUser(user) {
        console.log("Updating user with steamId:", user.steam_id);

        var reqOptions = {
            uri: PLAYER_SUMMARIES_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                steamids: user.steam_id
            },
            json: true
        };

        return request(reqOptions).then(function (res) {
            console.log("Fetched user data successfully");

            var playerData = res["response"]["players"][0];
            user.steam_persona_name = playerData["personaname"];
            user.steam_profile_url = playerData["profileurl"];
            user.steam_avatar = playerData["avatar"];
            user.steam_avatar_medium = playerData["avatarmedium"];
            user.steam_avatar_full = playerData["avatarfull"];
            user.steam_real_name = playerData["realname"];

            return user.save();
        }, function (err) {
            console.log("Error fetching data!");
            console.error(err);
        });
    };

    var updateUsers = function updateUsers(users) {
        if (users != null) {
            return users.reduce(function (fetchPromise, user) {
                return fetchPromise.then(function () {
                    return updateUser(user);
                }).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    };

    User.find({}).exec().then(updateUsers).then(null, function (err) {
        console.log("Error while updating users!");
        console.error(err);
    }).then(function () {
        db.close();
        console.log("update_users finished");
    }).then(function () {
        setTimeout(run, RUN_INTERVAL);
    });
}

run();