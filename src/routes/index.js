const express = require('express');
const auth = require('../middleware/authorization');

module.exports = (passport) => {
    const router = express.Router();

    router.get('/', (req, res) => {
        const viewData = {errorMessage: req.flash('error')};
        res.render('index', viewData);
    });

    router.get('/home', auth.is.user, (req, res) => {
        const viewData = {user: req['user']};
        res.render('home', viewData);
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
