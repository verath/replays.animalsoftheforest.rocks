'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var requestErrors = require('request-promise/errors');
var azureStorage = require('azure-storage');
var constants = require('../../config/constants');
var SteamUtils = require('../../utils/steam-utils');
var JobHelper = require('../job-helper');

var REPLAY_QUEUE_NAME = 'match-replays'; // Name of the queue to replay requests to
var RUN_INTERVAL = 60 * 60 * 1000; // Run every hour
var REQUEST_DELAY = 1000; // Delay between requests to the steam api
var MATCH_HISTORY_METHOD_URL = 'http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v0001/';

function run() {
    console.log('Running update_matches');

    if (JobHelper.shouldShutdown()) {
        console.log('Detected shutdown request, stopping');
        return;
    }

    var queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    var db = JobHelper.createMongooseConnection();
    var User = db.model('User');
    var Team = db.model('Team');
    var Match = db.model('Match');

    var steamTeamIds = [];

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
        var teamsInMatch = steamTeamIds.filter(function (steamTeamId) {
            return match.team_ids.indexOf(steamTeamId) !== -1;
        });
        return teamsInMatch.length > 0;
    }

    function insertMatchIfNotExist(matchData) {
        var match = new Match({
            team_ids: [matchData['dire_team_id'], matchData['radiant_team_id']],
            steam_match_id: matchData['match_id'],
            steam_match_seq_num: matchData['match_seq_num'],
            steam_start_time: matchData['start_time'],
            steam_lobby_type: matchData['lobby_type'],
            steam_radiant_team_id: matchData['radiant_team_id'],
            steam_dire_team_id: matchData['dire_team_id']
        });

        matchData['players'].forEach(function (player) {
            match.steam_players.push({
                account_id: SteamUtils.steamId32To64(player['account_id']),
                player_slot: player['player_slot'],
                hero_id: player['hero_id']
            });
        });

        if (shouldAddMatchToReplayQueue(match)) {
            match.replay_fetch_status = 'Started';
        }

        return Promise.resolve(match.save()).then(function (storedMatch) {
            if (shouldAddMatchToReplayQueue(storedMatch)) {
                return queueSvc.createMessageAsync(REPLAY_QUEUE_NAME, storedMatch.id);
            }
        }, function (err) {
            if (err.code !== 11000) {
                // Catch DuplicateKey error (match already exist)
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
    function fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum) {
        var startAtId = arguments[2] === undefined ? -1 : arguments[2];

        var reqOptions = {
            uri: MATCH_HISTORY_METHOD_URL,
            qs: {
                key: constants.STEAM_WEB_API_KEY,
                account_id: accountId,
                start_at_match_id: startAtId,
                matches_requested: 10
            },
            json: true
        };
        return request(reqOptions).then(function (res) {
            var numResults = res['result']['num_results'];
            if (numResults == 0) {
                return [];
            } else {
                var _ret = (function () {
                    var matches = res['result']['matches'];
                    var lastMatch = matches.slice(-1)[0];
                    var lastMatchSeqNum = lastMatch['match_seq_num'];
                    var lastMatchId = lastMatch['match_id'];
                    if (lastMatchSeqNum <= untilMatchSeqNum) {
                        return {
                            v: matches.filter(function (match) {
                                return match['match_seq_num'] > untilMatchSeqNum;
                            })
                        };
                    } else {
                        var nextMatchesReq = fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum, lastMatchId - 1);
                        return {
                            v: nextMatchesReq.then(function (nextMatches) {
                                return matches.concat(nextMatches);
                            })
                        };
                    }
                })();

                if (typeof _ret === 'object') return _ret.v;
            }
        })['catch'](requestErrors.StatusCodeError, function (err) {
            throw new Error('Steam API responded with a ' + err.statusCode + ' error code!');
        }).delay(REQUEST_DELAY);
    }

    function fetchMatchesForUser(user) {
        var accountId = SteamUtils.steamId64To32(user.steam_id);
        var userName = user.steam_persona_name;
        var latestMatchSeqNum = user.latest_match_seq_num;

        console.log('Fetching matches for user: ' + userName + ' (' + accountId + '). Latest match seqNum: ' + latestMatchSeqNum);

        var newestMatchSeqNum = latestMatchSeqNum;
        return fetchMatchesUntilMatchSeqNum(accountId, latestMatchSeqNum).then(function (matches) {
            if (matches.length > 0) {
                newestMatchSeqNum = matches[0]['match_seq_num'];
                console.log('Found ' + matches.length + ' new match(es) for player.');
            }
            return matches;
        }).map(function (matchData) {
            return insertMatchIfNotExist(matchData);
        }).then(function () {
            user.latest_match_seq_num = newestMatchSeqNum;
            return user.save();
        });
    }

    function fetchMatchesForUsers(users) {
        if (users != null) {
            return users.reduce(function (fetchPromise, user) {
                return fetchPromise.then(function () {
                    return fetchMatchesForUser(user);
                }).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    }

    Promise.resolve(Team.find({}).exec()).each(function (team) {
        return steamTeamIds.push(team.steam_team_id);
    }).then(function () {
        return Promise.resolve(User.find({}).exec());
    }).then(fetchMatchesForUsers)['catch'](function (err) {
        console.log('Error while updating matches for users!');
        console.error(err);
    })['finally'](function () {
        db.close();
    }).then(function () {
        console.log('job finished');
        setTimeout(run, RUN_INTERVAL);
    });
}

run();