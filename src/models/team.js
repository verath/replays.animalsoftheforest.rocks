const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teamSchema = new Schema({
    steam_team_id: {type: String, required: true, unique: true},
    steam_name: String,
    steam_tag: String,
    steam_time_created: Number,
    steam_rating: Number,
    steam_logo: Number,
    steam_player_account_ids: [String],
    steam_admin_account_id: String
});

// Disable auto index as it has a big performance impact
teamSchema.set('autoIndex', false);

module.exports = (connection) => {
    connection.model('Team', teamSchema);
};