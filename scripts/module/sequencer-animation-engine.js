import * as lib from "./lib/lib.js";
import { easeFunctions } from "./canvas-effects/ease.js";

export default class SequencerAnimationEngine {

    static animate(attributes = [], timeDifference = 0) {

        if (!Array.isArray(attributes)) attributes = [attributes];

        let animData = {
            attributes: attributes.map(attribute => {
                attribute.easeFunction = easeFunctions[attribute.ease];
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
            maxFPS: 1000 / game.settings.get('core', "maxFPS"),
            lastTimespan: performance.now(),
            totalDt: timeDifference
        }

        return new Promise((resolve) => this._animate(resolve, animData));
    }

    static _animate(resolve, animData, timespan = performance.now(), lastTimespan = performance.now()) {

        let dt = timespan - lastTimespan;

        // Limit to set FPS
        if (dt >= animData.maxFPS) {

            animData.totalDt += dt;

            let attributeDeltas = [];

            for (let attribute of animData.attributes) {

                if (attribute.complete) continue;

                if (animData.totalDt < attribute.delay) continue;

                if (attribute?.looping && attribute?.indefinite) {
                    attribute = this.handleIndefiniteLoop(dt, attribute);
                } else if (attribute?.looping) {
                    attribute = this.handleLoops(dt, attribute);
                } else {
                    attribute = this.handleDefault(dt, attribute);
                }

                let delta = attributeDeltas.find(delta => attribute.target === delta.target && attribute.propertyName === delta.propertyName);

                if(!delta){
                    attributeDeltas.push({
                        target: attribute.target,
                        propertyName: attribute.propertyName,
                        value: 0
                    })
                    delta = attributeDeltas[attributeDeltas.length-1];
                }

                delta.value += attribute.value;

            }

            for (let delta of attributeDeltas) {
                try{
                    lib.deepSet(
                        delta.target,
                        delta.propertyName,
                        delta.value
                    )
                }catch(err){}
            }

            animData.attributes = animData.attributes.filter(a => !a.complete);

            lastTimespan = timespan;

        }

        if (animData.attributes.length === 0) {
            resolve();
        } else {
            let self = this;
            requestAnimationFrame(function (timespan) {
                self._animate(resolve, animData, timespan, lastTimespan);
            });
        }

    }

    static _handleBaseLoop(dt, attribute) {

        if (!attribute.initialized) {
            if (attribute.values.length === 1) {
                attribute.values.unshift(lib.deepGet(
                    attribute.target,
                    attribute.propertyName
                ));
            }
            attribute.initialized = true;
        }

        attribute.loopDurationDone += dt;
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

        return attribute;

    }

    static handleIndefiniteLoop(dt, attribute) {

        return this._handleBaseLoop(dt, attribute);

    }

    static handleLoops(dt, attribute) {

        attribute = this._handleBaseLoop(dt, attribute);

        attribute.durationDone += dt;
        attribute.overallProgress = attribute.durationDone / attribute.duration;

        if (attribute.progress >= 1.0 && attribute.loopsDone === attribute.loops * 2) {
            attribute.complete = true;
            attribute.value = attribute.values[attribute.index];
        }

        if (attribute.overallProgress >= 1.0) {
            attribute.complete = true;
        }

        return attribute;

    }

    static handleDefault(dt, attribute) {

        if (attribute.from === undefined) {
            attribute.from = lib.deepGet(
                attribute.target,
                attribute.propertyName
            );
        }

        attribute.durationDone += dt;
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

        return attribute;

    }

}