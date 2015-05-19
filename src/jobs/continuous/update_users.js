require("babel/polyfill");

const Promise = require("bluebird");
const request = require('request-promise');
const constants = require('../../config/constants');
const JobHelper = require('../job-helper');

const RUN_INTERVAL = 12 * 60 * 60 * 1000; // Run every 12th hour
const REQUEST_DELAY = 1000; // Delay between requests to the steam api
const PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

function run() {
    console.log("Running update_users");

    const db = JobHelper.createMongooseConnection();
    const User = db.model('User');

    const updateUser = (user) => {
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
            console.log("Fetched user data successfully");

            const playerData = res["response"]["players"][0];
            user.steam_persona_name = playerData["personaname"];
            user.steam_profile_url = playerData["profileurl"];
            user.steam_avatar = playerData["avatar"];
            user.steam_avatar_medium = playerData["avatarmedium"];
            user.steam_avatar_full = playerData["avatarfull"];
            user.steam_real_name = playerData["realname"];

            return user.save();
        }, (err) => {
            console.log("Error fetching data!");
            console.error(err);
        });
    };

    const updateUsers = (users) => {
        if (users != null) {
            return users.reduce((fetchPromise, user) => {
                return fetchPromise.then(() => updateUser(user)).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    };

    User.find({}).exec()
        .then(updateUsers)
        .then(null, (err) => {
            console.log("Error while updating users!");
            console.error(err)
        })
        .then(() => {
            db.close();
            console.log("update_users finished");
        })
        .then(() => {
            setTimeout(run, RUN_INTERVAL);
        });
}

run();