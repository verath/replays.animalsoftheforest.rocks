const Promise = require("bluebird");

const SteamUtils = require('../utils/steam-utils');
const BackgroundJob = require('./background-job');

const PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

class UpdateUsers extends BackgroundJob {

    _findAllUsers() {
        const User = this._dbConnection.model('User');
        const usersPromise = User.find({}).exec();
        return Promise.resolve(usersPromise)
    }

    _updateUser(user) {
        console.log(`Updating user ${user.steam_persona_name} (${user.steam_id})`);

        const params = {steamids: user.steam_id};
        return BackgroundJob._doSteamWebAPIRequest(PLAYER_SUMMARIES_METHOD_URL, params).then((res) => {
            const playerData = res["response"]["players"][0];
            user.steam_persona_name = playerData["personaname"];
            user.steam_profile_url = playerData["profileurl"];
            user.steam_avatar = playerData["avatar"];
            user.steam_avatar_medium = playerData["avatarmedium"];
            user.steam_avatar_full = playerData["avatarfull"];
            user.steam_real_name = playerData["realname"];

            const savePromise = user.save();
            return Promise.resolve(savePromise);
        });
    }

    _updateAllUsers() {
        return this._findAllUsers().then((users) => {
            if (users != null) {
                return users.reduce((fetchPromise, user) => {
                    return fetchPromise
                        .then(() => this._updateUser(user))
                        .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
                }, Promise.resolve());
            }
        });
    }

    run() {
        this._updateAllUsers().finally(() => {
            this._dbConnection = null
        });
    }
}

new UpdateUsers().run();
