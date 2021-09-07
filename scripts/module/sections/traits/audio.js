export default {

	/**
	 * Base properties
	 */
	_volume: 0.8,
	_fadeInAudio: false,
	_fadeOutAudio: false,

	/**
	 * Sets the volume of the sound.
	 *
	 * @param {number} inVolume
	 * @returns this
	 */
	volume(inVolume) {
		if(typeof inVolume !== "number") throw this.sequence._throwError(this, "volume", "inVolume must be of type number");
		this._volume = Math.max(0, Math.min(1.0, inVolume));
		return this;
	},

	/**
	 * Causes the animated section to fade in its audio (if any) when played
	 *
	 * @param {number} duration     How long the fade should be
	 * @param {object} [options]    Additional options, such as easing and delay
	 * @returns this
	 */
	fadeInAudio(duration, options={}) {
		if(typeof options !== "object") throw this.sequence._throwError(this, "fadeInAudio", "options must be of type object");
		options = foundry.utils.mergeObject({
			ease: "linear",
			delay: 0
		}, options);
		if(typeof duration !== "number") throw this.sequence._throwError(this, "fadeInAudio", "duration must be of type number");
		if(typeof options.ease !== "string") throw this.sequence._throwError(this, "fadeInAudio", "options.ease must be of type string");
		if(typeof options.delay !== "number") throw this.sequence._throwError(this, "fadeInAudio", "options.delay must be of type number");
		this._fadeInAudio = {
			duration: duration,
			ease: options.ease,
			delay: options.delay
		};
		return this;
	},

	/**
	 * Causes the audio to fade out at the end of the animated section's duration
	 *
	 * @param {number} duration     How long the fade should be
	 * @param {object} [options]    Additional options, such as easing and delay
	 * @returns this
	 */
	fadeOutAudio(duration, options={}) {
		if(typeof options !== "object") throw this.sequence._throwError(this, "fadeOutAudio", "options must be of type object");
		options = foundry.utils.mergeObject({
			ease: "linear",
			delay: 0
		}, options);
		if(typeof duration !== "number") throw this.sequence._throwError(this, "fadeOutAudio", "duration must be of type number");
		if(typeof options.ease !== "string") throw this.sequence._throwError(this, "fadeOutAudio", "ease must be of type string");
		if(typeof options.delay !== "number") throw this.sequence._throwError(this, "fadeOutAudio", "delay must be of type number");
		this._fadeOutAudio = {
			duration: duration,
			ease: options.ease,
			delay: options.delay
		};
		return this;
	}

}