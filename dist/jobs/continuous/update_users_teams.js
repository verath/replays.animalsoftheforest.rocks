"use strict";

require("babel/polyfill");

var Promise = require("bluebird");
var request = require("request-promise");
var requestErrors = require("request-promise/errors");
var constants = require("../../config/constants");
var SteamUtils = require("../../utils/steam-utils");
var JobHelper = require("../job-helper");

var RUN_INTERVAL = 12 * 60 * 60 * 1000; // Run every 12th hour
var REQUEST_DELAY = 1000; // Delay between requests to the steam api
var PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
var TEAM_INFO_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetTeamInfoByTeamID/v0001/";

function run() {
    console.log("Running update_users_and_teams");

    if (JobHelper.shouldShutdown()) {
        console.log("Detected shutdown request, stopping");
        return;
    }

    var db = JobHelper.createMongooseConnection();
    var User = db.model("User");
    var Team = db.model("Team");

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
        })["catch"](requestErrors.StatusCodeError, function (err) {
            throw new Error("Steam API responded with a " + err.statusCode + " error code!");
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

    var updateTeam = function updateTeam(team) {
        console.log("Updating team with steam team id:", team.steam_team_id);

        var reqOptions = {
            uri: TEAM_INFO_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                start_at_team_id: team.steam_team_id,
                teams_requested: 1
            },
            json: true
        };

        return request(reqOptions).then(function (res) {
            console.log("Fetched team data successfully");

            var teamData = res["result"]["teams"][0];
            team.steam_name = teamData["name"];
            team.steam_tag = teamData["tag"];
            team.steam_time_created = teamData["time_created"];
            team.steam_rating = teamData["rating"];
            team.steam_logo = teamData["logo"];
            team.steam_admin_account_id = SteamUtils.steamId32To64(teamData["admin_account_id"]);

            // Parse the "player_[i]_account_id" fields
            var accountId = undefined;
            var steamPlayerAccountIds = [];
            for (var i = 0; accountId = teamData["player_" + i + "_account_id"]; i++) {
                steamPlayerAccountIds.push(SteamUtils.steamId32To64(accountId));
            }
            team.steam_player_account_ids = steamPlayerAccountIds;

            return team.save();
        })["catch"](requestErrors.StatusCodeError, function (err) {
            throw new Error("Steam API responded with a " + err.statusCode + " error code!");
        });
    };

    var updateTeams = function updateTeams(teams) {
        if (teams != null) {
            return teams.reduce(function (fetchPromise, team) {
                return fetchPromise.then(function () {
                    return updateTeam(team);
                }).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    };

    User.find({}).exec().then(updateUsers).then(null, function (err) {
        console.log("Error while updating users!");
        console.error(err);
    }).then(function () {
        return Team.find({});
    }).then(updateTeams).then(null, function (err) {
        console.log("Error while updating teams!");
        console.error(err);
    }).then(function () {
        db.close();
        console.log("update_users_teams finished");
    }).then(function () {
        setTimeout(run, RUN_INTERVAL);
    });
}

run();