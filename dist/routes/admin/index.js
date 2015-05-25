'use strict';

var express = require('express');
var Promise = require('bluebird');
var azureStorage = require('azure-storage');
var mongoose = require('mongoose');

var auth = require('../../middleware/authorization');

var Match = mongoose.model('Match');

module.exports = function (passport) {
    var router = express.Router();
    var queueSvc = Promise.promisifyAll(azureStorage.createQueueService());

    // Must be admin for all these routes
    router.use(auth.is.admin);

    router.get('/', function (req, res) {
        var viewData = {};
        res.render('admin/index', viewData);
    });

    router.post('/queue_match', function (req, res) {
        var matchId = req.body.matchId;
        if (!matchId) {
            res.send('missing required matchId');
            return;
        }

        Match.findById(matchId).exec().then(function (match) {
            if (!match) {
                throw new Error('Match not found');
            }
            match.replay_fetch_status = 'Started';
            return match.save();
        }).then(function () {
            return queueSvc.createMessageAsync('match-replays', matchId);
        }).then(function () {
            res.redirect('/');
        });
    });

    return router;
};