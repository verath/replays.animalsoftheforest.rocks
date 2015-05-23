'use strict';

var steam = require('steam');
var dota2 = require('dota2');
var Promise = require('bluebird');
var azureStorage = require('azure-storage');
var moment = require('moment');
var request = require('request');

var JobHelper = require('../job-helper');

var STEAM_ACC_ACCOUNT_NAME = process.env['STEAM_ACC_ACCOUNT_NAME'];
var STEAM_ACC_PASSWORD = process.env['STEAM_ACC_PASSWORD'];
var REPLAY_QUEUE_NAME = 'match-replays'; // Name of the queue to replay requests to
var REPLAY_BLOB_CONTAINER_NAME = 'replays'; // Name of the queue to replay requests to
var RUN_INTERVAL = 15 * 60 * 1000; // Run every 15th minute
var TIMEOUT_STEAM_CLIENT = 25000; // Timeout in ms for calls to the steam client
var STEAM_REQUEST_DELAY = 4000; // Delay in ms between each match is processed
var NUM_MESSAGES_PER_RUN = 3; // Number of queue message to process pre run

var debugMode = process.env['NODE_ENV'] !== 'production';

function run() {
    var steamClient = undefined,
        dota2Client = undefined;

    console.log('Running job');

    if (JobHelper.shouldShutdown()) {
        console.log('Detected shutdown request, stopping');
        return;
    }

    var queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    var blobSvc = azureStorage.createBlobService();
    var db = JobHelper.createMongooseConnection();
    var Match = db.model('Match');
    var expiredThresholdTimestamp = moment().subtract(7, 'days').unix();

    function disconnectFromDota() {
        if (dota2Client) {
            dota2Client.exit();
            dota2Client = null;
        }
        if (steamClient) {
            steamClient.logOff();
            steamClient = null;
        }
        console.log('Disconnected from Dota');
        return true;
    }

    function connectToDota() {
        console.log('Connecting to Dota...');
        var connectPromise = new Promise(function (resolve, reject) {
            steamClient = new steam.SteamClient();
            steamClient.on('loggedOn', function () {
                dota2Client = new dota2.Dota2Client(steamClient, debugMode);
                dota2Client.launch();
                dota2Client.on('ready', function () {
                    console.log('Connected to Dota');
                    resolve();
                });
            });
            steamClient.on('error', function (err) {
                console.log('Got a steamClient error!');
                console.log(err);
            });
            steamClient.logOn({ accountName: STEAM_ACC_ACCOUNT_NAME, password: STEAM_ACC_PASSWORD });
        });

        return connectPromise.timeout(TIMEOUT_STEAM_CLIENT)['catch'](Promise.TimeoutError, function (err) {
            console.log('Aborting connection attempt due to timeout');
            disconnectFromDota();
            throw err;
        });
    }

    function removeMessageFromQueue(message) {
        return queueSvc.deleteMessageAsync(REPLAY_QUEUE_NAME, message.messageid, message.popreceipt);
    }

    function storeMatchReplay(replayUrl, fileName) {
        return new Promise(function (resolve, reject) {
            var blobWriteStream = blobSvc.createWriteStreamToBlockBlob(REPLAY_BLOB_CONTAINER_NAME, fileName, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(fileName);
                }
            });
            request.get(replayUrl).on('error', function (err) {
                reject(err);
            }).pipe(blobWriteStream);
        });
    }

    function fetchMatchReplayUrl(match) {
        var steamMatchId = match.steam_match_id;
        var matchDetailsRequestAsync = Promise.promisify(dota2Client.matchDetailsRequest, dota2Client);
        return matchDetailsRequestAsync(steamMatchId).then(function (detailsResponse) {
            var matchData = detailsResponse['match'];
            var cluster = matchData['cluster'];
            var replaySalt = matchData['replaySalt'];
            return 'http://replay' + cluster + '.valve.net/570/' + steamMatchId + '_' + replaySalt + '.dem.bz2';
        }).timeout(TIMEOUT_STEAM_CLIENT).then(function (replayUrl) {
            return storeMatchReplay(replayUrl, steamMatchId + '.dem.bz2');
        }).then(function (fileName) {
            match.replay_url = 'https://aotfreplays.blob.core.windows.net/' + REPLAY_BLOB_CONTAINER_NAME + '/' + fileName;
            return Promise.resolve(match.save());
        });
    }

    function handleQueueMessage(message) {
        var matchId = message.messagetext;
        return Promise.resolve(Match.findById(matchId).exec()).then(function (match) {
            console.log('Fetching replay for match: ' + match.steam_match_id);
            var matchStartTime = moment.unix(match.steam_start_time);
            if (matchStartTime.isBefore(expiredThresholdTimestamp)) {
                console.log('Aborting, match was expired, played on: ', moment.unix(match.steam_start_time).format());
                return;
            }
            if (match.steam_lobby_type !== 7) {
                console.log('Aborting, match was not a team match');
                return;
            }
            if (match.replay_url) {
                console.log('Aborting, match already has a replay url');
                return;
            }
            return fetchMatchReplayUrl(match).then(function () {
                console.log('Replay fetched successfully');
            });
        });
    }

    function getMessagesFromQueue() {
        return queueSvc.getMessagesAsync(REPLAY_QUEUE_NAME, {
            numOfMessages: NUM_MESSAGES_PER_RUN,
            visibilityTimeout: 120
        }).spread(function (result) {
            return result;
        });
    }

    connectToDota().then(getMessagesFromQueue).map(function (message) {
        return handleQueueMessage(message).then(function () {
            return removeMessageFromQueue(message);
        })['catch'](function (err) {
            console.log('Error handling queued message:', message.messagetext);
            console.error(err);
        }).delay(STEAM_REQUEST_DELAY);
    }, { concurrency: 1 })['finally'](function () {
        db.close();
        disconnectFromDota();
    }).then(function () {
        console.log('Job finished');
        setTimeout(run, RUN_INTERVAL);
    });
}

run();