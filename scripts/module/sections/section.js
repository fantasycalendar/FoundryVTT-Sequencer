import * as lib from "../lib/lib.js";

export default class Section {

    constructor(inSequence) {
        this.sequence = inSequence;
        this._applyTraits();
        this._playIf = true;
        this._waitUntilFinished = true;
        this._async = false;
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
     * Method overwritten by inheriting classes, which runs when the section is executed by the Sequence
     *
     * @returns {Promise<void>}
     * @private
     */
    async run() {}

    /**
     * Method overwritten by inheriting classes, which stores data or prepares data before the Sequence executes it (see EffectsSection)
     *
     * @private
     */
    async _initialize() {}

    /**
     * Method overwritten by inheriting classes. Inheriting classes uses the following to apply traits to themselves:
     * - Object.assign(this.constructor.prototype, trait)
     *
     * @private
     */
    _applyTraits() {}

    /** ------------------------------------------------------------------------------------------------------------------------------ *
     * Methods below this point should NOT be overridden by child instances of the class, they are integral to the sequence functioning
     * ------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * Causes the section to be repeated n amount of times, with an optional delay. If given inRepeatDelayMin
     * and inRepeatDelayMax, a random repetition delay will be picked for every repetition
     *
     * @param {number} inRepetitions
     * @param {number} inRepeatDelayMin
     * @param {number} inRepeatDelayMax
     * @returns {Section} this
     */
    repeats(inRepetitions, inRepeatDelayMin = 0, inRepeatDelayMax) {
        if (!lib.is_real_number(inRepetitions)) throw this.sequence._throwError(this, "repeats", "inRepetitions must be of type number");
        if (!lib.is_real_number(inRepeatDelayMin)) throw this.sequence._throwError(this, "repeats", "repeatDelayMin must be of type number");
        if (inRepeatDelayMax && !lib.is_real_number(inRepeatDelayMax)) {
            throw this.sequence._throwError(this, "repeats", "repeatDelayMax must be of type number");
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
        this._playIf = inCondition;
        return this;
    }

    /**
     * Causes the section to finish running before starting the next section.
     *
     * @param {number} [inDelay=0] inDelay
     * @returns {Section} this
     */
    waitUntilFinished(inDelay = 0) {
        if (!lib.is_real_number(inDelay)) throw this.sequence._throwError(this, "waitUntilFinished", "inDelay must be of type number");
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
    async() {
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
        if (!lib.is_real_number(msMin)) throw this.sequence._throwError(this, "delay", "msMin must be of type number");
        if (msMax && !lib.is_real_number(msMax)) throw this.sequence._throwError(this, "delay", "msMax must be of type number");
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
    duration(inDuration) {
        if (!lib.is_real_number(inDuration)) throw this.sequence._throwError(this, "duration", "inDuration must be of type number");
        this._duration = inDuration;
        return this;
    }

    /**
     * @private
     */
    async _shouldPlay() {
        return lib.is_function(this._playIf) ? await this._playIf() : this._playIf;
    }

    /**
     * @private
     */
    _validateLocation(inLocation) {
        if (typeof inLocation === "string") {
            inLocation = lib.getObjectFromScene(inLocation) ?? inLocation;
        }
        if (inLocation instanceof foundry.abstract.Document) {
            let object = inLocation?.object;
            if (!object) object = lib.getObjectFromScene(inLocation.id);
            if (!object) throw this.sequence._throwError(this, "_validateLocation", `Could not find object for document with ID: ${inLocation.id})`);
            if (!(object instanceof PlaceableObject)) throw this.sequence._throwError(this, "_validateLocation", `Object provided must be instance of PlaceableObject!`);
            return object;
        }
        return inLocation;
    }

    /**
     * @private
     */
    async _execute() {
        if (!await this._shouldPlay()) return;
        let self = this;
        this._basicDelay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise(async (resolve) => {
            setTimeout(async function () {
                for (let i = 0; i < self._repetitions; i++) {
                    self._currentRepetition = i;
                    self._repeatDelay = i !== self._repetitions - 1 ? lib.random_float_between(self._repeatDelayMin, self._repeatDelayMax) : 0;
                    if (self._shouldAsync) {
                        await self.run();
                    } else {
                        self.run();
                    }
                    if (self._repetitions > 1 && i !== self._repetitions - 1) {
                        await self._delayBetweenRepetitions();
                    }
                }
                resolve();
            }, this._basicDelay);
        });
    }

    /**
     * @private
     */
    async _delayBetweenRepetitions() {
        let self = this;
        return new Promise((resolve) => {
            setTimeout(resolve, self._repeatDelay)
        });
    }

    /**
     * @private
     */
    get _shouldAsync() {
        return this._async || this._waitAnyway
    }

    /**
     * @private
     */
    get shouldWaitUntilFinished() {
        return this._waitUntilFinished || this._waitAnyway
    }

    /**
     * @private
     */
    get _waitAnyway() {
        return ((this._async || this._waitUntilFinished) && this._isLastRepetition)
            || (this._isLastRepetition && this._isLastSection);
    }

    /**
     * @private
     */
    get _isLastSection() {
        return (this.sequence.sections.length - 1) === this.sequence.sections.indexOf(this);
    }

    /**
     * @private
     */
    get _isLastRepetition() {
        return (this._repetitions === 1 || this._repetitions === this._currentRepetition + 1);
    }

    /**
     * @private
     */
    get _currentWaitTime() {
        let waitUntilFinishedDelay = this._waitAnyway ? this._waitUntilFinishedDelay : 0;
        return waitUntilFinishedDelay + this._repeatDelay;
    }

}