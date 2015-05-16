'use strict';

module.exports = {
    /** The port where the applications should listen for incoming request*/
    PORT: process.env['PORT'],

    /** The http root where the site is hosted (eg. 'http://127.0.0.1') */
    SITE_URL: process.env['SITE_URL'],

    /** The Steam API key to use */
    STEAM_WEB_API_KEY: process.env['STEAM_WEB_API_KEY'],

    /** The secret key to sign cookies with */
    COOKIE_SECRET: 'abc' // TODO: Good key
};