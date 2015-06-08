const Promise = require("bluebird");

const SteamUtils = require('../utils/steam-utils');
const BackgroundJob = require('./background-job');

const TEAM_INFO_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetTeamInfoByTeamID/v0001/";

class UpdateTeams extends BackgroundJob {

    findAllTeams() {
        const Team = this.mongooseConnection.model('Team');
        const teamsPromise = Team.find({}).exec();
        return Promise.resolve(teamsPromise);
    }

    updateTeam(team) {
        console.log(`Updating team ${team.steam_name} (${team.steam_team_id})`);

        const params = {start_at_team_id: team.steam_team_id, teams_requested: 1};
        return BackgroundJob.doSteamWebAPIRequest(TEAM_INFO_METHOD_URL, params).then((res) => {
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

            const savePromise = team.save();
            return Promise.resolve(savePromise);
        });
    }

    updateAllTeams() {
        return this.findAllTeams().then((teams) => {
            if (teams != null) {
                return teams.reduce((fetchPromise, team) => {
                    return fetchPromise
                        .then(() => this.updateTeam(team))
                        .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
                }, Promise.resolve())
            }
        });
    }

    run() {
        this.updateAllTeams().finally(() => {
            this.closeMongooseConnection();
        });
    }
}

new UpdateTeams().run();
