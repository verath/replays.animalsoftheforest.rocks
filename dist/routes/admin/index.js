'use strict';

var express = require('express');
var auth = require('../../middleware/authorization');

module.exports = function (passport) {
    var router = express.Router();

    // Must be admin for all these routes
    router.use(auth.is.admin);

    router.get('/', function (req, res) {
        var viewData = {};
        res.render('admin/index', viewData);
    });

    return router;
};