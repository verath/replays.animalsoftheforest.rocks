const steam = require('steam');
const dota2 = require('dota2');
const Promise = require("bluebird");
const azureStorage = require('azure-storage');
const moment = require('moment');
const request = require('request');

const JobHelper = require('../job-helper');

const STEAM_ACC_ACCOUNT_NAME = process.env['STEAM_ACC_ACCOUNT_NAME'];
const STEAM_ACC_PASSWORD = process.env['STEAM_ACC_PASSWORD'];
const REPLAY_QUEUE_NAME = 'match-replays'; // Name of the queue to replay requests to
const REPLAY_BLOB_CONTAINER_NAME = 'replays'; // Name of the queue to replay requests to
const RUN_INTERVAL = 15 * 60 * 1000; // Run every 15th minute
const TIMEOUT_STEAM_CLIENT = 25000; // Timeout in ms for calls to the steam client
const STEAM_REQUEST_DELAY = 3000; // Delay in ms between each match is processed
const NUM_MESSAGES_PER_RUN = 1; // Number of queue message to process pre run

const debugMode = (process.env['NODE_ENV'] !== 'production');

function run() {
    let steamClient, dota2Client;

    console.log("Running job");

    if (JobHelper.shouldShutdown()) {
        console.log("Detected shutdown request, stopping");
        return;
    }

    const queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    const blobSvc = azureStorage.createBlobService();
    const db = JobHelper.createMongooseConnection();
    const Match = db.model('Match');
    const expiredThresholdTimestamp = moment().subtract(7, 'days').unix();


    function disconnectFromDota() {
        if (dota2Client) {
            dota2Client.exit();
            dota2Client = null;
        }
        if (steamClient) {
            steamClient.logOff();
            steamClient = null;
        }
        console.log("Disconnected from Dota");
        return true;
    }

    function connectToDota() {
        console.log("Connecting to Dota...");
        const connectPromise = new Promise((resolve, reject) => {
            steamClient = new steam.SteamClient();
            steamClient.on("loggedOn", () => {
                dota2Client = new dota2.Dota2Client(steamClient, debugMode);
                dota2Client.launch();
                dota2Client.on("ready", () => {
                    console.log("Connected to Dota");
                    resolve();
                });
            });
            steamClient.on('error', (err) => {
                console.log("Got a steamClient error!");
                console.log(err);
            });
            steamClient.logOn({accountName: STEAM_ACC_ACCOUNT_NAME, password: STEAM_ACC_PASSWORD});
        });

        return connectPromise
            .timeout(TIMEOUT_STEAM_CLIENT)
            .catch(Promise.TimeoutError, (err) => {
                console.log("Aborting connection attempt due to timeout");
                disconnectFromDota();
                throw err;
            });
    }

    function removeMessageFromQueue(message) {
        return queueSvc.deleteMessageAsync(REPLAY_QUEUE_NAME, message.messageid, message.popreceipt);
    }

    function storeMatchReplay(replayUrl, fileName) {
        return new Promise((resolve, reject) => {
            let blobWriteStream = blobSvc.createWriteStreamToBlockBlob(REPLAY_BLOB_CONTAINER_NAME, fileName, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(fileName);
                }
            });
            request.get(replayUrl).on('error', (err) => {
                reject(err);
            }).pipe(blobWriteStream);
        });
    }

    function fetchMatchReplayUrl(match) {
        const steamMatchId = match.steam_match_id;
        const matchDetailsRequestAsync = Promise.promisify(dota2Client.matchDetailsRequest, dota2Client);
        return matchDetailsRequestAsync(steamMatchId)
            .then((detailsResponse) => {
                const matchData = detailsResponse["match"];
                const cluster = matchData["cluster"];
                const replaySalt = matchData["replaySalt"];
                return `http://replay${cluster}.valve.net/570/${steamMatchId}_${replaySalt}.dem.bz2`;
            })
            .timeout(TIMEOUT_STEAM_CLIENT)
            .then((replayUrl) => {
                return storeMatchReplay(replayUrl, steamMatchId + ".dem.bz2");
            })
            .then((fileName) => {
                match.replay_url = `https://aotfreplays.blob.core.windows.net/${REPLAY_BLOB_CONTAINER_NAME}/${fileName}`;
                return Promise.resolve(match.save());
            })
    }

    function handleQueueMessage(message) {
        const matchId = message.messagetext;
        return Promise.resolve(Match.findById(matchId).exec())
            .then((match) => {
                console.log("Fetching replay for match: " + match.steam_match_id);
                const matchStartTime = moment.unix(match.steam_start_time);
                if (matchStartTime.isBefore(expiredThresholdTimestamp)) {
                    console.log("Aborting, match was expired, played on: ", moment.unix(match.steam_start_time).format());
                    return;
                }
                if (match.steam_lobby_type !== 7) {
                    console.log("Aborting, match was not a team match");
                    return;
                }
                if (match.replay_url) {
                    console.log("Aborting, match already has a replay url");
                    return;
                }
                return fetchMatchReplayUrl(match).then(() => {
                    console.log("Replay fetched successfully");
                });
            })
    }

    function getMessagesFromQueue() {
        return queueSvc.getMessagesAsync(REPLAY_QUEUE_NAME, {
            numOfMessages: NUM_MESSAGES_PER_RUN,
            visibilityTimeout: 120
        }).spread((result) => result);
    }

    connectToDota()
        .then(getMessagesFromQueue)
        .map((message) => {
            return handleQueueMessage(message)
                .then(() => removeMessageFromQueue(message))
                .catch((err) => {
                    console.log("Error handling queued message:", message.messagetext);
                    console.error(err);
                }).delay(STEAM_REQUEST_DELAY);
        }, {concurrency: 1})
        .finally(() => {
            db.close();
            disconnectFromDota();
        })
        .then(() => {
            console.log("Job finished");
            setTimeout(run, RUN_INTERVAL);
        });

}

run();