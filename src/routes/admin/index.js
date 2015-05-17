const express = require('express');
const auth = require('../../middleware/authorization');

module.exports = (passport) => {
    const router = express.Router();

    // Must be admin for all these routes
    router.use(auth.is.admin);

    router.get('/', (req, res) => {
        const viewData = {};
        res.render('admin/index', viewData);
    });

    return router
};
