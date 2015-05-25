"use strict";

var redirectToLoginPage = function redirectToLoginPage(req, res) {
    var loginUrl = "/login";
    if (req.method === "GET") {
        loginUrl += "?returnTo=" + encodeURIComponent(req.originalUrl);
    }
    res.redirect(loginUrl);
};

var auth = {
    is: {
        user: function user(req, res, next) {
            if (!req.isAuthenticated()) {
                req.flash("error", "Unauthenticated!");
                return redirectToLoginPage(req, res);
            } else {
                next();
            }
        },

        admin: function admin(req, res, next) {
            auth.has.access_level(auth.ACCESS_LEVELS.ADMIN)(req, res, next);
        }
    },
    has: {
        access_level: function access_level(required_level) {
            return function (req, res, next) {
                if (!req.isAuthenticated()) {
                    req.flash("error", "Unauthenticated!");
                    return redirectToLoginPage(req, res);
                }
                var user = req.user;
                if (user.access_level && user.access_level >= required_level) {
                    next();
                } else {
                    req.flash("error", "Permission denied!");
                    return redirectToLoginPage(req, res);
                }
            };
        }
    },
    ACCESS_LEVELS: {
        ADMIN: 10
    }
};

module.exports = auth;