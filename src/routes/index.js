const express = require('express');
const mongoose = require('mongoose');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const auth = require('../middleware/authorization');

const Match = mongoose.model('Match');
const User = mongoose.model('User');

module.exports = (passport) => {
    const router = express.Router();

    router.get('/', auth.is.user, (req, res) => {
        const pageNumber = parseInt(req.query['page'], 10) || 1;
        const pageIndex = pageNumber - 1;

        const findUsers = User.find({}).exec();
        const findMatches = Match.find()
            .skip(pageIndex * 15)
            .limit(15)
            .sort('-steam_match_seq_num')
            .exec();
        const findMatchCount = Match.find({}).count().exec();

        Promise.all([findUsers, findMatches, findMatchCount]).spread((users, matches, matchCount) => {
            const hasNextPage = (pageIndex + 1) * 15 <= matchCount;

            matches = matches.map((match) => {
                match.is_replay_expired = match.isSteamReplayExpired();
                return match.toJSON({virtuals: true})
            });
            matches.forEach((match) => {
                match.users = _.chain(match.steam_players).map((player) => {
                    return _.find(users, 'steam_id', player.account_id);
                }).compact().value();
                match.played_at_ago = moment.unix(match.steam_start_time).fromNow();
                match.played_at_datetime = moment.unix(match.steam_start_time).format();
            });
            const viewData = {
                matches: matches,
                prevPage: (pageNumber - 1),
                nextPage: hasNextPage ? (pageNumber + 1) : false,
                isAdmin: req.user.access_level >= auth.ACCESS_LEVELS.ADMIN,
                csrfToken: req.csrfToken()
            };
            res.render('home', viewData);
        });
    });

    router.get('/login', (req, res) => {
        const viewData = {errorMessage: req.flash('error')};
        res.render('login', viewData);
    });

    const authRoute = require('./auth')(passport);
    router.use('/auth', authRoute);

    const adminRoute = require('./admin')(passport);
    router.use('/admin', adminRoute);

    // 404 handler
    router.use((req, res, next) => {
        res.status(404);

        const preferredContentType = req.accepts(['json', 'html']);
        if (req.xhr || preferredContentType === 'json') {
            res.send({error: 'Not found'});
        } else {
            res.render('errors/404', {url: req.url});
        }
    });

    // Error handler
    router.use(function (err, req, res, next) {
        res.status(err.status || 500);

        console.error("Caught an error in global error handler!");
        console.error(err);

        const preferredContentType = req.accepts(['json', 'html']);
        if (req.xhr || preferredContentType === 'json') {
            res.status(500).send({error: 'Uh Oh, something gone wrong!'});
        } else {
            res.render('errors/500', {error: err});
        }
    });

    return router
};
