export default {

    _scaleMin: false,
    _scaleMax: false,
    _scaleIn: false,
    _scaleOut: false,

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
        if (!(typeof inScaleMin === "number" || typeof inScaleMin === "object")) throw this.sequence._throwError(this, "scale", "inScale must be of type number or object");
        if (typeof inScaleMin !== "number") {
            if (inScaleMax && typeof inScaleMax === "number") {
                throw this.sequence._throwError(this, "scale", "if inScaleMin is a number, inScaleMax must also be of type number");
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
        if (typeof options !== "object") throw this.sequence._throwError(this, "scaleIn", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (typeof duration !== "number") throw this.sequence._throwError(this, "scaleIn", "duration must be of type number");
        if (!(typeof scale === "number" || typeof scale === "object")) throw this.sequence._throwError(this, "scaleIn", "scale must be of type number or object");
        if (typeof options.ease !== "string") throw this.sequence._throwError(this, "scaleIn", "options.ease must be of type string");
        if (typeof options.delay !== "number") throw this.sequence._throwError(this, "scaleIn", "options.delay must be of type number");
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
        if (typeof options !== "object") throw this.sequence._throwError(this, "scaleOut", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if (typeof duration !== "number") throw this.sequence._throwError(this, "scaleOut", "duration must be of type number");
        if (!(typeof scale === "number" || typeof scale === "object")) throw this.sequence._throwError(this, "scaleOut", "scale must be of type number or object");
        if (typeof options.ease !== "string") throw this.sequence._throwError(this, "scaleOut", "options.ease must be of type string");
        if (typeof options.delay !== "number") throw this.sequence._throwError(this, "scaleOut", "options.delay must be of type number");
        this._scaleOut = {
            value: scale,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

};