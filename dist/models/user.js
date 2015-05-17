'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    access_level: { type: Number, 'default': 0 },
    steam_id: { type: String, required: true },
    steam_persona_name: String,
    steam_profile_url: String,
    steam_avatar: String,
    steam_avatar_medium: String,
    steam_avatar_full: String,
    steam_real_name: String
});

var User = mongoose.model('User', userSchema);

module.exports = User;