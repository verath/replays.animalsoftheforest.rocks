/**
 * A wrapper around a user table entity, providing more sensible names
 */
class User {
    constructor(userEntity) {
        this._entity = userEntity;
    }

    /**
     * Getter for the underlying entity this model is for.
     * @returns {*} The entity for this user
     */
    get entity() {
        return this._entity;
    }

    /**
     * Returns the Id for this user.
     * @returns {String} The id for this user. This is the same as the 64-bit SteamId.
     */
    get id() {
        return this._entity.RowKey['_'];
    }

    /**
     * Returns this user's permission level.
     * @returns {Number} The user's permission level.
     */
    get permissionLevel() {
        return this._entity.PermissionLevel['_'];
    }
}

module.exports = User;