const steam = require('steam');
const dota2 = require('dota2');
const Promise = require("bluebird");
const request = require('request');

const TypedError = require('../utils/typed-error');
const BackgroundJob = require('./background-job');

const STEAM_ACC_ACCOUNT_NAME = process.env['STEAM_ACC_ACCOUNT_NAME'];
const STEAM_ACC_PASSWORD = process.env['STEAM_ACC_PASSWORD'];
const TIMEOUT_STEAM_CLIENT = 25000; // Timeout in ms for calls to the steam client
const NUM_MESSAGES_PER_RUN = 3; // Number of queue message to process pre run

class EmptyQueueError extends TypedError {
}

class StoreMatchReplays extends BackgroundJob {

    constructor() {
        super();
        this._queueMessages = [];
        this._steamClient = null;
        this._dota2Client = null;
    }

    connectToDota() {
        console.log("Connecting to Dota...");
        const connectPromise = new Promise((resolve, reject) => {
            this._steamClient = new steam.SteamClient();
            this._steamClient.on("loggedOn", () => {
                this._dota2Client = new dota2.Dota2Client(this._steamClient);
                this._dota2Client.launch();
                this._dota2Client.on("ready", () => {
                    console.log("Connected to Dota");
                    resolve();
                });
            });
            this._steamClient.on("error", (err) => {
                console.log("Got a steamClient error!");
                console.log(err);
            });
            this._steamClient.logOn({accountName: STEAM_ACC_ACCOUNT_NAME, password: STEAM_ACC_PASSWORD});
        });

        return connectPromise
            .timeout(TIMEOUT_STEAM_CLIENT)
            .catch(Promise.TimeoutError, (err) => {
                console.log("Aborting connection attempt due to timeout");
                this.disconnectFromDota();
                throw err;
            });
    }

    disconnectFromDota() {
        if (this._dota2Client) {
            this._dota2Client.exit();
            this._dota2Client = null;
        }
        if (this._steamClient) {
            this._steamClient.logOff();
            this._steamClient = null;
        }
        console.log("Disconnected from Dota");
    }

    getMessagesFromQueue(numMessages) {
        return this.queueService.getMessagesAsync(BackgroundJob.QUEUE_MATCH_REPLAYS_NAME, {
            numOfMessages: numMessages,
            visibilityTimeout: 60 * numMessages
        }).spread((messages) => {
            if (!messages || messages.length === 0) {
                throw new EmptyQueueError();
            }
            this._queueMessages = messages;
        });
    }

    getMatchFromMessage(message) {
        const matchId = message.messagetext;
        const Match = this.mongooseConnection.model('Match');
        const findMatchPromise = Match.findById(matchId).exec();
        return Promise.resolve(findMatchPromise)
    }

    fetchMatchReplayUrl(match) {
        const steamMatchId = match.steam_match_id;
        const matchDetailsRequestAsync = Promise.promisify(this._dota2Client.matchDetailsRequest, this._dota2Client);
        return matchDetailsRequestAsync(steamMatchId)
            .then((detailsResponse) => {
                const matchData = detailsResponse["match"];
                const cluster = matchData["cluster"];
                const replaySalt = matchData["replaySalt"];
                return `http://replay${cluster}.valve.net/570/${steamMatchId}_${replaySalt}.dem.bz2`;
            })
            .timeout(TIMEOUT_STEAM_CLIENT)
    }

    storeMatchReplay(replayUrl, fileName) {
        const containerName = BackgroundJob.BLOB_REPLAYS_CONTAINER_NAME;
        return new Promise((resolve, reject) => {
            let blobWriteStream = this.blobService.createWriteStreamToBlockBlob(containerName, fileName, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(fileName);
            });
            request.get(replayUrl).on('error', (err) => reject(err)).pipe(blobWriteStream);
        });
    }

    fetchReplayForMatch(match) {
        if (match && !match.isSteamReplayExpired()) {
            console.log("Fetching replay for match: " + match.steam_match_id);
            return this.fetchMatchReplayUrl(match)
                .then((replayUrl) => this.storeMatchReplay(replayUrl, match.steam_match_id + ".dem.bz2"))
                .then((fileName) => {
                    const containerName = BackgroundJob.BLOB_REPLAYS_CONTAINER_NAME;
                    match.replay_url = `https://aotfreplays.blob.core.windows.net/${containerName}/${fileName}`;
                    return Promise.resolve(match.save());
                })
                .then(() => console.log("Replay fetched successfully"));
        }
    }

    removeMessageFromQueue(message) {
        return this.queueService.deleteMessageAsync(BackgroundJob.QUEUE_MATCH_REPLAYS_NAME,
            message.messageid,
            message.popreceipt);
    }

    fetchMatchReplays() {
        return this._queueMessages.reduce((fetchPromise, message) => {
            return fetchPromise
                .then(() => this.getMatchFromMessage(message))
                .then((match) => this.fetchReplayForMatch(match))
                .then(() => this.removeMessageFromQueue(message))
                .delay(BackgroundJob.STEAM_API_REQUEST_DELAY);
        }, Promise.resolve())
    }

    run() {
        this.getMessagesFromQueue(NUM_MESSAGES_PER_RUN)
            .then(() => this.connectToDota())
            .then(() => this.fetchMatchReplays())
            .catch(EmptyQueueError, () => console.log("No matches in queue"))
            .finally(() => {
                this.closeMongooseConnection();
                this.disconnectFromDota();
            });
    }
}

new StoreMatchReplays().run();