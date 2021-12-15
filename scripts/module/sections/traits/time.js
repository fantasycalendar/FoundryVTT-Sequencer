import { is_real_number } from "../../lib/lib.js";

export default {

    _hasTime: true,
    _isRange: false,
    _startTime: null,
    _startPerc: null,
    _endTime: null,
    _endPerc: null,

    /**
     * Sets the start and end time of the section, playing only that range
     *
     * @param {number} inMsStart
     * @param {number} inMsEnd
     * @returns this
     */
    timeRange(inMsStart, inMsEnd) {
        if (!is_real_number(inMsStart)) throw this.sequence._customError(this, "timeRange", "inMsStart must be of type number");
        if (!is_real_number(inMsEnd)) throw this.sequence._customError(this, "timeRange", "inMsEnd must be of type number");
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
    startTime(inMs) {
        if (!is_real_number(inMs)) throw this.sequence._customError(this, "startTime", "inMs must be of type number");
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
    startTimePerc(inPercentage) {
        if (!is_real_number(inPercentage)) throw this.sequence._customError(this, "startTimePerc", "inPercentage must be of type number");
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
    endTime(inMs) {
        if (!is_real_number(inMs)) throw this.sequence._customError(this, "endTime", "inMs must be of type number");
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
    endTimePerc(inPercentage) {
        if (!is_real_number(inPercentage)) throw this.sequence._customError(this, "endTimePerc", "inPercentage must be of type number");
        this._endTime = inPercentage;
        this._endPerc = true;
        this._isRange = false;
        return this;
    }

}