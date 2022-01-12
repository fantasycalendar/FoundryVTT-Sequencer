import { is_real_number } from "../../lib/lib.js";

export default {

    /**
     * Base properties
     */
    _opacity: null,
    _fadeIn: null,
    _fadeOut: null,

    /**
     * Sets the opacity of the effect. If used with ._fadeIn() and/or ._fadeOut(), this defines what the effect will fade to/from
     *
     * @param {number} inOpacity
     * @returns this
     */
    opacity(inOpacity) {
        if (!is_real_number(inOpacity)) throw this.sequence._customError(this, "opacity", "inOpacity must be of type number");
        this._opacity = inOpacity;
        return this;
    },

    /**
     * Causes the effect to fade in when played
     *
     * @param {number} duration     How long the fade should be
     * @param {object} [options]    Additional options, such as easing and delay
     * @returns this
     */
    fadeIn(duration, options = {}) {
        if (typeof options !== "object") throw this.sequence._customError(this, "fadeIn", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (!is_real_number(duration)) throw this.sequence._customError(this, "fadeIn", "duration must be of type number");
        if (typeof options.ease !== "string") throw this.sequence._customError(this, "fadeIn", "options.ease must be of type string");
        if (!is_real_number(options.delay)) throw this.sequence._customError(this, "fadeIn", "options.delay must be of type number");
        this._fadeIn = {
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    },

    /**
     * Causes the effect to fade out at the end of the effect's duration
     *
     * @param {number} duration     How long the fade should be
     * @param {object} [options]    Additional options, such as easing and delay
     * @returns this
     */
    fadeOut(duration, options = {}) {
        if (typeof options !== "object") throw this.sequence._customError(this, "fadeOut", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (!is_real_number(duration)) throw this.sequence._customError(this, "fadeOut", "duration must be of type number");
        if (typeof options.ease !== "string") throw this.sequence._customError(this, "fadeOut", "ease must be of type string");
        if (!is_real_number(options.delay)) throw this.sequence._customError(this, "fadeOut", "delay must be of type number");
        this._fadeOut = {
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

}