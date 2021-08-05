import * as lib from "./lib.js";

export default class SequencerAnimationEngine {

    static async animate(attributes) {

        if(!Array.isArray(attributes)) attributes = [attributes];

        return new Promise(async (resolve) => {

            if(attributes.length === 0) resolve();

            let animData = {
                attributes: attributes.map(attribute => {
                    attribute.path = attribute.name.split('.');
                    attribute.progress = 0;
                    attribute.done = false;
                    attribute.durationDone = 0;
                    attribute.loopDurationDone = 0;
                    return attribute;
                }),
                maxFPS: 1000 / game.settings.get('core', "maxFPS"),
                lastTimespan: performance.now(),
                totalDt: 0
            }

            this._animate(resolve, animData);

        });
    }

    static async _animate(resolve, animData, timespan, lastTimespan ){

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

            if(animData.attributes.length === 0){
                resolve();
                return;
            }

            lastTimespan = timespan;

        }

        let self = this;
        requestAnimationFrame(function (timespan) {
            self._animate(resolve, animData, timespan, lastTimespan);
        });

    }

    static handleLoops(dt, attribute){

        if(attribute?.index === undefined){
            if(attribute.values.length === 1){
                attribute.values.unshift(lib.deepGet(attribute.parent, attribute.path));
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
            attribute.ease(attribute.progress)
        );

        if (attribute.progress >= 1.0) {

            attribute.loopDurationDone -= attribute.loopDuration;

            attribute.index = (attribute.index + 1) % attribute.values.length;
            attribute.nextIndex = (attribute.nextIndex + 1) % attribute.values.length;

            attribute.loopsDone++;

            val = lib.lerp(
                attribute.values[attribute.index],
                attribute.values[attribute.nextIndex],
                attribute.ease(attribute.progress - 1.0)
            );

            if (attribute.loopsDone === attribute.loops * 2) {
                attribute.complete = true;
                val = attribute.values[attribute.index];
            }

        }

        if(attribute.overallProgress >= 1.0){
            attribute.complete = true;
        }

        try{ lib.deepSet(attribute.parent, val, attribute.path); }catch(err){ }

        return attribute;

    }

    static handleDefault(dt, attribute){

        if(attribute.from === undefined){
            attribute.from = lib.deepGet(attribute.parent, attribute.path);
        }

        attribute.durationDone += dt;
        attribute.progress = attribute.durationDone / attribute.duration;

        let val = lib.lerp(attribute.from, attribute.to, attribute.ease(attribute.progress));

        if (attribute.progress >= 1.0) {
            val = attribute.to;
            attribute.complete = true;
        }

        try{ lib.deepSet(attribute.parent, val, attribute.path); }catch(err){ }

        return attribute;

    }

}