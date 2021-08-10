import * as lib from "../lib.js";

export default class Section{

    constructor(inSequence){
        this.sequence = inSequence;
        this._playIf = true;
		this._waitUntilFinished = false;
        this._async = false;
        this._offsets = [];
        this._waitUntilFinishedDelay = 0;
        this._repetitions = 1;
        this._currentRepetition = 0;
        this._repeatDelayMin = 0;
        this._repeatDelayMax = 0;
        this._repeatDelay = 0;
        this._delayMin = 0;
        this._delayMax = 0;
        this._basicDelay = 0;
        this._duration = false;
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
        if(typeof inRepetitions !== "number") this.sequence._throwError(this, "repeats", "inRepetitions must be of type number");
        if(typeof inRepeatDelayMin !== "number") this.sequence._throwError(this, "repeats", "repeatDelayMin must be of type number");
        if(inRepeatDelayMax && typeof inRepeatDelayMax !== "number"){
            this.sequence._throwError(this, "repeats", "repeatDelayMax must be of type number");
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
            this.sequence._throwError(this, "playIf", "inCondition must be of type boolean or function");
        }
        this._playIf = inCondition;
        return this;
    }

    /**
     * Causes the section to finish running before starting the next section.
     *
     * @param {number} [inDelay=0] inDelay
     * @returns {Section} this
     */
    waitUntilFinished(inDelay=0){
        if(typeof inDelay !== "number") this.sequence._throwError(this, "waitUntilFinished", "inDelay must be of type number");
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
     * Delays the effect or sound from being played for a set amount of milliseconds. If given a second number, a
     * random delay between the two numbers will be generated.
     *
     * @param {number} [msMin=1] minMs
     * @param {number} [msMax=1] maxMs
     * @returns {Section} this
     */
    delay(msMin, msMax) {
        if(typeof msMin !== "number") this.sequence._throwError(this, "delay", "msMin must be of type number");
        if(msMax && typeof msMax !== "number") this.sequence._throwError(this, "delay", "msMax must be of type number");
        this._delayMin = Math.min(msMin, msMax ?? msMin);
        this._delayMax = Math.max(msMin, msMax ?? msMin)
        return this;
    }

    /**
     * Overrides the duration of an effect or sound
     *
     * @param {number} inDuration
     * @returns {Section} this
     */
    duration(inDuration){
        if(typeof inDuration !== "number") this.sequence._throwError(this, "duration", "inDuration must be of type number");
        this._duration = inDuration;
        return this;
    }

    async _shouldPlay(){
        return lib.is_function(this._playIf) ? await this._playIf() : this._playIf;
    }

    get _shouldAsync(){
        return this._async || this._waitAnyway
    }

	get shouldWaitUntilFinished(){
		return this._waitUntilFinished || this._waitAnyway
	}

    get _waitAnyway(){
        return ((this._async || this._waitUntilFinished) && this.isLastRepetition)
			|| (this.isLastRepetition && this.isLastSection);
    }

    get isLastSection(){
		return (this.sequence.sections.length-1) === this.sequence.sections.indexOf(this);
	}

    get isLastRepetition(){
    	return (this._repetitions === 1 || this._repetitions === this._currentRepetition+1);
	}

    get _currentWaitTime(){
        let waitUntilFinishedDelay = this._waitAnyway ? this._waitUntilFinishedDelay : 0;
        return waitUntilFinishedDelay + this._basicDelay + this._repeatDelay;
    }

    async _prepareOffsetCache(){
        this._offsets = [];
        for (let index = 0; index < this._repetitions; index++) {
            this._cacheOffsets();
        }
    }

	/**
	 * Overridden method in EffectSection
	 */
	_cacheOffsets(){}

	_findObjectById(inId, isToken=false){
		if(isToken){
			let token = canvas.tokens.get(inId);
			if(token) return token;
		}
		for(let layer of canvas.layers){
			let obj = layer?.objects?.children?.find(obj => obj.id === inId)
			if(obj) return obj;
		}
	}

	_validateLocation(inLocation) {
		if(typeof inLocation === "string" && !this.sequence._cachedOffsetExists(inLocation)){
			inLocation = this._findObjectById(inLocation) ?? inLocation;
		}
		if(inLocation instanceof TokenDocument){
			let token = this._findObjectById(inLocation.id, true);
			if(!token) this.sequence._throwError(this, "_validateLocation", `Could not find "${inLocation.name}" token! (ID ${inLocation.id})`);
			inLocation = token;
		}
		return inLocation;
	}

    async _execute(){
        if(!await this._shouldPlay()) return;
        let self = this;
        this._basicDelay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise(async (resolve) => {
            setTimeout(async function () {
                for (let i = 0; i < self._repetitions; i++) {
                    self._currentRepetition = i;
                    self._repeatDelay = i !== self._repetitions-1 ? lib.random_float_between(self._repeatDelayMin, self._repeatDelayMax) : 0;
                    if (self._shouldAsync) {
                        await self._run();
                    } else {
                        self._run();
                    }
                    if (self._repetitions > 1 && i !== self._repetitions-1) {
                        await self._delayBetweenRepetitions();
                    }
                }
                resolve();
            }, this._basicDelay);
        });
    }

    async _delayBetweenRepetitions(){
        let self = this;
        return new Promise((resolve) => {
            setTimeout(resolve, self._repeatDelay)
        });
    }

    async _run(){}

	// I know this is nasty - but it is needed due to Proxies not changing scope when calling Reflect.getEntry
	play(...args){ return this.sequence.play(...args) }
	thenDo(...args){ return this.sequence.thenDo(...args) }
	macro(...args){ return this.sequence.macro(...args) }
	effect(...args){ return this.sequence.effect(...args) }
	sound(...args){ return this.sequence.sound(...args) }
	wait(...args){ return this.sequence.wait(...args) }
	animation(...args){ return this.sequence.animation(...args) }

}