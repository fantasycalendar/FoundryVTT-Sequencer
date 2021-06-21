import * as lib from "../lib.js";

export default class Section{

    constructor(inSequence, inWaitUntilFinished = false){
        this.sequence = inSequence;
        this._waitUntilFinished = inWaitUntilFinished;
        this._async = false;
        this._currentRepetition = 0;
        this._repetitions = 1;
        this._repeatDelayMin = 0;
        this._repeatDelayMax = 0;
        this._delayMin = 0;
        this._delayMax = 0;
        this._playIf = false;
        this._playIfSet = false;
        this._offsets = [];
    }

    /**
     * Causes the section to finish running before starting the next section.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {Section} this
     */
    waitUntilFinished(inBool = true){
        if(typeof inBool !== "boolean") this.throwError("waitUntilFinished", "inBool must be of type boolean");
        this._waitUntilFinished = inBool;
        return this;
    }

    /**
     * Causes each effect or sound to finish playing before the next one starts playing. This differs from
     * .waitUntilFinished() in the sense that this is for each repetition, whilst .waitUntilFinished() is
     * for the entire section.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {Section} this
     */
    async(inBool = true){
        if(typeof inBool !== "boolean") this.throwError("async", "inBool must be of type boolean");
        this._async = inBool;
        return this;
    }

    /**
     * Causes the effect or sound to be repeated n amount of times, with an optional delay. If given inRepeatDelayMin
     * and inRepeatDelayMax, a random repetition delay will be picked for every repetition
     *
     * @param {number} inRepetitions
     * @param {number} inRepeatDelayMin
     * @param {number} inRepeatDelayMax
     * @returns {Section} this
     */
    repeats(inRepetitions, inRepeatDelayMin = 0, inRepeatDelayMax){
        if(typeof inRepetitions !== "number") this.throwError("repeats", "inRepetitions must be of type number");
        if(typeof inRepeatDelayMin !== "number") this.throwError("repeats", "repeatDelayMin must be of type number");
        if(inRepeatDelayMax && typeof inRepeatDelayMax !== "number"){
            this.throwError("repeats", "repeatDelayMax must be of type number");
        }
        this._repetitions = inRepetitions;
        this._repeatDelayMin = Math.min(inRepeatDelayMin, inRepeatDelayMax ?? inRepeatDelayMin);
        this._repeatDelayMax = Math.max(inRepeatDelayMin, inRepeatDelayMax ?? inRepeatDelayMin);
        return this;
    }

    /**
     * Causes the effect or sound to not play, and skip all delays, repetitions, waits, etc. If you pass a function,
     * the function should return something false-y if you do not want the effect or sound to play.
     *
     * @param {boolean|function} inCondition
     * @returns {Section} this
     */
    playIf(inCondition) {
        if(!(typeof inCondition === "boolean" || lib.is_function(inCondition))){
            this.throwError("playIf", "inCondition must be of type boolean or function");
        }
        this._playIf = inCondition;
        this._playIfSet = true;
        return this;
    }

    /**
     * Delays the effect or sound from being played for a set amount of milliseconds. If given a second number, a
     * random delay between the two numbers will be generated.
     *
     * @param {number} [msMin=1] minMs
     * @param {number} [msMax=1] maxMs
     * @returns {Section} this
     */
    delay(msMin, msMax) {
        if(typeof msMin !== "number") this.throwError("delay", "msMin must be of type number");
        if(msMax && typeof msMax !== "number") this.throwError("delay", "msMax must be of type number");
        this._delayMin = Math.min(msMin, msMax ?? msMin);
        this._delayMax = Math.max(msMin, msMax ?? msMin)
        return this;
    }

    get shouldWaitUntilFinished(){
        return this._waitUntilFinished || ((this._async || this._waitUntilFinished) && this._repetitions === 1)
    }

    get shouldAsync(){
        return this._async || ((this._async || this._waitUntilFinished) && this._repetitions === 1)
    }

    async shouldPlay(){
        return lib.is_function(this._playIf) ? await this._playIf() : this._playIf;
    }

    throwError(func, error){
        this.sequence.throwError(this, func, error);
    }

    async prepareOffsetCache(){
        this._offsets = [];
        for (let index = 0; index < this._repetitions; index++) {
            this._cacheOffsets();
        }
    }

    /**
     * Overridden method in EffectSection
     */
    _cacheOffsets(){}

    async execute(){
        if(this._playIfSet && !(await this.shouldPlay())) return;
        let self = this;
        let delay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise(async (resolve) => {
            setTimeout(async function () {
                for (let i = 0; i < self._repetitions; i++) {
                    self._currentRepetition = i;
                    if (self.shouldAsync) {
                        await self._run();
                    } else {
                        self._run();
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

    async _run(){}

}