'use strict';

var express = require('express');
var auth = require('../middleware/authorization');

module.exports = function (passport) {
    var router = express.Router();

    router.get('/', function (req, res) {
        var viewData = { errorMessage: req.flash('error') };
        res.render('index', viewData);
    });

    router.get('/home', auth.is.user, function (req, res) {
        var viewData = { user: req['user'] };
        res.render('home', viewData);
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