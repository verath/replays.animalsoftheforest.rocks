"use strict";

require("babel/polyfill");

var Promise = require("bluebird");

var JobHelper = require("../../job-helper");

var db = JobHelper.createMongooseConnection();
var User = db.model("User");

var updateUser = function updateUser(user) {
    console.log("Updating ", user.steam_id);
    return Promise.delay(2000).then(function () {
        throw new Error("aaaaah!");
    });
};

var updateUsers = function updateUsers(users) {
    if (users != null) {
        return users.reduce(function (fetchPromise, user) {
            return fetchPromise.then(function () {
                return updateUser(user);
            });
        }, Promise.resolve());
    }
};

User.find({}).exec().then(updateUsers).then(null, function (err) {
    return console.error(err);
}).then(function () {
    return db.close();
});