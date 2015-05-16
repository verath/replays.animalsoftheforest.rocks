const Promise = require("bluebird");

const User = require('../models/user');

const USER_TABLE = 'users';

class UserService {

    constructor(tableService) {
        this.createTableIfNotExistsAsync = Promise.promisify(tableService.createTableIfNotExists, tableService);
        this.retrieveEntityAsync = Promise.promisify(tableService.retrieveEntity, tableService);
    }

    serializeUser(user, done) {
        const userEntity = user.entity;
        done(null, {
            PartitionKey: userEntity.PartitionKey['_'],
            RowKey: userEntity.RowKey['_']
        });
    }

    deserializeUser(obj, done) {
        const partitionKey = obj.PartitionKey;
        const rowKey = obj.RowKey;
        this.getUserByIdAsync(partitionKey, rowKey).then((user) => {
            if (user == null) {
                done(null, new Error("Could deserialize user, user not found in table."))
            } else {
                done(null, user);
            }
        }, (err) => done(err));
    }

    validate(identifier, profile, done) {
        const idMatch = identifier.match(/.*?\/(\d+)$/);
        if (idMatch == null) {
            done(new Error("Invalid identifier"));
        } else {
            const steamId = idMatch[1];
            this.getUserByIdAsync('users_default_partition', steamId).then((user) => {
                if (user == null) {
                    done(null, false, {message: 'User not found.'})
                } else {
                    done(null, user);
                }
            }, (err) => done(err));
        }
    }

    getUserByIdAsync(partitionKey, steamId) {
        return this.createTableIfNotExistsAsync(USER_TABLE)
            .then(() => this.retrieveEntityAsync(USER_TABLE, partitionKey, steamId))
            .spread((result) => new User(result))
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