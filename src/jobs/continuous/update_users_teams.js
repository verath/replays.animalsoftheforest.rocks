const Promise = require("bluebird");
const request = require('request-promise');
const requestErrors = require('request-promise/errors');
const constants = require('../../config/constants');
const SteamUtils = require('../../utils/steam-utils');
const JobHelper = require('../job-helper');

const RUN_INTERVAL = 12 * 60 * 60 * 1000; // Run every 12th hour
const REQUEST_DELAY = 1000; // Delay between requests to the steam api
const PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";
const TEAM_INFO_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetTeamInfoByTeamID/v0001/";


function run() {
    console.log("Running job");

    if (JobHelper.shouldShutdown()) {
        console.log("Detected shutdown request, stopping");
        return;
    }

    const db = JobHelper.createMongooseConnection();
    const User = db.model('User');
    const Team = db.model('Team');

    function updateUser(user) {
        console.log("Updating user with steamId:", user.steam_id);

        const reqOptions = {
            uri: PLAYER_SUMMARIES_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                steamids: user.steam_id
            },
            json: true
        };

        return request(reqOptions).then((res) => {
            const playerData = res["response"]["players"][0];
            user.steam_persona_name = playerData["personaname"];
            user.steam_profile_url = playerData["profileurl"];
            user.steam_avatar = playerData["avatar"];
            user.steam_avatar_medium = playerData["avatarmedium"];
            user.steam_avatar_full = playerData["avatarfull"];
            user.steam_real_name = playerData["realname"];

            return user.save();
        }).catch(requestErrors.StatusCodeError, (err) => {
            throw new Error(`Steam API responded with a ${err.statusCode} error code!`);
        });
    }

    function updateUsers(users) {
        if (users != null) {
            return users.reduce((fetchPromise, user) => {
                return fetchPromise.then(() => updateUser(user)).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    }

    function updateTeam(team) {
        console.log("Updating team with steam team id:", team.steam_team_id);

        const reqOptions = {
            uri: TEAM_INFO_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                start_at_team_id: team.steam_team_id,
                teams_requested: 1
            },
            json: true
        };

        return request(reqOptions).then((res) => {
            const teamData = res["result"]["teams"][0];
            team.steam_name = teamData["name"];
            team.steam_tag = teamData["tag"];
            team.steam_time_created = teamData["time_created"];
            team.steam_rating = teamData["rating"];
            team.steam_logo = teamData["logo"];
            team.steam_admin_account_id = SteamUtils.steamId32To64(teamData["admin_account_id"]);

            // Parse the "player_[i]_account_id" fields
            let accountId;
            let steamPlayerAccountIds = [];
            for (let i = 0; (accountId = teamData[`player_${i}_account_id`]); i++) {
                steamPlayerAccountIds.push(SteamUtils.steamId32To64(accountId));
            }
            team.steam_player_account_ids = steamPlayerAccountIds;

            return team.save();
        }).catch(requestErrors.StatusCodeError, (err) => {
            throw new Error(`Steam API responded with a ${err.statusCode} error code!`);
        });
    }

    function updateTeams(teams) {
        if (teams != null) {
            return teams.reduce((fetchPromise, team) => {
                return fetchPromise.then(() => updateTeam(team)).delay(REQUEST_DELAY);
            }, Promise.resolve())
        }
    }

    Promise.resolve(User.find({}).exec())
        .then(updateUsers)
        .catch((err) => {
            console.log("Error while updating users!");
            console.error(err)
        })
        .then(() => Promise.resolve(Team.find({}).exec()))
        .then(updateTeams)
        .catch((err) => {
            console.log("Error while updating teams!");
            console.error(err);
        })
        .finally(() => {
            db.close();
        })
        .then(() => {
            console.log("job finished");
            setTimeout(run, RUN_INTERVAL);
        });
}

run();