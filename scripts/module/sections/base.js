import * as lib from "../lib.js";

export default class Section{

    constructor(inSequence){
        this.sequence = inSequence;
        this._waitUntilFinished = false;
        this._waitUntilFinishedDelay = 0;
        this._async = false;
        this._currentRepetition = 0;
        this._repetitions = 1;
        this._repeatDelayMin = 0;
        this._repeatDelayMax = 0;
        this._delayMin = 0;
        this._delayMax = 0;
        this._playIf = true;
        this._offsets = [];
        this._index = this.sequence.effectIndex;
        this._duration = false;
        this._fadeIn = false;
        this._fadeOut = false;
        this._mustache = false;
    }

    /**
     * Causes the section to finish running before starting the next section.
     *
     * @param {number} [inDelay=0] inDelay
     * @returns {Section} this
     */
    waitUntilFinished(inDelay=0){
        if(typeof inDelay !== "number") this.sequence.throwError(this, "waitUntilFinished", "inDelay must be of type number");
        this._waitUntilFinished = true;
        this._waitUntilFinishedDelay = inDelay;
        return this;
    }

    /**
     * Causes each effect or sound to finish playing before the next one starts playing. This differs from
     * .waitUntilFinished() in the sense that this is for each repetition, whilst .waitUntilFinished() is
     * for the entire section.
     *
     * @returns {Section} this
     */
    async(){
        this._async = true;
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
        if(typeof inRepetitions !== "number") this.sequence.throwError(this, "repeats", "inRepetitions must be of type number");
        if(typeof inRepeatDelayMin !== "number") this.sequence.throwError(this, "repeats", "repeatDelayMin must be of type number");
        if(inRepeatDelayMax && typeof inRepeatDelayMax !== "number"){
            this.sequence.throwError(this, "repeats", "repeatDelayMax must be of type number");
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
            this.sequence.throwError(this, "playIf", "inCondition must be of type boolean or function");
        }
        this._playIf = inCondition;
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
        if(typeof msMin !== "number") this.sequence.throwError(this, "delay", "msMin must be of type number");
        if(msMax && typeof msMax !== "number") this.sequence.throwError(this, "delay", "msMax must be of type number");
        this._delayMin = Math.min(msMin, msMax ?? msMin);
        this._delayMax = Math.max(msMin, msMax ?? msMin)
        return this;
    }

    /**
     * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
     *
     * @param {object} inMustache
     * @returns {Section} this
     */
    setMustache(inMustache) {
        if(typeof inMustache !== "object") this.sequence.throwError(this, "setMustache", "inMustache must be of type object");
        this._mustache = inMustache;
        return this;
    }

    /**
     * Overrides the duration of an effect or sound
     *
     * @param {number} inDuration
     * @returns {Section} this
     */
    duration(inDuration){
        if(typeof inDuration !== "number") this.sequence.throwError(this, "duration", "inDuration must be of type number");
        this._duration = inDuration;
        return this;
    }

    /**
     * Causes the effect to fade in when played
     *
     * @param {number} duration
     * @param {object} [options] = options
     * @returns {Section} this
     */
    fadeIn(duration, options={}) {
        if(typeof options !== "object") this.sequence.throwError(this, "fadeIn", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        options = mergeFunc({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof duration !== "number") this.sequence.throwError(this, "fadeIn", "duration must be of type number");
        if(typeof options.ease !== "string") this.sequence.throwError(this, "fadeIn", "options.ease must be of type string");
        if(typeof options.delay !== "number") this.sequence.throwError(this, "fadeIn", "options.delay must be of type number");
        this._fadeIn = {
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

    /**
     * Causes the effect to fade out at the end of the effect's duration
     *
     * @param {number} duration
     * @param {object} [options] = options
     * @returns {Section} this
     */
    fadeOut(duration, options={}) {
        if(typeof options !== "object") this.sequence.throwError(this, "fadeOut", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        options = mergeFunc({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof duration !== "number") this.sequence.throwError(this, "fadeOut", "duration must be of type number");
        if(typeof options.ease !== "string") this.sequence.throwError(this, "fadeOut", "ease must be of type string");
        if(typeof options.delay !== "number") this.sequence.throwError(this, "fadeOut", "delay must be of type number");
        this._fadeOut = {
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
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
        if(!(await this.shouldPlay())) return;
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

    // I know this is nasty - but it is needed due to Proxies not changing scope when calling Reflect.get
    play(...args){ return this.sequence.play(...args) }
    thenDo(...args){ return this.sequence.thenDo(...args) }
    macro(...args){ return this.sequence.macro(...args) }
    effect(...args){ return this.sequence.effect(...args) }
    sound(...args){ return this.sequence.sound(...args) }
    wait(...args){ return this.sequence.wait(...args) }
    animation(...args){ return this.sequence.animation(...args) }

}