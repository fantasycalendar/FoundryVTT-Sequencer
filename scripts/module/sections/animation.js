import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../../sockets.js";

class AnimationSection extends Section {

    constructor(inSequence, inTarget) {
        super(inSequence);
        this._waitUntilFinished = false;
        this._teleportTo = false;
        this._originObject = false;
        this._moveSpeed = 23;
        this._offset = { x: 0, y: 0 };
        this._closestSquare = false;
        this._snapToGrid = false;
        this._hide = undefined;
        if (inTarget) this.on(inTarget);
    }

    /**
     * Sets the target object to be animated
     *
     * @param {object|string} inTarget
     * @returns {AnimationSection}
     */
    on(inTarget) {
        inTarget = this._validateLocation(inTarget);
        if (!inTarget) throw this.sequence._customError(this, "on", "could not find position of given object");
        this._originObject = this._validateLocation(inTarget);
        return this;
    }

    /**
     * Sets the location to teleport the target object to
     *
     * @param {object|string} inTarget
     * @param {object} options
     * @returns {AnimationSection}
     */
    teleportTo(inTarget, options = {}) {
        options = foundry.utils.mergeObject({
            delay: 0,
            target: { x: 0, y: 0 },
            relativeToCenter: false
        }, options);
        if (!lib.is_real_number(options.delay)) throw this.sequence._customError(this, "teleportTo", "options.delay must be of type number");
        inTarget = this._validateLocation(inTarget);
        if (!inTarget) throw this.sequence._customError(this, "teleportTo", "could not find position of given object");
        options.target = this._validateLocation(inTarget);
        this._teleportTo = options;
        return this;
    }

    /**
     * Causes the movement or teleportation to be offset in the X and/or Y axis
     *
     * @param {object} inOffset
     * @returns {AnimationSection}
     */
    offset(inOffset) {
        inOffset = foundry.utils.mergeObject({ x: 0, y: 0 }, inOffset);
        this._offset = this._validateLocation(inOffset);
        return this;
    }

    /**
     * Causes the movement or teleportation to pick the closest non-intersecting square, if the target is a token or tile
     *
     * @param {boolean} inBool
     * @returns {AnimationSection}
     */
    closestSquare(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "closestSquare", "inBool must be of type boolean");
        this._closestSquare = inBool;
        return this;
    }

    /**
     * Causes the final location to be snapped to the grid
     *
     * @param {boolean} inBool
     * @returns {AnimationSection}
     */
    snapToGrid(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "snapToGrid", "inBool must be of type boolean");
        this._snapToGrid = inBool;
        return this;
    }

    /**
     * Causes the object to become hidden
     *
     * @param {boolean} inBool
     * @returns {AnimationSection}
     */
    hide(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "hide", "inBool must be of type boolean");
        this._hide = inBool;
        return this;
    }

    /**
     * Causes the object to become visible
     *
     * @param {boolean} inBool
     * @returns {AnimationSection}
     */
    show(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "show", "inBool must be of type boolean");
        this._hide = !inBool;
        return this;
    }

    /**
     * @private
     */
    async run() {
        return this._runAnimate();
    }

    /**
     * @private
     */
    _applyTraits() {
        Object.assign(this.constructor.prototype, traits.moves);
        Object.assign(this.constructor.prototype, traits.opacity);
        Object.assign(this.constructor.prototype, traits.rotation);
        Object.assign(this.constructor.prototype, traits.audio);
        Object.assign(this.constructor.prototype, traits.tint);
    }

    /**
     * @private
     */
    async _updateObject(obj, updates, animate = false, animation = {}) {
        const uuid = obj?.uuid ?? obj?.document?.uuid;
        await sequencerSocket.executeAsGM(SOCKET_HANDLERS.UPDATE_DOCUMENT, uuid, updates, { animate, animation });
    }

    /**
     * @private
     */
    async _execute() {
        if (!(await this._shouldPlay())) return;
        let self = this;
        this._basicDelay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise(async (resolve) => {
            setTimeout(async () => {
                if (this._shouldAsync) {
                    await self.run();
                } else {
                    self.run();
                }
                resolve();
            }, this._basicDelay);
        });
    }

    /**
     * @private
     */
    _getClosestSquare(origin, target) {

        let originLoc = canvaslib.get_object_position(origin, { exact: true });
        let targetLoc = canvaslib.get_object_position(target, { exact: true });

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
        } else if (dx < 0 && Math.abs(dx) > targetSizeWidth) {
            dx += targetSizeHeight;
        } else {
            dx = 0;
        }

        if (dy > 0 && Math.abs(dy) > originBottom) {
            dy -= originSizeHeight;
        } else if (dy < 0 && Math.abs(dy) > targetSizeHeight) {
            dy += targetSizeHeight;
        } else {
            dy = 0;
        }

        return {
            x: originLoc.x + dx,
            y: originLoc.y + dy
        };

    }

    /**
     * @private
     */
    _getCleanPosition(obj, measure = false) {

        let pos = {
            x: obj?.data?.x ?? obj?.x ?? 0,
            y: obj?.data?.y ?? obj?.y ?? 0
        }

        if (obj instanceof MeasuredTemplate) {
            if (measure) {
                if (obj.data.t === "cone" || obj.data.t === "ray") {
                    pos.x = obj.ray.B.x;
                    pos.y = obj.ray.B.y;
                }
            }
        }

        return pos;
    }

    /**
     * @private
     */
    _snapLocationToGrid(inLocation) {
        let coords = canvas.grid.grid.getGridPositionFromPixels(inLocation.x, inLocation.y);
        return {
            x: coords[1] * canvas.grid.size,
            y: coords[0] * canvas.grid.size
        }
    }

    /**
     * This needs a rewrite, jeesus.
     */
    async _runAnimate() {

        let animData = {
            attributes: [],
            maxFPS: 1000 / game.settings.get('core', "maxFPS"),
            lastTimespan: performance.now(),
            totalDt: 0
        }

        let overallDuration = this._duration ? this._duration : 0;

        if (this._rotateTowards) {

            let offset = (this._angle ? this._angle : 0) + this._rotateTowards.offset;

            let targetLoc = this._moveTowards?.target || this._teleportTo?.target || this._originObject;

            targetLoc = this._closestSquare
                ? this._getClosestSquare(this._originObject, targetLoc)
                : canvaslib.get_object_position(targetLoc, { exact: true });

            targetLoc.x += this._offset.x;
            targetLoc.y += this._offset.y;

            if (this._snapToGrid) targetLoc = this._snapLocationToGrid(targetLoc);

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
                ease: this._rotateTowards.ease
            })

            let rotateDuration = this._rotateTowards.duration + this._rotateTowards.delay;

            overallDuration = overallDuration > rotateDuration ? overallDuration : rotateDuration;

        }

        if (this._fadeIn) {

            let to = lib.is_real_number(this._opacity) ? this._opacity : 1.0;

            animData.attributes.push({
                name: "alpha",
                from: 0.0,
                to: to,
                progress: 0,
                done: false,
                duration: this._fadeIn.duration,
                durationDone: 0,
                delay: this._fadeIn.delay,
                ease: this._fadeIn.ease
            })

            let fadeDuration = this._fadeIn.duration + this._fadeIn.delay;

            overallDuration = overallDuration > fadeDuration ? overallDuration : fadeDuration;
        }

        if (this._fadeInAudio && this._originObject?.data?.video?.volume !== undefined) {

            let to = lib.is_real_number(this._volume) ? this._volume : 1.0;

            animData.attributes.push({
                name: "video.volume",
                from: 0.0,
                to: to,
                progress: 0,
                done: false,
                duration: this._fadeInAudio.duration,
                durationDone: 0,
                delay: this._fadeInAudio.delay,
                ease: this._fadeInAudio.ease
            })

            let fadeDuration = this._fadeInAudio.duration + this._fadeInAudio.delay;

            overallDuration = overallDuration > fadeDuration ? overallDuration : fadeDuration;

        }

        if (this._rotateIn) {

            let from = this._angle ? this._angle : this._originObject.data.rotation;
            let to = this._rotateIn.value;

            if (Math.abs(from - to) > 180) {
                if (to < 0) {
                    to += 360;
                } else if (from > to) {
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
                ease: this._rotateIn.ease
            })

            let rotateDuration = this._rotateIn.duration + this._rotateIn.delay;

            overallDuration = overallDuration > rotateDuration ? overallDuration : rotateDuration;

        }

        if (this._moveTowards) {

            let originLocation = canvaslib.get_object_position(this._originObject, { exact: true });
            let targetLocation = this._closestSquare
                ? this._getClosestSquare(this._originObject, this._moveTowards.target)
                : canvaslib.get_object_position(this._moveTowards.target, { exact: true });

            targetLocation.x += this._offset.x;
            targetLocation.y += this._offset.y;

            if (this._moveTowards.relativeToCenter){
                const dimensions = canvaslib.get_object_dimensions(this._originObject);
                targetLocation.x -= dimensions.width/2;
                targetLocation.y -= dimensions.height/2;
                if(this._snapToGrid){
                    targetLocation.x -= 0.01;
                    targetLocation.y -= 0.01;
                }
            }

            if (this._snapToGrid) targetLocation = this._snapLocationToGrid(targetLocation);

            let originalDx = targetLocation.x - originLocation.x;
            let originalDy = targetLocation.y - originLocation.y;
            let originalDistance = Math.sqrt(originalDx * originalDx + originalDy * originalDy);

            let duration = this._duration
                ? this._duration
                : (originalDistance / this._moveSpeed) * animData.maxFPS;

            let moveDuration = duration + this._moveTowards.delay;

            overallDuration = overallDuration > moveDuration ? overallDuration : moveDuration;

            if (!this._duration && !this._moveSpeed && this._moveTowards.ease === "linear") {
                await this._updateObject(this._originObject, targetLocation, true);
            } else {
                animData.attributes.push({
                    name: "position",
                    origin: originLocation,
                    target: targetLocation,
                    originalDistance: originalDistance,
                    currentDistance: 0,
                    progress: 0,
                    speed: 0,
                    duration: duration,
                    done: false,
                    ease: this._moveTowards.ease,
                    delay: this._moveTowards.delay
                })
            }
        }

        if (this._fadeOut) {

            let from = lib.is_real_number(this._opacity) ? this._opacity : (this._originObject.data.alpha ?? 1.0);

            animData.attributes.push({
                name: "alpha",
                from: from,
                to: 0.0,
                progress: 0,
                done: false,
                duration: this._fadeOut.duration,
                durationDone: 0,
                delay: overallDuration - this._fadeOut.duration,
                ease: this._fadeOut.ease
            })

            let fadeOutDuration = this._fadeOut.duration + this._fadeOut.delay;

            overallDuration = overallDuration > fadeOutDuration ? overallDuration : fadeOutDuration;
        }

        if (this._fadeOutAudio && this._originObject?.data?.video?.volume !== undefined) {

            let from = lib.is_real_number(this._volume) ? this._volume : this._originObject.data.video.volume;

            animData.attributes.push({
                name: "video.volume",
                from: from,
                to: 0.0,
                progress: 0,
                done: false,
                duration: this._fadeOutAudio.duration,
                durationDone: 0,
                delay: overallDuration - this._fadeOutAudio.duration,
                ease: this._fadeOutAudio.ease
            })

            let fadeOutAudioDuration = this._fadeOutAudio.duration + this._fadeOutAudio.delay;

            overallDuration = overallDuration > fadeOutAudioDuration ? overallDuration : fadeOutAudioDuration;
        }

        if (this._rotateOut) {

            let from = this._rotateOut.value;
            let to = this._angle ? this._angle : this._originObject.data.rotation;

            if (this._rotateIn) from += this._rotateIn.value;

            if (Math.abs(from - to) > 180) {
                if (to < 0) {
                    to += 360;
                } else if (from > to) {
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
                ease: this._rotateOut.ease
            });

            let rotateOutDuration = this._rotateOut.duration + this._rotateOut.delay;

            overallDuration = overallDuration > rotateOutDuration ? overallDuration : rotateOutDuration;

        }

        if (this._teleportTo) {
            setTimeout(async () => {
                let targetLocation = this._closestSquare
                    ? this._getClosestSquare(this._originObject, this._teleportTo.target)
                    : canvaslib.get_object_position(this._teleportTo.target, { exact: true });
                targetLocation.x += this._offset.x;
                targetLocation.y += this._offset.y;
                if (this._teleportTo.relativeToCenter){
                    const dimensions = canvaslib.get_object_dimensions(this._originObject);
                    targetLocation.x -= dimensions.width/2;
                    targetLocation.y -= dimensions.height/2;
                    if(this._snapToGrid){
                        targetLocation.x -= 0.01;
                        targetLocation.y -= 0.01;
                    }
                }
                if (this._snapToGrid) targetLocation = this._snapLocationToGrid(targetLocation);
                await this._updateObject(this._originObject, targetLocation);
            }, this._teleportTo.delay);
            if (overallDuration <= this._teleportTo.delay) {
                this._waitUntilFinished = true;
            }
            overallDuration = overallDuration > this._teleportTo.delay ? overallDuration : this._teleportTo.delay;
        }

        let updateAttributes = {};
        if (lib.is_real_number(this._angle) && !this._rotateIn && !this._rotateOut) {
            updateAttributes["rotation"] = this._angle;
        }

        if (lib.is_real_number(this._opacity) && !this._fadeIn && !this._fadeOut) {
            updateAttributes["alpha"] = this._opacity;
        }

        if (lib.is_real_number(this._volume) && !this._fadeInAudio && !this._fadeOutAudio && this._originObject?.data?.video?.volume !== undefined) {
            updateAttributes["video.volume"] = this._volume;
        }

        if(this._tint){
            updateAttributes['tint'] = this._tint.hexadecimal;
        }

        if(this._hide !== undefined){
            updateAttributes['hidden'] = this._hide;
        }

        if (Object.keys(updateAttributes).length) {
            setTimeout(async () => {
                await this._updateObject(this._originObject, updateAttributes);
            }, 1);
        }

        return new Promise(async (resolve) => {
            this._animate(animData, resolve);
            setTimeout(resolve, Math.max(0, overallDuration + this._waitUntilFinishedDelay + animData.maxFPS));
        })

    }

    /**
     * @private
     */
    async _animate(animData, resolve, timespan) {

        // If it's not the first tick
        if (timespan) {

            let animatedAttributes = {};

            let dt = timespan - animData.lastTimespan;

            // Limit to set FPS
            if (dt >= animData.maxFPS) {

                animData.totalDt += dt;

                for (let attribute of animData.attributes) {

                    if (attribute.done) continue;

                    if (animData.totalDt < attribute.delay) continue;

                    if (attribute.name === "position") {

                        attribute.speed = attribute.originalDistance / (attribute.duration / dt);

                        attribute.currentDistance += attribute.speed;

                        attribute.progress = attribute.currentDistance / attribute.originalDistance;

                        let x = lib.interpolate(attribute.origin.x, attribute.target.x, attribute.progress, attribute.ease);
                        let y = lib.interpolate(attribute.origin.y, attribute.target.y, attribute.progress, attribute.ease);

                        if (attribute.currentDistance >= attribute.originalDistance) {
                            x = attribute.target.x;
                            y = attribute.target.y;
                            attribute.done = true;
                        }

                        animatedAttributes['x'] = x;
                        animatedAttributes['y'] = y;

                    } else {

                        if (attribute.name === "rotationTowards" && !attribute.from && !attribute.to) {

                            let target = attribute.target;
                            if (this._rotateTowards.towardsCenter) target = target?.center ?? target;
                            let ray = new Ray(attribute.originLocation, target)
                            let angle = (ray.angle * 180 / Math.PI) - 90;
                            angle += attribute.offset;
                            attribute.from = attribute.origin.data.rotation;
                            attribute.to = angle;
                            if (Math.abs(attribute.from - attribute.to) > 180) {
                                if (attribute.to < 0) {
                                    attribute.to += 360;
                                } else if (attribute.from > attribute.to) {
                                    attribute.from -= 360;
                                }
                            }
                            attribute.name = "rotation";
                        }

                        attribute.durationDone += dt;

                        attribute.progress = attribute.durationDone / attribute.duration;

                        let val = lib.interpolate(attribute.from, attribute.to, attribute.progress, attribute.ease);

                        if (attribute.progress >= 1.0) {
                            val = attribute.to;
                            attribute.done = true;
                        }

                        animatedAttributes[attribute.name] = val;

                    }

                }

                if (Object.keys(animatedAttributes).length > 0) {
                    await this._updateObject(this._originObject, animatedAttributes);
                }

                animData.attributes = animData.attributes.filter(a => !a.done);

                if (animData.attributes.length === 0) return;

                animData.lastTimespan = timespan;

            }

        }

        let self = this;
        requestAnimationFrame(function (timespan) {
            self._animate(animData, resolve, timespan);
        });
    }

}

export default AnimationSection;