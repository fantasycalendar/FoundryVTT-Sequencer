export default {

	_hasTime: true,
	_isRange: false,
	_startTime: false,
	_startPerc: false,
	_endTime: false,
	_endPerc: false,

	/**
	 * Sets the start and end time of the section, playing only that range
	 *
	 * @param {number} inMsStart
	 * @param {number} inMsEnd
	 * @returns this
	 */
	timeRange(inMsStart, inMsEnd) {
		if (typeof inMsStart !== "number") this.sequence._throwError(this, "timeRange", "inMsStart must be of type number");
		if (typeof inMsEnd !== "number") this.sequence._throwError(this, "timeRange", "inMsEnd must be of type number");
		this._startTime = inMsStart;
		this._endTime = inMsEnd;
		this._isRange = true;
		return this;
	},

	/**
	 * Sets the start time of the section.
	 *
	 * @param {number} inMs
	 * @returns this
	 */
	startTime(inMs){
		if(typeof inMs !== "number") this.sequence._throwError(this, "startTime", "inMs must be of type number");
		this._startTime = inMs;
		this._startPerc = false;
		this._isRange = false;
		return this;
	},

	/**
	 * Sets the start time of the section based on a percentage from its total duration.
	 *
	 * @param {number} inPercentage
	 * @returns this
	 */
	startTimePerc(inPercentage){
		if(typeof inPercentage !== "number") this.sequence._throwError(this, "startTimePerc", "inPercentage must be of type number");
		this._startTime = inPercentage;
		this._startPerc = true;
		this._isRange = false;
		return this;
	},

	/**
	 * Sets the ending time of the section (from the end).
	 *
	 * @param {number} inMs
	 * @returns this
	 */
	endTime(inMs){
		if(typeof inMs !== "number") this.sequence._throwError(this, "endTime", "inMs must be of type number");
		this._endTime = inMs;
		this._endPerc = false;
		this._isRange = false;
		return this;
	},

	/**
	 * Sets the ending time of the section based on a percentage from the total duration.
	 *
	 * @param {number} inPercentage
	 * @returns this
	 */
	endTimePerc(inPercentage){
		if(typeof inPercentage !== "number") this.sequence._throwError(this, "endTimePerc", "inPercentage must be of type number");
		this._endTime = inPercentage;
		this._endPerc = true;
		this._isRange = false;
		return this;
	}

}