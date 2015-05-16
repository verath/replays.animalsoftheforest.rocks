const Promise = require("bluebird");

const USER_TABLE = 'users';

class UserService {

    constructor(tableService) {
        this.createTableIfNotExistsAsync = Promise.promisify(tableService.createTableIfNotExists, tableService);
        this.retrieveEntityAsync = Promise.promisify(tableService.retrieveEntity, tableService);
    }

    validate(identifier, profile, done) {
        const idMatch = identifier.match(/.*?\/(\d+)$/);
        if (idMatch == null) {
            done(new Error("Invalid identifier"));
        } else {
            const steamId = idMatch[1];
            this.validateUserBySteamIdAsync(steamId).then((dbUser) => {
                if (dbUser == null) {
                    done(null, false, {message: 'User not found.'})
                } else {
                    let user = {steamId: steamId};
                    done(null, user);
                }
            }, (err) => done(err));
        }
    }

    validateUserBySteamIdAsync(steamId) {
        return this.createTableIfNotExistsAsync(USER_TABLE)
            .then(() => this.retrieveEntityAsync(USER_TABLE, 'users_default_partition', steamId))
            .catch((err) => {
                if (err.statusCode && err.statusCode === 404) {
                    return null;
                } else {
                    return err;
                }
            });
    }
}

module.exports = UserService;