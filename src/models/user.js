const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    access_level: {type: Number, "default": 0},
    latest_match_seq_num: {type: Number, "default": 0},

    steam_id: {type: String, required: true, unique: true},
    steam_persona_name: String,
    steam_profile_url: String,
    steam_avatar: String,
    steam_avatar_medium: String,
    steam_avatar_full: String,
    steam_real_name: String
});

// Disable auto index as it has a big performance impact
userSchema.set('autoIndex', false);

module.exports = (connection) => {
    connection.model('User', userSchema);
};