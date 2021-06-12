import * as lib from "../lib.js";

export default class Section{

    constructor(inSequence, inWaitUntilFinished = false){
        this.sequence = inSequence;
        this._waitUntilFinished = inWaitUntilFinished;
        this._async = false;
        this._repetitions = 1;
        this._repeatDelayMin = 0;
        this._repeatDelayMax = 0;
        this._delayMin = 0;
        this._delayMax = 0;
        this._playIf = false;
        this._playIfSet = false;
    }

    waitUntilFinished(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._waitUntilFinished = inBool;
        return this;
    }

    async(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._async = inBool;
        return this;
    }

    delay(msMin, msMax) {
        if(typeof msMin !== "number") throw new Error("msMin must be of type number");
        if(msMax && typeof msMax !== "number") throw new Error("msMax must be of type number");
        this._delayMin = Math.min(msMin, msMax ?? msMin);
        this._delayMax = Math.max(msMin, msMax ?? msMin)
        return this;
    }

    repeats(inRepetitions, inRepeatDelayMin = 0, inRepeatDelayMax){
        if(typeof inRepetitions !== "number") throw new Error("inRepetitions must be of type number");
        if(typeof inRepeatDelayMin !== "number") throw new Error("repeatDelayMin must be of type number");
        if(inRepeatDelayMax && typeof inRepeatDelayMax !== "number") throw new Error("repeatDelayMax must be of type number");
        this._repetitions = inRepetitions;
        this._repeatDelayMin = Math.min(inRepeatDelayMin, inRepeatDelayMax ?? inRepeatDelayMin);
        this._repeatDelayMax = Math.max(inRepeatDelayMin, inRepeatDelayMax ?? inRepeatDelayMin);
        return this;
    }

    async shouldPlay(){
        return lib.is_function(this._playIf) ? await this._playIf() : this._playIf;
    }

    playIf(inCondition) {
        if(!(typeof inCondition === "boolean" || lib.is_function(inCondition))) throw new Error("inCondition must be of type boolean or function");
        this._playIf = inCondition;
        this._playIfSet = true;
        return this;
    }

    async execute(){
        if(this._playIfSet && !(await this.shouldPlay())) return;
        let self = this;
        let delay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise(async (resolve) => {
            setTimeout(async function () {
                for (let i = 0; i < self._repetitions; i++) {
                    if (self._async) {
                        await self.run();
                    } else {
                        self.run();
                    }
                    if (self._repetitions > 1) {
                        await self._delayBetweenRepetitions();
                    }
                }
                resolve();
            }, delay);
        });
    }

    async _delayBetweenRepetitions(){
        let waitTime = lib.random_float_between(this._repeatDelayMin, this._repeatDelayMax);
        return new Promise((resolve) => {
            setTimeout(resolve, waitTime)
        });
    }

}