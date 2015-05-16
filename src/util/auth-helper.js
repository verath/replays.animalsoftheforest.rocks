const PERMISSIONS_KEY_USER = Symbol("USER");
const PERMISSIONS_KEY_ADMIN = Symbol("ADMIN");
const PERMISSIONS_KEY_DEFAULT = PERMISSIONS_KEY_USER;

const PERMISSION_LEVELS = {
    [PERMISSIONS_KEY_USER]: 1,
    [PERMISSIONS_KEY_ADMIN]: 2
};

class AuthHelper {
    static get PERMISSIONS_USER() {
        return PERMISSIONS_KEY_USER;
    }

    static get PERMISSIONS_ADMIN() {
        return PERMISSIONS_KEY_ADMIN;
    }

    static ensureAuthenticated(requiredPermission = PERMISSIONS_KEY_DEFAULT) {
        const requiredPermissionLevel = PERMISSION_LEVELS[requiredPermission];
        if (!requiredPermissionLevel) {
            throw new Error("Invalid requiredPermission!");
        }

        return (req, res, next) => {
            if (req.isAuthenticated()) {
                const permissionLevel = req.user.permissionLevel || -1;
                if (permissionLevel < requiredPermissionLevel) {
                    req.flash("error", "Permission denied!");
                } else {
                    return next();
                }
            } else {
                req.flash("error", "Unauthenticated!");
            }
            res.redirect('/');
        }
    }
}

module.exports = AuthHelper;