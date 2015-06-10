const mongoose = require('mongoose');
const Promise = require('bluebird');
const Schema = mongoose.Schema;

const teamSchema = new Schema({
    steam_team_id: {type: String, required: true, unique: true},
    steam_name: String,
    steam_tag: String,
    steam_time_created: Number,
    steam_rating: Schema.Types.Mixed, // Either mmr as a number, or "inactive"
    steam_logo: Number,
    steam_player_account_ids: [String],
    steam_admin_account_id: String
});

// Disable auto index as it has a big performance impact
teamSchema.set('autoIndex', false);

// Class methods on the Team model
teamSchema.statics = {
    /**
     * Finds all teams. Also wraps the mongoose promise in a bluebird promise.
     *
     * @returns {Promise} A bluebird promise for all teams.
     */
    findAll: function () {
        const teamsPromise = this.find({}).exec();
        return Promise.resolve(teamsPromise);
    }
};

module.exports = (connection) => {
    connection.model('Team', teamSchema);
};