const mongoose = require('mongoose');
const moment = require('moment');
const Schema = mongoose.Schema;

const matchSchema = new Schema({
    replay_url: String, // The url of the match replay file
    team_ids: [Number], // For easier querying of matches for a team

    steam_match_id: {type: Number, unique: true},
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
// Disable auto index as it has a big performance impact
matchSchema.set('autoIndex', false);

const MATCH_LOBBY_TYPES = {
    "Invalid": -1,
    "UnRanked": 0,
    "Practise": 1,
    "Tournament": 2,
    "Tutorial": 3,
    "CoopWithBots": 4,
    "TeamMatch": 5,
    "SoloQueue": 6,
    "Ranked": 7
};

// Instance Methods
matchSchema.methods = {

    /**
     * Tests if the match replays is expired.
     * @returns {boolean} True if the replay is expired.
     */
    isSteamReplayExpired: () => {
        const expiredThreshold = moment().subtract(7, 'days').unix();
        const matchStartTime = moment.unix(this.steam_start_time);
        return !!matchStartTime.isBefore(expiredThreshold);
    },

    /**
     * Returns whether this match was a ranked match.
     * @returns {boolean} True if this match was ranked.
     */
    isRanked: () => {
        return this.steam_lobby_type === MATCH_LOBBY_TYPES.Ranked;
    }
};


module.exports = (connection) => {
    connection.model('Match', matchSchema);
};