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

    //const queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    var db = JobHelper.createMongooseConnection();
    var User = db.model('User');
    var Team = db.model('Team');
    var Match = db.model('Match');

    var insertMatchIfNotExist = function insertMatchIfNotExist(matchData) {
        var matchId = matchData['match_id'];
        return Match.count({ steam_match_id: matchId }).then(function (count) {
            if (count === 0) {
                var _ret = (function () {
                    // No match currently exist, create a new one
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

                    return {
                        v: match.save().then(function (storedMatch) {
                            queueSvc.createMessageAsync(REPLAY_QUEUE_NAME, storedMatch._id);
                        })
                    };
                })();

                if (typeof _ret === 'object') return _ret.v;
            }
        });
    };

    /**
     * Function for (recursively) fetching match ids for an account until a a match id.
     * @param accountId The account to fetch matches for
     * @param untilMatchSeqNum The match seq num where to stop fetching.
     * @param [startAtId = -1] Match id to start fetching from
     */
    var fetchMatchesUntilMatchSeqNum = function fetchMatchesUntilMatchSeqNum(accountId, untilMatchSeqNum) {
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
                var _ret2 = (function () {
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

                if (typeof _ret2 === 'object') return _ret2.v;
            }
        })['catch'](requestErrors.StatusCodeError, function (err) {
            throw new Error('Steam API responded with a ' + err.statusCode + ' error code!');
        }).delay(REQUEST_DELAY);
    };

    var fetchMatchesForUser = function fetchMatchesForUser(user) {
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
    };

    var fetchMatchesForUsers = function fetchMatchesForUsers(users) {
        if (users != null) {
            return users.reduce(function (fetchPromise, user) {
                return fetchPromise.then(function () {
                    return fetchMatchesForUser(user);
                }).delay(REQUEST_DELAY);
            }, Promise.resolve());
        }
    };

    User.find({}).exec().then(fetchMatchesForUsers).then(null, function (err) {
        console.log('Error while updating matches for users!');
        console.error(err);
    }).then(function () {
        db.close();
        console.log('update_matches finished');
    }).then(function () {
        setTimeout(run, RUN_INTERVAL);
    });
}

run();