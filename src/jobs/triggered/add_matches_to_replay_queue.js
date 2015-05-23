const Promise = require("bluebird");
const moment = require('moment');
const azureStorage = require('azure-storage');
const JobHelper = require('../job-helper');

const REPLAY_QUEUE_NAME = 'match-replays';

function run() {
    console.log("Running add_matches_to_replay_queue");

    const queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    const db = JobHelper.createMongooseConnection();
    const Match = db.model('Match');

    const addMatchToQueue = (match) => {
        return queueSvc.createMessageAsync(REPLAY_QUEUE_NAME, match.id)
            .then(() => {
                console.log(`Added match ${match.id} (steam_match_id: ${match.steam_match_id})`);
            });
    };

    const addMatchesToQueue = (matches) => {
        if (matches != null) {
            return Promise.map(matches, addMatchToQueue)
                .then(() => {
                    console.log("Added " + matches.length + " match(es) to the replay queue");
                });
        }
    };

    const expiredThresholdTimestamp = moment().subtract(7, 'days').unix();
    queueSvc.createQueueIfNotExistsAsync(REPLAY_QUEUE_NAME)
        .then(() => {
            return Match.find({})
                .where('steam_start_time').gt(expiredThresholdTimestamp)
                .where('replay_url').exists(false)
                .select('steam_match_id')
                .exec()
        })
        .then(addMatchesToQueue)
        .then(null, (err) => {
            console.log("An error occurred!");
            console.error(err)
        })
        .then(() => {
            db.close();
            console.log("add_matches_to_replay_queue finished");
        });
}
run();