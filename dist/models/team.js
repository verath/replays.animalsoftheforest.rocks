'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var teamSchema = new Schema({
    players: [Schema.Types.ObjectId],
    steam_team_id: { type: String, required: true },
    steam_name: String,
    steam_tag: String,
    steam_time_created: Number,
    steam_rating: Number,
    steam_logo: Number,
    steam_player_account_ids: [String],
    steam_admin_account_id: String
});

module.exports = function (connection) {
    connection.model('Team', teamSchema);
};