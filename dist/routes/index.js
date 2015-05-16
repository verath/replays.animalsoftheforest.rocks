'use strict';

var express = require('express');
var passport = require('passport');

var AuthHelper = require('../util/auth-helper');

var router = express.Router();

router.get('/', function (req, res) {
    var viewData = { errorMessage: req.flash('error') };
    res.render('index', viewData);
});

router.get('/home', AuthHelper.ensureAuthenticated(), function (req, res) {
    /** @type User */
    var user = req['user'];
    var viewData = { userId: user.id };
    res.render('home', viewData);
});

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));

module.exports = router;