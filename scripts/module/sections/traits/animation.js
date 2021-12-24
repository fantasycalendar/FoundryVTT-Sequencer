import { is_real_number } from "../../lib/lib.js";

export default {

    /**
     * Base properties
     */
    _animations: null,

    /**
     * Animates a property on the target of the animation.
     *
     * @param {string} inTarget
     * @param {string} inPropertyName
     * @param {object} inOptions
     *      @param {Number} inOptions.from       - a single number from which to animate
     *      @param {Number} inOptions.to         - a single number to which to animate
     *      @param {Number} inOptions.duration   - how long in ms the animation should take
     *      @param {Number} inOptions.delay      - inserts a delay in ms before the animation starts
     *      @param {String} inOptions.ease       - what type of easing the animation should use
     *      @param {Boolean} inOptions.gridUnits - if animating width or height, this will set it to work in the scene's grid units
     *
     * @returns this
     */
    animateProperty(inTarget, inPropertyName, inOptions = {}) {
        if (!this._animations) this._animations = [];

        if (typeof inPropertyName !== "string") throw this.sequence._customError(this, "animateProperty", `inPropertyName must be of type string`);
        if (typeof inTarget !== "string") throw this.sequence._customError(this, "animateProperty", `inTarget must be of type string`);
        if (!is_real_number(inOptions.from)) throw this.sequence._customError(this, "animateProperty", `inOptions.from must be of type number`);
        if (!is_real_number(inOptions.to)) throw this.sequence._customError(this, "animateProperty", `inOptions.to must be of type number`);
        if (!is_real_number(inOptions.duration)) throw this.sequence._customError(this, "animateProperty", `inOptions.duration must be of type number`);
        if (inOptions?.delay !== undefined && !is_real_number(inOptions.delay)) throw this.sequence._customError(this, "animateProperty", `inOptions.delay must be of type number`);
        if (inOptions?.ease !== undefined && typeof inOptions.ease !== "string") throw this.sequence._customError(this, "animateProperty", `inOptions.ease must be of type string`);
        if (inOptions?.gridUnits !== undefined){
            if(typeof inOptions.gridUnits !== "boolean"){
                throw this.sequence._customError(this, "animateProperty", `inOptions.gridUnits must be of type boolean`);
            }
            if(inOptions.gridUnits && !(inPropertyName === "width" || inPropertyName === "height")){
                throw this.sequence._customError(this, "animateProperty", `if inOptions.gridUnits is true, inPropertyName must be "width" or "height"`);
            }
        }

        this._animations.push({
            target: inTarget,
            propertyName: inPropertyName,
            from: inOptions?.from,
            to: inOptions?.to,
            duration: inOptions?.duration ?? 0,
            delay: inOptions?.delay ?? 0,
            ease: inOptions?.ease ?? "linear",
            looping: false,
            gridUnits: inOptions?.gridUnits ?? false
        });

        return this;

    },

    /**
     * Loops a property between a set of values on the target
     *
     * @param {string} inTarget
     * @param {string} inPropertyName
     * @param {object} inOptions
     *      @param {Number} inOptions.from       - a single number from which to loop
     *      @param {Number} inOptions.to         - a single number to which to loop
     *      @param {Number} inOptions.values     - an array of values to loop between
     *      @param {Number} inOptions.duration   - how long in ms the loop should take
     *      @param {Number} inOptions.loops      - how many loops in total this animation should go through - if none are specified, the loop is indefinite
     *      @param {Number} inOptions.delay      - inserts a delay in ms before the animation starts
     *      @param {String} inOptions.ease       - what type of easing the animation should use
     *      @param {Boolean} inOptions.pingPong  - sets whether loop should interpolate to the first value after it reaches the first value, or simply set it to the first value
     *      @param {Boolean} inOptions.gridUnits - if animating width or height, this will set it to work in the scene's grid units
     *
     * @returns this
     */
    loopProperty(inTarget, inPropertyName, inOptions = {}) {
        if (!this._animations) this._animations = [];

        if (typeof inPropertyName !== "string") throw this.sequence._customError(this, "animateLoop", `inPropertyName must be of type string`);
        if (typeof inTarget !== "string") throw this.sequence._customError(this, "animateLoop", `inTarget must be of type string`);

        if (!inOptions?.values) {
            if (!inOptions?.from === undefined || !inOptions?.to === undefined) throw this.sequence._customError(this, "animateLoop", `if inOptions.values is not set, you must provide inOptions.from and inOptions.to`);
            if (!is_real_number(inOptions.from)) throw this.sequence._customError(this, "animateLoop", `inOptions.from must be of type number`);
            if (!is_real_number(inOptions.to)) throw this.sequence._customError(this, "animateLoop", `inOptions.to must be of type number`);
            inOptions.values = [inOptions?.from, inOptions?.to];
            delete inOptions.from;
            delete inOptions.to;
        } else {
            if (!Array.isArray(inOptions.values)) throw this.sequence._customError(this, "animateLoop", `inOptions.values must be of type array`);
            inOptions.values.forEach(value => {
                if (!is_real_number(value)) throw this.sequence._customError(this, "animateLoop", `values in inOptions.keys must be of type number`);
            });
        }

        if (!is_real_number(inOptions.duration)) throw this.sequence._customError(this, "animateLoop", `inOptions.duration must be of type number`);

        if (inOptions?.delay !== undefined && !is_real_number(inOptions.delay)) throw this.sequence._customError(this, "animateLoop", `inOptions.delay must be of type number`);
        if (inOptions?.ease !== undefined && typeof inOptions.ease !== "string") throw this.sequence._customError(this, "animateLoop", `inOptions.ease must be of type string`);
        if (inOptions?.loops !== undefined && !is_real_number(inOptions.loops)) throw this.sequence._customError(this, "animateLoop", `inOptions.loops must be of type number`);
        if (inOptions?.pingPong !== undefined && typeof inOptions.pingPong !== "boolean") throw this.sequence._customError(this, "animateLoop", `inOptions.loops must be of type boolean`);
        if (inOptions?.gridUnits !== undefined){
            if(typeof inOptions.gridUnits !== "boolean"){
                throw this.sequence._customError(this, "loopProperty", `inOptions.gridUnits must be of type boolean`);
            }
            if(inOptions.gridUnits && !(inPropertyName === "width" || inPropertyName === "height")){
                throw this.sequence._customError(this, "loopProperty", `if inOptions.gridUnits is true, inPropertyName must be "width" or "height"`);
            }
        }

        this._animations.push({
            target: inTarget,
            propertyName: inPropertyName,
            values: inOptions?.values,
            duration: inOptions?.duration ?? 0,
            delay: inOptions?.delay ?? 0,
            ease: inOptions?.ease ?? "linear",
            looping: true,
            loops: inOptions?.loops,
            indefinite: inOptions?.loops === undefined,
            pingPong: inOptions?.pingPong ?? false,
            gridUnits: inOptions?.gridUnits ?? false
        });

        return this;

    }

}