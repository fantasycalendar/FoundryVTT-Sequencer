import * as lib from "./lib/lib.js";
import { easeFunctions } from "./canvas-effects/ease.js";

export default class SequencerAnimationEngine {

    static animate(attributes = []) {

        if(!Array.isArray(attributes)) attributes = [attributes];

		let animData = {
			attributes: attributes.map(attribute => {
				attribute.progress = 0;
				attribute.complete = false;
				attribute.durationDone = 0;
				attribute.loopDurationDone = 0;
				attribute.easeFunction = easeFunctions[attribute.ease];
				return attribute;
			}),
			maxFPS: 1000 / game.settings.get('core', "maxFPS"),
			lastTimespan: performance.now(),
			totalDt: 0
		}

		return this._animate(animData);
    }

    static async _animate(animData, timespan, lastTimespan ){

		return new Promise(async (resolve) => {

			// If it's not the first tick
			if(!timespan){
				timespan = performance.now();
				lastTimespan = performance.now();
			}

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
					self._animate(animData, timespan, lastTimespan);
				});
			}

		});

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

        let val = lib.lerp(attribute.from, attribute.to, attribute.easeFunction(attribute.progress));

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