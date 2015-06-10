const Promise = require("bluebird");
const SteamUtils = require('../utils/steam-utils');

const BackgroundJob = require('./background-job');

const MATCH_HISTORY_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v0001/";

class UpdateMatches extends BackgroundJob {

    constructor() {
        super();

        this._teamSteamIds = [];
    }

    getTeamSteamIds() {
        return this.mongooseConnection.model('Team')
            .findAll()
            .each((team) => {
                this._teamSteamIds.push(team.steam_team_id);
            });
    }

    findAllUsers() {
        return this.mongooseConnection.model('User').findAll();
    }

    /**
     * Function for (recursively) fetching matches for an account until a specified match sequence number.
     * @param accountId The account to fetch matches for
     * @param untilMatchSeqNum The match seq num where to stop fetching.
     * @param [startAtId = -1] Match id to start fetching from
     */
    fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum, startAtId = -1) {
        const params = {account_id: accountId, start_at_match_id: startAtId, matches_requested: 10};
        return BackgroundJob.doSteamWebAPIRequest(MATCH_HISTORY_METHOD_URL, params)
            .then((res) => {
                if (res["result"]["num_results"] === 0) {
                    return [];
                } else {
                    const matches = res["result"]["matches"];
                    const lastMatch = matches.slice(-1)[0];
                    if (lastMatch["match_seq_num"] <= untilMatchSeqNum) {
                        return matches.filter((match) => match["match_seq_num"] > untilMatchSeqNum);
                    } else {
                        return this.fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum, (lastMatch["match_id"] - 1))
                            .then((nextMatches) => matches.concat(nextMatches));
                    }
                }
            })
            .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
    }


    shouldAddMatchToReplayQueue(match) {
        if (match.isSteamReplayExpired()) {
            return false;
        }
        if (!match.isRanked()) {
            return false;
        }
        if (match.replay_url) {
            return false;
        }
        // Only add matches with a tracked team in for now
        const teamsInMatch = this._teamSteamIds.filter((steamTeamId) => {
            return match.team_ids.indexOf(steamTeamId) !== -1
        });
        return teamsInMatch.length > 0;
    }

    insertMatchIfNotExist(matchData) {
        const Match = this.mongooseConnection.model('Match');
        const match = new Match({
            team_ids: [matchData["dire_team_id"], matchData["radiant_team_id"]],
            steam_match_id: matchData["match_id"],
            steam_match_seq_num: matchData["match_seq_num"],
            steam_start_time: matchData["start_time"],
            steam_lobby_type: matchData["lobby_type"],
            steam_radiant_team_id: matchData["radiant_team_id"],
            steam_dire_team_id: matchData["dire_team_id"]
        });

        matchData["players"].forEach((player) => {
            match.steam_players.push({
                account_id: SteamUtils.steamId32To64(player["account_id"]),
                player_slot: player["player_slot"],
                hero_id: player["hero_id"]
            })
        });

        if (this.shouldAddMatchToReplayQueue(match)) {
            match.replay_fetch_status = "Started";
        }

        return Promise.resolve(match.save())
            .then((storedMatch) => {
                if (this.shouldAddMatchToReplayQueue(storedMatch)) {
                    return this.queueService.createMessageAsync(BackgroundJob.QUEUE_MATCH_REPLAYS_NAME, storedMatch.id)
                }
            }, (err) => {
                if (err.code !== 11000) { // Catch DuplicateKey error (match already exist)
                    throw err;
                }
            });
    }

    fetchMatchesForUser(user) {
        const accountId = SteamUtils.steamId64To32(user.steam_id);
        const userName = user.steam_persona_name;
        const latestMatchSeqNum = user.latest_match_seq_num;

        console.log(`Fetching matches for user: ${userName} (${accountId}). Latest match seqNum: ${latestMatchSeqNum}`);

        let newestMatchSeqNum = latestMatchSeqNum;
        return this.fetchMatchesUntilMatchSeqNum(accountId, latestMatchSeqNum)
            .then((matches) => {
                if (matches.length > 0) {
                    newestMatchSeqNum = matches[0]["match_seq_num"];
                    console.log(`Found ${matches.length} new match(es) for player.`);
                }
                return matches;
            })
            .map((matchData) => this.insertMatchIfNotExist(matchData))
            .then(() => {
                user.latest_match_seq_num = newestMatchSeqNum;
                return Promise.resolve(user.save());
            });
    }

    updateMatches() {
        return this.findAllUsers().then((users) => {
            if (users != null) {
                return users.reduce((fetchPromise, user) => {
                    return fetchPromise
                        .then(() => this.fetchMatchesForUser(user))
                        .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
                }, Promise.resolve());
            }
        });
    }

    run() {
        this.getTeamSteamIds()
            .then(() => this.updateMatches())
            .finally(() => this.closeMongooseConnection());
    }
}

new UpdateMatches().run();
