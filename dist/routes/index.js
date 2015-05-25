'use strict';

var express = require('express');
var mongoose = require('mongoose');
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('lodash');
var auth = require('../middleware/authorization');
var Match = mongoose.model('Match');
var User = mongoose.model('User');

module.exports = function (passport) {
    var router = express.Router();

    router.get('/', auth.is.user, function (req, res) {
        var pageNumber = parseInt(req.query['page'], 10) || 1;
        var pageIndex = pageNumber - 1;

        var findUsers = User.find({}).exec();
        var findMatches = Match.find().skip(pageIndex * 15).limit(15).sort('-steam_match_seq_num').exec();
        var findMatchCount = Match.find({}).count().exec();

        Promise.all([findUsers, findMatches, findMatchCount]).spread(function (users, matches, matchCount) {
            var hasNextPage = (pageIndex + 1) * 15 <= matchCount;

            matches = matches.map(function (match) {
                return match.toJSON({ virtuals: true });
            });
            matches.forEach(function (match) {
                match.users = _.chain(match.steam_players).map(function (player) {
                    return _.find(users, 'steam_id', player.account_id);
                }).compact().value();
                match.played_at_ago = moment.unix(match.steam_start_time).fromNow();
                match.played_at_datetime = moment.unix(match.steam_start_time).format();
            });
            var viewData = {
                matches: matches,
                prevPage: pageNumber - 1,
                nextPage: hasNextPage ? pageNumber + 1 : false
            };
            res.render('home', viewData);
        });
    });

    router.get('/login', function (req, res) {
        var viewData = { errorMessage: req.flash('error') };
        res.render('login', viewData);
    });

    var authRoute = require('./auth')(passport);
    router.use('/auth', authRoute);

    var adminRoute = require('./admin')(passport);
    router.use('/admin', adminRoute);

    // 404 handler
    router.use(function (req, res, next) {
        res.status(404);

        var preferredContentType = req.accepts(['json', 'html']);
        if (req.xhr || preferredContentType === 'json') {
            res.send({ error: 'Not found' });
        } else {
            res.render('errors/404', { url: req.url });
        }
    });

    // Error handler
    router.use(function (err, req, res, next) {
        res.status(err.status || 500);

        console.error('Caught an error in global error handler!');
        console.error(err);

        var preferredContentType = req.accepts(['json', 'html']);
        if (req.xhr || preferredContentType === 'json') {
            res.status(500).send({ error: 'Uh Oh, something gone wrong!' });
        } else {
            res.render('errors/500', { error: err });
        }
    });

    return router;
};