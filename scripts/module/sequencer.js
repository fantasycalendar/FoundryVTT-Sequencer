import * as lib from './lib.js';
import FunctionSection from './sections/func.js';
import EffectSection from './sections/effect.js';
import SoundSection from './sections/sound.js';
import Version from "../version.js";

export default class Sequence{

    constructor() {
        this.sections = [];
        this._cachedOffsets = {};
        this._fileCache = game.settings.get("sequencer", "fileCache");
        this.effectIndex = 0;
        let version = new Version().onOrAfter("0.8.6");
        this.mergeObject = version ? foundry.utils.mergeObject : mergeObject;
    }
    /**
     * Plays all of this sequence's sections
     *
     * @returns {Sequence} this
     */
    async play(){
        await this._prepareOffsetCache();
        this.effectIndex = 0;
        for(let section of this.sections){
            if(section instanceof EffectSection) this.effectIndex++;
            if(section.shouldWaitUntilFinished) {
                await section.execute();
            }else{
                section.execute();
            }
            await new Promise((resolve) => setTimeout(resolve, 1));
        }
        return this;
    }

    /**
     * Creates a section that will run a function.
     *
     * @param {function} inFunc
     * @param {boolean} [inWaitUntilFinished=true] inWaitUntilFinished
     * @returns {Sequence} this
     */
    then(inFunc, inWaitUntilFinished = true){
        let func = new FunctionSection(this, inFunc, inWaitUntilFinished);
        this._addSection(func)
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

        this._addSection(func)
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
        return this._addSection(effect);
    }

    /**
     * Creates a sound section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Sound section.
     *
     * @param {string} [inFile] inFile
     * @returns {Section}
     */
    sound(inFile=""){
        let sound = new SoundSection(this, inFile);
        return this._addSection(sound);
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

    async _prepareOffsetCache(){
        this._cachedOffsets = {};
        for(let section of this.sections) {
            await section.prepareOffsetCache();
        }
    }

    _insertCachedOffset(inName, inObject, inOffset){
        if(this._cachedOffsets[inName] === undefined){
            this._cachedOffsets[inName] = [];
        }
        this._cachedOffsets[inName].push({
            "object": inObject,
            "offset": inOffset
        });
    }

    _getCachedOffset(inName, inIndex){
        if(!this._cachedOffsets.hasOwnProperty(inName)) console.error(`${inName} could not be found in previous positions!`);
        let normalizedIndex = inIndex % this._cachedOffsets[inName].length;
        return this._cachedOffsets?.[inName]?.[normalizedIndex];
    }

    /**
     * This function wraps the section in a proxy object so that effect and sound
     * sections can call functions like .wait() and .then(), even though they
     * don't possess those functions, and instead gets called on the Sequence.
     *
     * @param {Section} inSection
     */
    _proxyWrap(inSection){
        return new Proxy(inSection, {
            get(target, name, receiver) {
                if (typeof target[name] === 'undefined') {
                    if (typeof target.sequence[name] === 'undefined') {
                        this.throwError(this, "wait", `Function ${name} was not found!`);
                    }
                    return Reflect.get(target.sequence, name, receiver);
                }
                return Reflect.get(target, name, receiver);
            }
        });
    }

    _addSection(inSection){
        let section = this._proxyWrap(inSection);
        this.sections.push(section);
        return section;
    }

    _createWaitSection(ms = 1){
        return new FunctionSection(this, async function(){
            return new Promise(async (resolve) => {
                setTimeout(resolve, ms)
            });
        }, true);
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

}