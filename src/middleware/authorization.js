const redirectToLoginPage = (req, res) => {
    let loginUrl = '/';
    if (req.method === "GET") {
        loginUrl += `?returnTo=${encodeURIComponent(req.originalUrl)}`;
    }
    res.redirect(loginUrl);
};

const auth = {
    is: {
        user(req, res, next) {
            auth.has.access_level(auth.ACCESS_LEVELS.USER)(req, res, next);
        },

        admin(req, res, next) {
            auth.has.access_level(auth.ACCESS_LEVELS.ADMIN)(req, res, next);
        }
    },
    has: {
        access_level(required_level) {
            return (req, res, next) => {
                if (!req.isAuthenticated()) {
                    req.flash("error", "Unauthenticated!");
                    return redirectToLoginPage(req, res);
                }
                const user = req.user;
                if (user.access_level && user.access_level >= required_level) {
                    next();
                } else {
                    req.flash("error", "Permission denied!");
                    return redirectToLoginPage(req, res);
                }
            }
        }
    },
    ACCESS_LEVELS: {
        USER: 1,
        ADMIN: 10
    }
};

module.exports = auth;
