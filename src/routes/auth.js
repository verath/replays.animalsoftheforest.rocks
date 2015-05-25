const express = require('express');
const passport = require('passport');

module.exports = (passport) => {
    const router = express.Router();

    // Steam sign on
    router.get('/steam', passport.authenticate('steam'));
    router.get('/steam/return', passport.authenticate('steam', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }));

    return router
};