const express = require('express');
const Promise = require('bluebird');
const azureStorage = require('azure-storage');
const mongoose = require('mongoose');

const auth = require('../../middleware/authorization');

const Match = mongoose.model('Match');

module.exports = (passport) => {
    const router = express.Router();
    const queueSvc = Promise.promisifyAll(azureStorage.createQueueService());

    // Must be admin for all these routes
    router.use(auth.is.admin);

    router.get('/', (req, res) => {
        const viewData = {};
        res.render('admin/index', viewData);
    });

    router.post('/queue_match', (req, res) => {
        const matchId = req.body.matchId;
        if (!matchId) {
            res.send('missing required matchId');
            return;
        }

        Match.findById(matchId)
            .exec()
            .then((match) => {
                if (!match) {
                    throw new Error("Match not found");
                }
                match.replay_fetch_status = "Started";
                return match.save();
            })
            .then(() => queueSvc.createMessageAsync('match-replays', matchId))
            .then(() => {
                res.redirect('/');
            });
    });

    return router
};
