import * as lib from './lib.js';
import FunctionSection from './sections/func.js';
import EffectSection from './sections/effect.js';
import SoundSection from './sections/sound.js';
import AnimationSection from './sections/animation.js';
import Version from "../version.js";

export default class Sequence{

    constructor() {
        this.sections = [];
        this._cachedOffsets = {};
        this._fileCache = game.settings.get("sequencer", "fileCache");
        this.effectIndex = 0;
        this.version = new Version().onOrAfter("0.8.6");
        this._debug = game.settings.get("sequencer", "debug");
    }

    /**
     * Plays all of this sequence's sections
     *
     * @returns {Sequence} this
     */
    play(){
        return new Promise(async (resolve) => {
            this.log("Preparing cache")
            await this._prepareOffsetCache();
            this.effectIndex = 0;
            this.log("Playing sections")
            for(let section of this.sections){
                if(section instanceof EffectSection) this.effectIndex++;
                if(section.shouldWaitUntilFinished) {
                    await section.execute();
                }else{
                    section.execute();
                }
                await new Promise((resolve) => setTimeout(resolve, 1));
            }
            this.log("Finished playing sections")
            resolve(this);
        })
    }

    /**
     * Creates a section that will run a function.
     *
     * @param {function} inFunc
     * @returns {Sequence} this
     */
    thenDo(inFunc){
        let func = new FunctionSection(this, inFunc);
        this.sections.push(func)
        return this;
    }

    /**
     * Creates a section that will run a macro based on a name or a direct reference to a macro.
     *
     * @param {string|Macro} [inMacro] inFile
     * @param {boolean} [inWaitUntilFinished=true] inWaitUntilFinished
     * @returns {Sequence} this
     */
    macro(inMacro, inWaitUntilFinished = true){
        let macro;
        if(typeof inMacro === "string") {
            macro = game.macros.getName(inMacro);
            if (!macro) {
                this.throwError(this, "macro", `Macro '${inMacro}' was not found`);
            }
        } else if(inMacro instanceof Macro) {
            macro = inMacro;
        } else {
            this.throwError(this, "macro", `inMacro must be of instance string or Macro`);
        }

        let func = new FunctionSection(this, async function(){
            await macro.execute();
        }, inWaitUntilFinished);

        this.sections.push(func)
        return this;
    }

    /**
     * Creates an effect section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Effect section.
     *
     * @param {string} [inFile] inFile
     * @returns {Section}
     */
    effect(inFile=""){
        let effect = new EffectSection(this, inFile);
        this.sections.push(effect);
        return effect;
    }

    /**
     * Creates a sound section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Sound section.
     *
     * @param {string} [inFile] inFile
     * @returns {Section}
     */
    sound(inFile=""){
        let sound = new SoundSection(this, inFile);
        this.sections.push(sound);
        return sound;
    }

    /**
     * Creates an animation. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Animation section.
     *
     * @param {Token|Tile|boolean} [inTarget=false] inTarget
     * @returns {AnimationSection}
     */
    animation(inTarget = false){
        let animation = new AnimationSection(this, inTarget);
        this.sections.push(animation);
        return animation;
    }

    /**
     * Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given
     * a second number, a random wait time between the two given numbers will be generated.
     *
     * @param {number} [msMin=1] minMs
     * @param {number} [msMax=1] maxMs
     * @returns {Sequence} this
     */
    wait(msMin = 1, msMax = 1){
        if(msMin < 1) this.throwError(this, "wait", 'Wait ms cannot be less than 1')
        if(msMax < 1) this.throwError(this, "wait", 'Max wait ms cannot be less than 1')
        let wait = lib.random_int_between(msMin, Math.max(msMin, msMax))
        let section = this._createWaitSection(wait);
        this.sections.push(section);
        return this;
    }

    /**
     * Adds the sections from a given Sequence to this Sequence
     *
     * @param {Sequence|FunctionSection|EffectSection|AnimationSection|SoundSection} inSequence
     * @returns {Sequence} this
     */
    sequence(inSequence){
        if(!(inSequence instanceof Sequence)) inSequence = inSequence.sequence;
        if(!(inSequence instanceof Sequence)) this.throwError(this, "sequence", `could not find the sequence from the given parameter`);
        this.sections = this.sections.concat(inSequence.sections);
        return this;
    }

    async _prepareOffsetCache(){
        this._cachedOffsets = {};
        for(let section of this.sections) {
            await section.prepareOffsetCache();
        }
    }

    _insertCachedOffset(inName, inObject, inOffset, inExtraOffset){
        if(this._cachedOffsets[inName] === undefined){
            this._cachedOffsets[inName] = [];
        }
        this._cachedOffsets[inName].push({
            "object": inObject,
            "offset": inOffset,
            "extraOffset": inExtraOffset
        });
    }

    _getCachedOffset(inName, inIndex){
        if(!this._cachedOffsets.hasOwnProperty(inName)) console.error(`${inName} could not be found in previous positions!`);
        let normalizedIndex = inIndex % this._cachedOffsets[inName].length;
        return this._cachedOffsets?.[inName]?.[normalizedIndex];
    }

    _createWaitSection(ms = 1){
        return new FunctionSection(this, async function(){
            return new Promise(async (resolve) => {
                setTimeout(resolve, ms)
            });
        });
    }

    _getFileFromCache(inFile){
        if(inFile in this._fileCache){
            return this._fileCache[inFile];
        }
        return false;
    }

    _addFileToCache(inFile, data){
        this._fileCache[inFile] = data;
        game.settings.set("sequencer", "fileCache", this._fileCache);
    }

    throwError(self, func, error){
        error = `Sequencer | ${self.constructor.name} | ${func} - ${error}`;
        ui.notifications.error(error);
        throw new Error(error);
    }

    log(...args){
        if(this._debug) console.log(`DEBUG | Sequencer |`, ...args);
    }

}