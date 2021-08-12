export default {

	/**
	 * Base properties
	 */
	_moveTowards: false,
	_moveSpeed: false,

	/**
	 * Sets the location to move the target object to
	 *
	 * @param {object|string} inTarget
	 * @param {object} options
	 * @returns this
	 */
	moveTowards(inTarget, options = {}){
		options = foundry.utils.mergeObject({
			ease: "linear",
			delay: 0,
			rotate: true,
			target: { x: 0, y: 0 }
		}, options);
		if(typeof options.ease !== "string") this.sequence._throwError(this, "moveTowards", "options.ease must be of type string");
		if(typeof options.delay !== "number") this.sequence._throwError(this, "moveTowards", "options.delay must be of type number");
		if(typeof options.rotate !== "boolean") this.sequence._throwError(this, "moveTowards", "options.rotate must be of type boolean");
		inTarget = this._validateLocation(inTarget);
		if(!inTarget) this.sequence._throwError(this, "moveTowards", "could not find position of given object");
		options.target = this._validateLocation(inTarget);
		this._moveTowards = options;
		return this;
	},

	/**
	 * Sets the speed (pixels per frame) to move the target object
	 *
	 * @param {number} inSpeed
	 * @returns this
	 */
	moveSpeed(inSpeed){
		if(typeof inSpeed !== "number") this.sequence._throwError(this, "moveSpeed", "inSpeed must be of type number");
		this._moveSpeed = inSpeed;
		return this;
	}
}