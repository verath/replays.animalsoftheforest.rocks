const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const matchSchema = new Schema({
    replay_url: String, // The url of the match replay file
    team_ids: [Number], // For easier querying of matches for a team

    steam_match_id: Number,
    steam_match_seq_num: Number,
    steam_start_time: Number,
    steam_lobby_type: Number,
    steam_radiant_team_id: Number,
    steam_dire_team_id: Number,
    steam_players: [{
        account_id: String,
        player_slot: Number,
        hero_id: Number
    }]
});

module.exports = (connection) => {
    connection.model('Match', matchSchema);
};