export default {

    _users: [],

    _addUser(inUser) {
        if (typeof inUser !== "string") throw this.sequence._throwError(this, "_addUser", "inUser must be of type string");
        if (!game.users.has(inUser)) throw this.sequence._throwError(this, "_addUser", `user with id "${inUser}" does not exist!`);
        if (!this._users.includes(inUser)) this._users.push(inUser);
    },

    _deleteUser(inUser) {
        if (this._users.includes(inUser)) {
            let index = this._users.indexOf(inUser);
            this._users.splice(index, 1);
        }
    },

    /**
     * Causes section to be executed only locally, and not push to other connected clients.
     *
     * @param {boolean} inLocally
     * @returns this
     */
    locally(inLocally = true) {
        if (inLocally) this._addUser(game.userId);
        else this._deleteUser(game.userId);
        return this;
    },

    /**
     * Causes the section to be executed for only a set of users.
     *
     * @param {string|array} inUsers
     * @returns this
     */
    forUsers(inUsers) {
        if (!Array.isArray(inUsers)) {
            if (typeof inUsers !== "string") throw this.sequence._throwError(this, "forUsers", "inUser must be of type string");
            inUsers = [inUsers];
        }
        inUsers.forEach(u => this._addUser(u));
        return this;
    }

}