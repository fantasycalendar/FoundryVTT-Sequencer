import Section from "./section.js";

export default class AnimatedSection extends Section{

    constructor(inSequence) {
        super(inSequence);
        this._moveSpeed = false;
        this._angle = false;
        this._rotateIn = false;
        this._rotateOut = false;
        this._opacity = false;
    }

    centerInView(){
        this._from = {
            x: canvas.background.width/2,
            y: canvas.background.height/2,
        }
        this.center();
        return this;
    }

    /**
     * Sets the opacity of the effect. If used with .fadeIn() and/or .fadeOut(), this defines what the effect will fade to/from
     *
     * @param {number} inOpacity
     * @returns {AnimatedSection} this
     */
    opacity(inOpacity){
        if(typeof inOpacity !== "number") this.sequence._throwError(this, "opacity", "inOpacity must be of type number");
        this._opacity = inOpacity;
        return this;
    }

    /**
     * Sets the speed (pixels per frame) to move the target object
     *
     * @param {number} inSpeed
     * @returns {AnimatedSection} this
     */
    moveSpeed(inSpeed){
        if(typeof inSpeed !== "number") this.sequence._throwError(this, "moveSpeed", "inSpeed must be of type number");
        this._moveSpeed = inSpeed;
        return this;
    }

    /**
     * Sets the rotation of the effect or animation, which is added on top of the calculated rotation after .rotateTowards() or .randomRotation()
     *
     * @param {number} inRotation
     * @returns {AnimatedSection} this
     */
    rotate(inRotation){
        if(typeof inRotation !== "number") this.sequence._throwError(this, "opacity", "inRotation must be of type number");
        this._angle = inRotation;
        return this;
    }

    /**
     *  Causes the effect to rotate when it starts playing
     *
     * @param {number} degrees
     * @param {number} duration
     * @param {object} [options] options
     * @returns {AnimatedSection} this
     */
    rotateIn(degrees, duration, options={}){
        if(typeof options !== "object") this.sequence._throwError(this, "rotateIn", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof degrees !== "number") this.sequence._throwError(this, "rotateOut", "degrees must be of type number");
        if(typeof duration !== "number") this.sequence._throwError(this, "rotateOut", "duration must be of type number");
        if(typeof options.ease !== "string") this.sequence._throwError(this, "rotateIn", "options.ease must be of type string");
        if(typeof options.delay !== "number") this.sequence._throwError(this, "rotateIn", "options.delay must be of type number");
        this._rotateIn = {
            value: degrees,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

    /**
     *  Causes the effect to rotate at the end of the effect's duration
     *
     * @param {number} degrees
     * @param {number} duration
     * @param {object} [options] options
     * @returns {AnimatedSection} this
     */
    rotateOut(degrees, duration, options={}){
        if(typeof options !== "object") this.sequence._throwError(this, "rotateOut", "options must be of type object");
        options = foundry.utils.mergeObject({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof degrees !== "number") this.sequence._throwError(this, "rotateOut", "degrees must be of type number");
        if(typeof duration !== "number") this.sequence._throwError(this, "rotateOut", "duration must be of type number");
        if(typeof options.ease !== "string") this.sequence._throwError(this, "rotateOut", "options.ease must be of type string");
        if(typeof options.delay !== "number") this.sequence._throwError(this, "rotateOut", "options.delay must be of type number");
        this._rotateOut = {
            value: degrees,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

    _findObjectById(inId){
        for(let layer of canvas.layers){
            let obj = layer?.objects?.children?.find(obj => obj.id === inId)
            if(obj) return obj;
        }
    }

    _validateLocation(inLocation) {
        let id = inLocation?._id ?? inLocation;
        if(typeof id === "string"){
            inLocation = this._findObjectById(id) ?? id;
        }
        return inLocation;
    }

}