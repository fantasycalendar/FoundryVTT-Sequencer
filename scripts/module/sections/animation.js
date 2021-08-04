import {easeFunctions} from "../canvas-effects/ease.js";
import * as lib from "../lib.js";
import Section from "./section.js";

// Traits
import files from "./traits/files.js";
import moves from "./traits/moves.js";
import opacity from "./traits/opacity.js";
import rotation from "./traits/rotation.js";

class AnimationSection extends Section{

    constructor(inSequence, inTarget) {
        super(inSequence);
        this._teleportTo = false;
        this._originObject = false;
        this._moveSpeed = 23;
        this._offset = { x: 0, y: 0 };
        this._closestSquare = false;
        this._snapToSquare = false;
        if(inTarget) this.on(inTarget);
    }

    /**
     * Sets the target object to be animated
     *
     * @param {object|string} inTarget
     * @returns {AnimationSection} this
     */
    on(inTarget){
        inTarget = this._validateLocation(inTarget);
        if(!inTarget) this.sequence._throwError(this, "on", "could not find position of given object");
        this._originObject = this._validateLocation(inTarget);
        return this;
    }

    /**
     * Sets the location to teleport the target object to
     *
     * @param {object|string} inTarget
     * @param {object} options
     * @returns {AnimationSection} this
     */
    teleportTo(inTarget, options = {}){
        options = foundry.utils.mergeObject({
            delay: 0,
            target: { x: 0, y: 0 }
        }, options);
        if(typeof options.delay !== "number") this.sequence._throwError(this, "teleportTo", "options.delay must be of type number");
        inTarget = this._validateLocation(inTarget);
        if(!inTarget) this.sequence._throwError(this, "teleportTo", "could not find position of given object");
        options.target = this._validateLocation(inTarget);
        this._teleportTo = options;
        return this;
    }

    /**
     * Causes the movement or teleportation to be offset in the X and/or Y axis
     *
     * @param {object} inOffset
     * @returns {AnimationSection} this
     */
    offset(inOffset){
        inOffset = foundry.utils.mergeObject({ x: 0, y: 0 }, inOffset);
        this._offset = this._validateLocation(inOffset);
        return this;
    }

    /**
     * Causes the movement or teleportation to pick the closest non-intersecting square, if the target is a token or tile
     *
     * @param {boolean} inBool
     * @returns {AnimationSection} this
     */
    closestSquare(inBool = true){
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "closestSquare", "inBool must be of type boolean");
        this._closestSquare = inBool;
        return this;
    }

    /**
     * Causes the final location to be snapped to its square
     *
     * @param {boolean} inBool
     * @returns {AnimationSection} this
     */
    snapToSquare(inBool = true){
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "snapToSquare", "inBool must be of type boolean");
        this._snapToSquare = inBool;
        return this;
    }

    async _run() {
        return this._runAnimate();
    }

    async _updateObject(obj, attributes, animate = false, animation={}){
        await obj.document.update(attributes, {animate: animate, animation: animation});
    }

    async _execute(){
        if(!(await this._shouldPlay())) return;
        return new Promise(async (resolve) => {
            if (this._shouldAsync) {
                await this._run();
            } else {
                this._run();
            }
            resolve();
        });
    }

    _getClosestSquare(origin, target) {

        let originLoc = this._getCleanPosition(origin);
        let targetLoc = this._getCleanPosition(target);

        let originSizeWidth = (origin?.data?.width ?? 1) * canvas.grid.size;
        let originSizeHeight = (origin?.data?.height ?? 1) * canvas.grid.size;
        let originBottom = Math.max(originSizeWidth - canvas.grid.size, canvas.grid.size);
        let originRight = Math.max(originSizeHeight - canvas.grid.size, canvas.grid.size);

        let targetSizeWidth = (target?.data?.width ?? 1) * canvas.grid.size;
        let targetSizeHeight = (target?.data?.height ?? 1) * canvas.grid.size;

        let ray = new Ray(originLoc, targetLoc);

        let dx = ray.dx;
        let dy = ray.dy;

        if (dx > 0 && Math.abs(dx) > originRight) {
            dx -= originSizeWidth;
        } else if (dx < 0 && Math.abs(dx) > targetSizeWidth){
            dx += targetSizeHeight;
        }else{
            dx = 0;
        }

        if (dy > 0 && Math.abs(dy) > originBottom) {
            dy -= originSizeHeight;
        } else if (dy < 0 && Math.abs(dy) > targetSizeHeight){
            dy += targetSizeHeight;
        }else{
            dy = 0;
        }

        return {
            x: originLoc.x + dx,
            y: originLoc.y + dy
        };

    }

    _getCleanPosition(obj, measure = false){

        let pos = {
            x: obj?.data?.x ?? obj?.x ?? 0,
            y: obj?.data?.y ?? obj?.y ?? 0
        }

        if(obj instanceof MeasuredTemplate){
            if(measure){
                if(obj.data.t === "cone" || obj.data.t === "ray"){
                    pos.x = obj.ray.B.x;
                    pos.y = obj.ray.B.y;
                }
            }
        }

        return pos;
    }

    _snapLocationToGrid(inLocation){
        let coords = canvas.grid.grid.getGridPositionFromPixels(inLocation.x, inLocation.y);
        return {
            x: coords[1] * canvas.grid.size,
            y: coords[0] * canvas.grid.size
        }
    }

    /**
     * This needs a rewrite, jeesus.
     */
    async _runAnimate(){

        let animData = {
            attributes: [],
            maxFPS: 1000 / game.settings.get('core', "maxFPS"),
            lastTimespan: performance.now(),
            totalDt: 0
        }

        let overallDuration = this._duration ? this._duration : 0;

        if(this._rotateTowards){

            let offset = (this._angle ? this._angle : 0) + this._rotateTowards.offset;

            let targetLoc = this._moveTowards?.target || this._teleportTo?.target || this._originObject;

            targetLoc = this._closestSquare
                ? this._getClosestSquare(this._originObject, targetLoc)
                : this._getCleanPosition(targetLoc);

            targetLoc.x += this._offset.x;
            targetLoc.y += this._offset.y;

            if(this._snapToSquare) targetLoc = this._snapLocationToGrid(targetLoc);

            animData.attributes.push({
                name: "rotationTowards",
                offset: offset,
                origin: this._originObject,
                originLocation: targetLoc,
                target: this._rotateTowards.target,
                towardsCenter: this._rotateTowards.towardsCenter,
                from: false,
                to: false,
                progress: 0,
                done: false,
                duration: this._rotateTowards.duration,
                durationDone: 0,
                delay: this._rotateTowards.delay,
                ease: easeFunctions[this._rotateTowards.ease]
            })

            let rotateDuration = this._rotateTowards.duration + this._rotateTowards.delay;

            overallDuration = overallDuration > rotateDuration ? overallDuration : rotateDuration;

        }

        if(this._fadeIn){

            let to = typeof this._opacity === "number" ? this._opacity : 1.0;

            animData.attributes.push({
                name: "alpha",
                from: 0.0,
                to: to,
                progress: 0,
                done: false,
                duration: this._fadeIn.duration,
                durationDone: 0,
                delay: this._fadeIn.delay,
                ease: easeFunctions[this._fadeIn.ease]
            })

            let fadeDuration = this._fadeIn.duration + this._fadeIn.delay;

            overallDuration = overallDuration > fadeDuration ? overallDuration : fadeDuration;

        }

        if(this._fadeInAudio && this._originObject?.data?.video?.volume !== undefined){

            let to = typeof this._volume === "number" ? this._volume : 1.0;

            animData.attributes.push({
                name: "video.volume",
                from: 0.0,
                to: to,
                progress: 0,
                done: false,
                duration: this._fadeInAudio.duration,
                durationDone: 0,
                delay: this._fadeInAudio.delay,
                ease: easeFunctions[this._fadeInAudio.ease]
            })

            let fadeDuration = this._fadeInAudio.duration + this._fadeInAudio.delay;

            overallDuration = overallDuration > fadeDuration ? overallDuration : fadeDuration;

        }

        if(this._rotateIn){

            let from = this._angle ? this._angle : this._originObject.data.rotation;
            let to = this._rotateIn.value;

            if(Math.abs(from - to) > 180){
                if(to < 0){
                    to += 360;
                }else if(from > to){
                    from -= 360;
                }
            }

            animData.attributes.push({
                name: "rotation",
                from: from,
                to: to,
                progress: 0,
                done: false,
                duration: this._rotateIn.duration,
                durationDone: 0,
                delay: this._rotateIn.delay,
                ease: easeFunctions[this._rotateIn.ease]
            })

            let rotateDuration = this._rotateIn.duration + this._rotateIn.delay;

            overallDuration = overallDuration > rotateDuration ? overallDuration : rotateDuration;

        }

        if(this._moveTowards){

            let originLoc = this._getCleanPosition(this._originObject);
            let targetLoc = this._closestSquare
                ? this._getClosestSquare(this._originObject, this._moveTowards.target)
                : this._getCleanPosition(this._moveTowards.target);

            targetLoc.x += this._offset.x;
            targetLoc.y += this._offset.y;

            if(this._snapToSquare) targetLoc = this._snapLocationToGrid(targetLoc);

            let originalDx = targetLoc.x - originLoc.x;
            let originalDy = targetLoc.y - originLoc.y;
            let originalDistance = Math.sqrt(originalDx * originalDx + originalDy * originalDy);

            let duration = this._duration
                ? this._duration
                : (originalDistance / this._moveSpeed) * animData.maxFPS;

            let moveDuration = duration + this._moveTowards.delay;

            overallDuration = overallDuration > moveDuration ? overallDuration : moveDuration;

            if (!this._duration && this._moveTowards.ease === "linear") {
                await this._updateObject(this._originObject, targetLoc, true);
            }else{
                animData.attributes.push({
                    name: "position",
                    origin: originLoc,
                    target: targetLoc,
                    originalDistance: originalDistance,
                    currentDistance: 0,
                    progress: 0,
                    speed: 0,
                    duration: duration,
                    done: false,
                    ease: easeFunctions[this._moveTowards.ease],
                    delay: this._moveTowards.delay
                })
            }
        }

        if(this._fadeOut){

            let from = typeof this._opacity === "number" ? this._opacity : this._originObject.alpha;

            animData.attributes.push({
                name: "alpha",
                from: from,
                to: 0.0,
                progress: 0,
                done: false,
                duration: this._fadeOut.duration,
                durationDone: 0,
                delay: overallDuration - this._fadeOut.duration,
                ease: easeFunctions[this._fadeOut.ease]
            })
        }

        if(this._fadeOutAudio && this._originObject?.data?.video?.volume !== undefined){

            let from = typeof this._volume === "number" ? this._volume : this._originObject.data.video.volume;

            animData.attributes.push({
                name: "video.volume",
                from: from,
                to: 0.0,
                progress: 0,
                done: false,
                duration: this._fadeOutAudio.duration,
                durationDone: 0,
                delay: overallDuration - this._fadeOutAudio.duration,
                ease: easeFunctions[this._fadeOutAudio.ease]
            })
        }

        if(this._rotateOut){

            let from = this._rotateOut.value;
            let to = this._angle ? this._angle : this._originObject.data.rotation;

            if(this._rotateIn) from += this._rotateIn.value;

            if(Math.abs(from - to) > 180){
                if(to < 0){
                    to += 360;
                }else if(from > to){
                    from -= 360;
                }
            }

            animData.attributes.push({
                name: "rotation",
                from: from,
                to: to,
                progress: 0,
                done: false,
                duration: this._rotateOut.duration,
                durationDone: 0,
                delay: overallDuration - this._rotateOut.duration,
                ease: easeFunctions[this._rotateOut.ease]
            });

        }

        if(this._teleportTo){
            setTimeout(async () => {
                let targetLocation = this._closestSquare
                    ? this._getClosestSquare(this._originObject, this._teleportTo.target)
                    : this._getCleanPosition(this._teleportTo.target);
                targetLocation.x += this._offset.x;
                targetLocation.y += this._offset.y;
                if(this._snapToSquare) targetLocation = this._snapLocationToGrid(targetLocation);
                await this._updateObject(this._originObject, targetLocation);
            }, this._teleportTo.delay);
            if(overallDuration <= this._teleportTo.delay){
                this._waitUntilFinished = true;
            }
            overallDuration = overallDuration > this._teleportTo.delay ? overallDuration : this._teleportTo.delay;
        }

        let updateAttributes = {};
        if(typeof this._angle === "number" && !this._rotateIn && !this._rotateOut){
            updateAttributes["rotation"] = this._angle;
        }

        if(typeof this._opacity === "number" && !this._fadeIn && !this._fadeOut){
            updateAttributes["alpha"] = this._opacity;
        }

        if(typeof this._volume === "number" && !this._fadeInAudio && !this._fadeOutAudio && this._originObject?.data?.video?.volume !== undefined){
            updateAttributes["video.volume"] = this._volume;
        }

        if(Object.keys(updateAttributes).length){
            await this._updateObject(this._originObject, updateAttributes);
        }

        return new Promise(async (resolve) => {
            this._animate(animData, resolve);
            setTimeout(resolve, Math.max(0, overallDuration + this._waitUntilFinishedDelay + animData.maxFPS));
        })

    }

    async _animate(animData, resolve, timespan){

        // If it's not the first tick
        if (timespan) {

            let animatedAttributes = {};

            let dt = timespan - animData.lastTimespan;

            // Limit to set FPS
            if (dt >= animData.maxFPS) {

                animData.totalDt += dt;

                for(let attribute of animData.attributes) {

                    if(attribute.done) continue;

                    if(animData.totalDt < attribute.delay) continue;

                    if(attribute.name === "position"){

                        attribute.speed = attribute.originalDistance / (attribute.duration / dt);

                        attribute.currentDistance += attribute.speed;

                        attribute.progress = attribute.currentDistance / attribute.originalDistance;

                        let x = lib.lerp(attribute.origin.x, attribute.target.x, attribute.ease(attribute.progress));
                        let y = lib.lerp(attribute.origin.y, attribute.target.y, attribute.ease(attribute.progress));

                        if (attribute.currentDistance >= attribute.originalDistance) {
                            x = attribute.target.x;
                            y = attribute.target.y;
                            attribute.done = true;
                        }

                        animatedAttributes['x'] = x;
                        animatedAttributes['y'] = y;

                    }else{

                        if(attribute.name === "rotationTowards" && !attribute.from && !attribute.to){

                            let target = attribute.target;
                            if(this._rotateTowards.towardsCenter) target = target?.center ?? target;

                            let ray = new Ray(attribute.originLocation, target)
                            let angle = (ray.angle * 180/Math.PI) - 90;
                            angle += attribute.offset;
                            attribute.from = attribute.origin.data.rotation;
                            attribute.to = angle;
                            if(Math.abs(attribute.from - attribute.to) > 180){
                                if(attribute.to < 0){
                                    attribute.to += 360;
                                }else if(attribute.from > attribute.to){
                                    attribute.from -= 360;
                                }
                            }
                            attribute.name = "rotation";
                        }

                        attribute.durationDone += dt;

                        attribute.progress = attribute.durationDone / attribute.duration;

                        let val = lib.lerp(attribute.from, attribute.to, attribute.ease(attribute.progress));

                        if (attribute.progress >= 1.0) {
                            val = attribute.to;
                            attribute.done = true;
                        }

                        animatedAttributes[attribute.name] = val;

                    }

                }

                if(Object.keys(animatedAttributes).length > 0) {
                    await this._updateObject(this._originObject, animatedAttributes);
                }

                animData.attributes = animData.attributes.filter(a => !a.done);

                if(animData.attributes.length === 0) return;

                animData.lastTimespan = timespan;

            }

        }

        let self = this;
        requestAnimationFrame(function (timespan) {
            self._animate(animData, resolve, timespan);
        });
    }

}

// Apply traits
Object.assign(AnimationSection.prototype, files);
Object.assign(AnimationSection.prototype, moves);
Object.assign(AnimationSection.prototype, opacity);
Object.assign(AnimationSection.prototype, rotation);

export default AnimationSection;