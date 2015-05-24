const Promise = require("bluebird");
const request = require('request-promise');
const requestErrors = require('request-promise/errors');
const azureStorage = require('azure-storage');
const constants = require('../../config/constants');
const SteamUtils = require('../../utils/steam-utils');
const JobHelper = require('../job-helper');

const REPLAY_QUEUE_NAME = 'match-replays'; // Name of the queue to replay requests to
const RUN_INTERVAL = 60 * 60 * 1000; // Run every hour
const REQUEST_DELAY = 1000; // Delay between requests to the steam api
const MATCH_HISTORY_METHOD_URL = "http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v0001/";

function run() {
    console.log("Running update_matches");

    if (JobHelper.shouldShutdown()) {
        console.log("Detected shutdown request, stopping");
        return;
    }

    const queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    const db = JobHelper.createMongooseConnection();
    const User = db.model('User');
    const Team = db.model('Team');
    const Match = db.model('Match');

    let steamTeamIds = [];

    function shouldAddMatchToReplayQueue(match) {
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
        const teamsInMatch = steamTeamIds.filter((steamTeamId) => {
            return match.team_ids.indexOf(steamTeamId) !== -1
        });
        return teamsInMatch.length > 0;
    }

    function insertMatchIfNotExist(matchData) {
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

        if(shouldAddMatchToReplayQueue(match)) {
            match.replay_fetch_status = "Started";
        }

        return Promise.resolve(match.save())
            .then((storedMatch) => {
                if (shouldAddMatchToReplayQueue(storedMatch)) {
                    return queueSvc.createMessageAsync(REPLAY_QUEUE_NAME, storedMatch.id)
                }
            }, (err) => {
                if (err.code !== 11000) { // Catch DuplicateKey error (match already exist)
                    throw err;
                }
            });
    }

    /**
     * Function for (recursively) fetching match ids for an account until a a match id.
     * @param accountId The account to fetch matches for
     * @param untilMatchSeqNum The match seq num where to stop fetching.
     * @param [startAtId = -1] Match id to start fetching from
     */
    function fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum, startAtId = -1) {
        const reqOptions = {
            uri: MATCH_HISTORY_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                account_id: accountId,
                start_at_match_id: startAtId,
                matches_requested: 10
            },
            json: true
        };
        return request(reqOptions).then((res) => {
            const numResults = res["result"]["num_results"];
            if (numResults == 0) {
                return [];
            } else {
                const matches = res["result"]["matches"];
                const lastMatch = matches.slice(-1)[0];
                const lastMatchSeqNum = lastMatch["match_seq_num"];
                const lastMatchId = lastMatch["match_id"];
                if (lastMatchSeqNum <= untilMatchSeqNum) {
                    return matches.filter((match) => match["match_seq_num"] > untilMatchSeqNum);
                } else {
                    const nextMatchesReq = fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum, (lastMatchId - 1));
                    return nextMatchesReq.then((nextMatches) => matches.concat(nextMatches));
                }
            }
        }).catch(requestErrors.StatusCodeError, (err) => {
            throw new Error(`Steam API responded with a ${err.statusCode} error code!`);
        }).delay(REQUEST_DELAY);
    }

    function fetchMatchesForUser(user) {
        const accountId = SteamUtils.steamId64To32(user.steam_id);
        const userName = user.steam_persona_name;
        const latestMatchSeqNum = user.latest_match_seq_num;

        console.log(`Fetching matches for user: ${userName} (${accountId}). Latest match seqNum: ${latestMatchSeqNum}`);

        let newestMatchSeqNum = latestMatchSeqNum;
        return fetchMatchesUntilMatchSeqNum(accountId, latestMatchSeqNum).then((matches) => {
            if (matches.length > 0) {
                newestMatchSeqNum = matches[0]["match_seq_num"];
                console.log(`Found ${matches.length} new match(es) for player.`);
            }
            return matches;
        }).map((matchData) => {
            return insertMatchIfNotExist(matchData)
        }).then(() => {
            user.latest_match_seq_num = newestMatchSeqNum;
            return user.save();
        })
    }

    function fetchMatchesForUsers(users) {
        if (users != null) {
            return users.reduce((fetchPromise, user) => {
                return fetchPromise.then(() => fetchMatchesForUser(user)).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    }

    Promise.resolve(Team.find({}).exec())
        .each((team) => steamTeamIds.push(team))
        .then(() => Promise.resolve(User.find({}).exec()))
        .then(fetchMatchesForUsers)
        .catch((err) => {
            console.log("Error while updating matches for users!");
            console.error(err)
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