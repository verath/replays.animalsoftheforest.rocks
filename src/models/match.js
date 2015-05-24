const mongoose = require('mongoose');
const moment = require('moment');
const Schema = mongoose.Schema;

const MATCH_LOBBY_TYPE = {
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

const MATCH_REPLAY_FETCH_STATUS = {
    "NotStarted": "NotStarted",
    "Started": "Started",
    "Expired": "Expired",
    "Finished": "Finished"
};

/**
 * Time before a replay added to the replay fetch queue is considered expired
 * @type {{hours: number}}
 */
const MATCH_REPLAY_FETCH_TIMEOUT = {hours: 12};

const matchSchema = new Schema({
    replay_url: String, // The url of the match replay file
    replay_fetch_queue_added_at: Date, // The time when the replay was added to the fetch queue
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

// Virtual properties
matchSchema.virtual('replay_fetch_status').get(function () {
    if (this.replay_url) {
        return MATCH_REPLAY_FETCH_STATUS.Finished;
    } else if (!this.replay_fetch_queue_added_at) {
        return MATCH_REPLAY_FETCH_STATUS.NotStarted;
    } else {
        const isExpired = moment(this.replay_fetch_queue_added_at)
            .add(MATCH_REPLAY_FETCH_TIMEOUT)
            .isBefore(moment());
        return isExpired ? MATCH_REPLAY_FETCH_STATUS.Expired : MATCH_REPLAY_FETCH_STATUS.Started;
    }
}).set(function (value) {
    if (value === MATCH_REPLAY_FETCH_STATUS.Started) {
        this.replay_fetch_queue_added_at = new Date();
    }
});


// Instance Methods
matchSchema.methods = {

    /**
     * Tests if the match replays is expired.
     * @returns {boolean} True if the replay is expired.
     */
    isSteamReplayExpired: function () {
        const expiredThreshold = moment().subtract(7, 'days').unix();
        const matchStartTime = moment.unix(this.steam_start_time);
        return !!matchStartTime.isBefore(expiredThreshold);
    },

    /**
     * Returns whether this match was a ranked match.
     * @returns {boolean} True if this match was ranked.
     */
    isRanked: function () {
        return this.steam_lobby_type === MATCH_LOBBY_TYPE.Ranked;
    }
};


module.exports = (connection) => {
    connection.model('Match', matchSchema);
};