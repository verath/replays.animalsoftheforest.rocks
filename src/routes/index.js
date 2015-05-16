const express = require('express');
const passport = require('passport');

const AuthHelper = require('../util/auth-helper');

const router = express.Router();

router.get('/', (req, res) => {
    const viewData = {errorMessage: req.flash('error')};
    res.render('index', viewData);
});

router.get('/home', AuthHelper.ensureAuthenticated(), (req, res) => {
    const viewData = {user: req.user};
    res.render('home', viewData);
});

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));

module.exports = router;