const express = require('express');
const passport = require('passport');

const AuthHelper = require('../../util/auth-helper');

const router = express.Router();

// Must be admin for all these routes
router.use(AuthHelper.ensureAuthenticated(AuthHelper.PERMISSIONS_ADMIN));

router.get('/', (req, res) => {
    const viewData = {};
    res.render('admin/index', viewData);
});

module.exports = router;