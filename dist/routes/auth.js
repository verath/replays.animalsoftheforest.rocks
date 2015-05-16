'use strict';

var express = require('express');
var passport = require('passport');

var router = express.Router();

// Steam sign on
router.get('/steam', passport.authenticate('steam'));
router.get('/steam/return', passport.authenticate('steam', {
    successRedirect: '/home',
    failureRedirect: '/',
    failureFlash: true
}));

module.exports = router;