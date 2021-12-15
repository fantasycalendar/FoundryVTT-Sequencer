import { is_real_number } from "../../lib/lib.js";

export default {

    _scaleMin: null,
    _scaleMax: null,
    _scaleIn: null,
    _scaleOut: null,

    /**
     *  A method that can take the following:
     *  - A number to set the scale uniformly
     *  - An object with x and y for non-uniform scaling
     *  - Two numbers which the Sequencer will randomly pick a uniform scale between
     *
     * @param {number|object} inScaleMin
     * @param {number} [inScaleMax] inScaleMax
     * @returns this
     */
    scale(inScaleMin, inScaleMax) {
        if (!is_real_number(inScaleMin) && typeof inScaleMin !== "object") throw this.sequence._customError(this, "scale", "inScale must be of type number or object");
        if (is_real_number(inScaleMin)) {
            if (inScaleMax && !is_real_number(inScaleMax)) {
                throw this.sequence._customError(this, "scale", "if inScaleMin is a number, inScaleMax must also be of type number");
            }
        }
        this._scaleMin = inScaleMin;
        this._scaleMax = inScaleMax ?? false;
        return this;
    },

    /**
     *  Causes the effect to scale when it starts playing
     *
     * @param {number|object} scale
     * @param {number} duration
     * @param {object} [options] options
     * @returns this
     */
    scaleIn(scale, duration, options = {}) {
        if (typeof options !== "object") throw this.sequence._customError(this, "scaleIn", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (!is_real_number(duration)) throw this.sequence._customError(this, "scaleIn", "duration must be of type number");
        if (!is_real_number(scale) && typeof scale !== "object") throw this.sequence._customError(this, "scaleIn", "scale must be of type number or object");
        if (typeof options.ease !== "string") throw this.sequence._customError(this, "scaleIn", "options.ease must be of type string");
        if (!is_real_number(options.delay)) throw this.sequence._customError(this, "scaleIn", "options.delay must be of type number");
        this._scaleIn = {
            value: scale,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    },

    /**
     *  Causes the effect to scale at the end of the effect's duration
     *
     * @param {number|object} scale
     * @param {number} duration
     * @param {object} [options] options
     * @returns this
     */
    scaleOut(scale, duration, options = {}) {
        if (typeof options !== "object") throw this.sequence._customError(this, "scaleOut", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (!is_real_number(duration)) throw this.sequence._customError(this, "scaleOut", "duration must be of type number");
        if (!is_real_number(scale) && typeof scale !== "object") throw this.sequence._customError(this, "scaleOut", "scale must be of type number or object");
        if (typeof options.ease !== "string") throw this.sequence._customError(this, "scaleOut", "options.ease must be of type string");
        if (!is_real_number(options.delay)) throw this.sequence._customError(this, "scaleOut", "options.delay must be of type number");
        this._scaleOut = {
            value: scale,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

};