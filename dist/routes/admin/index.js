'use strict';

var express = require('express');
var passport = require('passport');

var AuthHelper = require('../../util/auth-helper');

var router = express.Router();

// Must be admin for all these routes
router.use(AuthHelper.ensureAuthenticated(AuthHelper.PERMISSIONS_ADMIN));

router.get('/', function (req, res) {
    var viewData = {};
    res.render('admin/index', viewData);
});

module.exports = router;