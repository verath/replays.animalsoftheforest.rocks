require("babel/polyfill");

const Promise = require("bluebird");
const request = require('request-promise');
const constants = require('../../config/constants');
const SteamUtils = require('../../utils/steam-utils');
const JobHelper = require('../job-helper');

const RUN_INTERVAL = 60 * 60 * 1000; // Run every hour
const REQUEST_DELAY = 1000; // Delay between requests to the steam api
const MATCH_HISTORY_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v0001/";

function run() {
    console.log("Running update_matches");

    const db = JobHelper.createMongooseConnection();
    const User = db.model('User');
    const Team = db.model('Team');
    const Match = db.model('Match');


    const insertMatchIfNotExist = (matchData) => {
        const matchId = matchData["match_id"];
        return Match.count({steam_match_id: matchId}).then((count) => {
            if (count === 0) {
                // No match currently exist, create a new one
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

                return match.save();
            }
        })
    };

    /**
     * Function for (recursively) fetching match ids for an account until a a match id.
     * @param accountId The account to fetch matches for
     * @param untilMatchId The match id where to stop fetching.
     * @param [startAtId = -1] Match id to start fetching from
     */
    const fetchMatchesUntilMatchId = (accountId, untilMatchId, startAtId = -1) => {
        const reqOptions = {
            uri: MATCH_HISTORY_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                account_id: accountId,
                start_at_match_id: startAtId
            },
            json: true
        };
        return request(reqOptions).then((res) => {
            const numResults = res["result"]["num_results"];
            if (numResults == 0) {
                return [];
            } else {
                const matches = res["result"]["matches"];
                const lastMatchId = matches.slice(-1)[0]["match_id"];
                if (lastMatchId <= untilMatchId) {
                    return matches.filter((match) => match["match_id"] > untilMatchId);
                } else {
                    const nextMatchesReq = fetchMatchesUntilMatchId(accountId, untilMatchId, (lastMatchId - 1));
                    return nextMatchesReq.then((nextMatches) => matches.concat(nextMatches));
                }
            }
        }).delay(REQUEST_DELAY);
    };

    const fetchMatchesForUser = (user) => {
        const accountId = SteamUtils.steamId64To32(user.steam_id);
        const latestMatchId = 0//user.latest_match_id;

        console.log(`Fetching matches for user: ${accountId}. Latest match id: ${latestMatchId}`);

        let newestMatchId = latestMatchId;
        return fetchMatchesUntilMatchId(accountId, latestMatchId).then((matches) => {
            if (matches.length > 0) {
                newestMatchId = matches[0]["match_id"];
            }
            return matches;
        }).map((matchData) => {
            return insertMatchIfNotExist(matchData)
        }).then(() => {
            user.latest_match_id = newestMatchId;
            return user.save();
        })
    };

    const fetchMatchesForUsers = (users) => {
        if (users != null) {
            return users.reduce((fetchPromise, user) => {
                return fetchPromise.then(() => fetchMatchesForUser(user)).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    };

    User.find({}).exec()
        .then(fetchMatchesForUsers)
        .then(null, (err) => {
            console.log("Error while updating matches for users!");
            console.error(err)
        })
        .then(() => {
            db.close();
            console.log("update_matches finished");
        })
        .then(() => {
            setTimeout(run, RUN_INTERVAL);
        });
}

run();