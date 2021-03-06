const Promise = require("bluebird");

const BackgroundJob = require('./background-job');

const PLAYER_SUMMARIES_METHOD_URL = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/";

class UpdateUsers extends BackgroundJob {

    findAllUsers() {
        return this.mongooseConnection.model('User').findAll();
    }

    updateUser(user) {
        console.log(`Updating user ${user.steam_persona_name} (${user.steam_id})`);

        const params = {steamids: user.steam_id};
        return BackgroundJob.doSteamWebAPIRequest(PLAYER_SUMMARIES_METHOD_URL, params).then((res) => {
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

    updateAllUsers() {
        return this.findAllUsers().then((users) => {
            if (users != null) {
                return users.reduce((fetchPromise, user) => {
                    return fetchPromise
                        .then(() => this.updateUser(user))
                        .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
                }, Promise.resolve());
            }
        });
    }

    run() {
        this.updateAllUsers().finally(() => {
            this.closeMongooseConnection();
        });
    }
}

new UpdateUsers().run();
