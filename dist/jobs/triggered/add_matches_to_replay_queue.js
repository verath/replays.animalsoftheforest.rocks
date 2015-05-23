'use strict';

var Promise = require('bluebird');
var moment = require('moment');
var azureStorage = require('azure-storage');
var JobHelper = require('../job-helper');

var REPLAY_QUEUE_NAME = 'match-replays';

function run() {
    console.log('Running add_matches_to_replay_queue');

    var queueSvc = Promise.promisifyAll(azureStorage.createQueueService());
    var db = JobHelper.createMongooseConnection();
    var Match = db.model('Match');

    var addMatchToQueue = function addMatchToQueue(match) {
        return queueSvc.createMessageAsync(REPLAY_QUEUE_NAME, match._id).then(function () {
            console.log('Added match ' + match._id + ' (steam_match_id: ' + match.steam_match_id + ')');
        });
    };

    var addMatchesToQueue = function addMatchesToQueue(matches) {
        if (matches != null) {
            return Promise.map(matches, addMatchToQueue).then(function () {
                console.log('Added ' + matches.length + ' match(es) to the replay queue');
            });
        }
    };

    var expiredThresholdTimestamp = moment().subtract(7, 'days').unix();
    queueSvc.createQueueIfNotExistsAsync(REPLAY_QUEUE_NAME).then(function () {
        return Match.find({}).where('steam_start_time').gt(expiredThresholdTimestamp).where('replay_url').exists(false).select('steam_match_id').exec();
    }).then(addMatchesToQueue).then(null, function (err) {
        console.log('An error occurred!');
        console.error(err);
    }).then(function () {
        db.close();
        console.log('add_matches_to_replay_queue finished');
    });
}
run();