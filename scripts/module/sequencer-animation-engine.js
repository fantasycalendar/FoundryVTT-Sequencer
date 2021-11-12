import * as lib from "./lib/lib.js";
import { easeFunctions } from "./canvas-effects/ease.js";



const SequencerAnimationEngine = {

    _animations: [],
    _maxFPS: false,
    _debug: undefined,
    _deltas: [],

    dt: false,

    isRunning: false,

    get maxFPS(){
        if(!this._maxFPS){
            this._maxFPS = 1000 / game.settings.get('core', "maxFPS")
        }
        return this._maxFPS;
    },

    get debug(){
        if(this._debug === undefined){
            this._debug = game.settings.get('sequencer', "debug")
        }
        return this._debug;
    },

    printDebug(string){
        if(!this.debug) return;
        console.log(string);
    },

    addAnimation(attributes = [], timeDifference = 0) {

        if (!Array.isArray(attributes)) attributes = [attributes];

        return new Promise((resolve) => {
            this._animations.push({
                attributes: attributes.map(attribute => {
                    attribute.easeFunction = easeFunctions[attribute.ease] ?? easeFunctions["linear"];
                    attribute.started = false;
                    attribute.complete = false;
                    attribute.initialized = false;
                    attribute.progress = 0;

                    attribute.duration = attribute.duration ?? 0;
                    attribute.durationDone = timeDifference ?? 0;

                    if (attribute?.looping) {
                        attribute.loopDuration = attribute.loopDuration ?? attribute.duration ?? 0;
                        attribute.loopDurationDone = timeDifference % attribute.loopDuration ?? 0;
                        attribute.loops = attribute.loops ?? 0;
                        attribute.loopsDone = Math.floor(attribute.durationDone / attribute.duration);
                        attribute.index = (attribute.loopsDone) % attribute.values.length;
                        attribute.nextIndex = (attribute.loopsDone + 1) % attribute.values.length;
                        if (!attribute.pingPong && attribute.nextIndex === 0) {
                            attribute.index = 0;
                            attribute.nextIndex = 1;
                        }
                    }
                    return attribute;
                }),
                complete: false,
                totalDt: timeDifference,
                resolve: resolve
            });
            this.printDebug(`DEBUG | Sequencer | Added animations to Animation Engine`);
            if(!this.isRunning){
                this.start();
            }
        });

    },

    endAnimations(target){
        this._animations = this._animations.map(animation => {
            animation.attributes = animation.attributes.filter(attribute => attribute.target !== target);
            return animation;
        }).filter(animation => animation.attributes.length > 0);
    },

    start(){
        this.isRunning = true;
        this.printDebug(`DEBUG | Sequencer | Animation Engine Started`);
        this.nextFrame();
    },

    nextFrame(timespan = performance.now(), lastTimespan = performance.now()){

        if(this._animations.length === 0){
            this.isRunning = false;
            this._deltas = [];
            this.printDebug(`DEBUG | Sequencer | Animation Engine Paused`);
            return;
        }

        this.dt = timespan - lastTimespan;

        // Limit to set FPS
        if (this.dt >= this.maxFPS) {

            this._animations.forEach(animation => this._animate(animation));

            this._animations = this._animations.filter(animation => !animation.complete);

            this._applyDeltas();

            lastTimespan = timespan;

        }

        let nextFrame = this.nextFrame.bind(this);
        requestAnimationFrame(function (timespan) {
            nextFrame(timespan, lastTimespan);
        });

    },

    _applyDeltas() {

        for(const animation of this._animations){

            for(const attribute of animation.attributes) {

                if(!attribute.started) continue;

                let delta = this._deltas.find(delta => attribute.target === delta.target && attribute.propertyName === delta.propertyName);

                if (!delta) {
                    this._deltas.push({
                        target: attribute.target,
                        propertyName: attribute.propertyName,
                        value: 0
                    })
                    delta = this._deltas[this._deltas.length - 1];
                }

                delta.value += attribute.value;

            }

        }

        for (let delta of this._deltas) {
            try {
                lib.deepSet(
                    delta.target,
                    delta.propertyName,
                    delta.value
                )
                delta.value = 0;
            } catch (err) { }
        }

    },

    _animate(animation){

        animation.totalDt += this.dt;

        animation.attributes.filter(attribute => !attribute.complete)
            .forEach(attribute => this._animateAttribute(animation.totalDt, attribute));

        animation.complete = animation.attributes.filter(attribute => !attribute.complete).length === 0;

        if(animation.complete){
            animation.resolve();
        }

    },

    _animateAttribute(totalDt, attribute) {

        if (totalDt < attribute.delay) return;

        attribute.started = true;

        if (attribute?.looping && attribute?.indefinite) {
            this._handleIndefiniteLoop(attribute);
        } else if (attribute?.looping) {
            this._handleLoops(attribute);
        } else {
            this._handleDefault(attribute);
        }

    },

    _handleBaseLoop(attribute) {

        if (!attribute.initialized) {
            if (attribute.values.length === 1) {
                attribute.values.unshift(lib.deepGet(
                    attribute.target,
                    attribute.propertyName
                ));
            }
            attribute.initialized = true;
        }

        attribute.loopDurationDone += this.dt;
        attribute.progress = attribute.loopDurationDone / attribute.loopDuration;

        attribute.value = lib.lerp(
            attribute.values[attribute.index],
            attribute.values[attribute.nextIndex],
            attribute.easeFunction(attribute.progress)
        );

        if (attribute.progress >= 1.0) {

            attribute.loopDurationDone -= attribute.loopDuration;

            attribute.index = (attribute.index + 1) % attribute.values.length;
            attribute.nextIndex = (attribute.nextIndex + 1) % attribute.values.length;

            if (!attribute.pingPong && attribute.nextIndex === 0) {
                attribute.index = 0;
                attribute.nextIndex = 1;
            }

            attribute.loopsDone++;

            attribute.value = lib.lerp(
                attribute.values[attribute.index],
                attribute.values[attribute.nextIndex],
                attribute.easeFunction(attribute.progress - 1.0)
            );

        }

    },

    _handleIndefiniteLoop(attribute) {

        return this._handleBaseLoop(attribute);

    },

    _handleLoops(attribute) {

        this._handleBaseLoop(attribute);

        attribute.durationDone += this.dt;
        attribute.overallProgress = attribute.durationDone / attribute.duration;

        if (attribute.progress >= 1.0 && attribute.loopsDone === attribute.loops * 2) {
            attribute.complete = true;
            attribute.value = attribute.values[attribute.index];
        }

        if (attribute.overallProgress >= 1.0) {
            attribute.complete = true;
        }

    },

    _handleDefault(attribute) {

        if (attribute.from === undefined) {
            attribute.from = lib.deepGet(
                attribute.target,
                attribute.propertyName
            );
        }

        attribute.durationDone += this.dt;
        attribute.progress = attribute.durationDone / attribute.duration;

        attribute.value = lib.lerp(
            attribute.from,
            attribute.to,
            attribute.easeFunction(attribute.progress)
        );

        if (attribute.progress >= 1.0) {
            attribute.value = attribute.to;
            attribute.complete = true;
        }

    }

}

export default SequencerAnimationEngine;