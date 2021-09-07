import * as lib from "./lib/lib.js";
import { easeFunctions } from "./canvas-effects/ease.js";

export default class SequencerAnimationEngine {

    static animate(attributes = [], timeDifference = 0) {

        if(!Array.isArray(attributes)) attributes = [attributes];

		let animData = {
			attributes: attributes.map(attribute => {
                attribute.easeFunction = easeFunctions[attribute.ease];
                attribute.complete = false;
                attribute.progress = 0;
                attribute.offset = attribute.offset ?? 0;

                attribute.duration = attribute.duration ?? 0;
                attribute.durationDone = timeDifference ?? 0;

                if(attribute.loops) {
                    attribute.loopDuration = attribute.loopDuration ?? 0;
                    attribute.loopDurationDone = timeDifference % attribute.loopDuration ?? 0;
                    attribute.loops = attribute.loops ?? 0;
                    attribute.loopsDone = Math.floor(attribute.durationDone / attribute.duration);
                    attribute.index = (attribute.loopsDone) % attribute.values.length;
                    attribute.nextIndex = (attribute.loopsDone+1) % attribute.values.length;

                }
				return attribute;
			}),
			maxFPS: 1000 / game.settings.get('core', "maxFPS"),
			lastTimespan: performance.now(),
			totalDt: timeDifference
		}

        return new Promise((resolve) => this._animate(resolve, animData));
    }

    static _animate(resolve, animData, timespan = performance.now(), lastTimespan = performance.now()){

        let dt = timespan - lastTimespan;

        // Limit to set FPS
        if (dt >= animData.maxFPS) {

            animData.totalDt += dt;

            for(let attribute of animData.attributes) {

                if (attribute.complete) continue;

                if (animData.totalDt < attribute.delay) continue;

                if(attribute?.loops){
                    attribute = this.handleLoops(dt, attribute);
                }else{
                    attribute = this.handleDefault(dt, attribute);
                }

            }

            animData.attributes = animData.attributes.filter(a => !a.complete);

            lastTimespan = timespan;

        }

        if(animData.attributes.length === 0){
            resolve();
        }else {
            let self = this;
            requestAnimationFrame(function (timespan) {
                self._animate(resolve, animData, timespan, lastTimespan);
            });
        }

    }

    static handleLoops(dt, attribute){

        if(attribute?.index === undefined){
            if(attribute.values.length === 1){
                attribute.values.unshift(lib.deepGet(attribute.parent, attribute.name));
            }
            attribute.index = 0;
            attribute.nextIndex = 1;
            attribute.loopsDone = 0;
        }

        attribute.loopDurationDone += dt;
        attribute.progress = attribute.loopDurationDone / attribute.loopDuration;

        attribute.durationDone += dt;
        attribute.overallProgress = attribute.durationDone / attribute.duration;

        let val = lib.lerp(
            attribute.values[attribute.index],
            attribute.values[attribute.nextIndex],
            attribute.easeFunction(attribute.progress)
        );

        if (attribute.progress >= 1.0) {

            attribute.loopDurationDone -= attribute.loopDuration;

            attribute.index = (attribute.index + 1) % attribute.values.length;
            attribute.nextIndex = (attribute.nextIndex + 1) % attribute.values.length;

            attribute.loopsDone++;

            val = lib.lerp(
                attribute.values[attribute.index],
                attribute.values[attribute.nextIndex],
                attribute.easeFunction(attribute.progress - 1.0)
            );

            if (attribute.loopsDone === attribute.loops * 2) {
                attribute.complete = true;
                val = attribute.values[attribute.index];
            }

        }

        if(attribute.overallProgress >= 1.0){
            attribute.complete = true;
        }

        try{
			lib.deepSet(attribute.parent, attribute.name, val);
        }catch(err){
        	attribute.complete = true;
		}

        return attribute;

    }

    static handleDefault(dt, attribute){

        if(attribute.from === undefined){
            attribute.from = lib.deepGet(attribute.parent, attribute.name);
        }

        attribute.durationDone += dt;
        attribute.progress = attribute.durationDone / attribute.duration;

        let val = lib.lerp(
            attribute.from + attribute.offset,
            attribute.to + attribute.offset,
            attribute.easeFunction(attribute.progress)
        );

        if (attribute.progress >= 1.0) {
            val = attribute.to;
            attribute.complete = true;
        }

		try{
			lib.deepSet(attribute.parent, attribute.name, val);
		}catch(err){
			attribute.complete = true;
		}

        return attribute;

    }

}