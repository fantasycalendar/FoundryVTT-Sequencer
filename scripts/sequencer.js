import * as lib from './lib.js';
import FunctionSection from './sections/func.js';
import EffectSection from './sections/effect.js';
import SoundSection from './sections/sound.js';

export class Sequence{

    constructor() {
        this.sections = [];
        this._fileCache = game.settings.get("sequencer", "fileCache");
    }

    async play(){
        for(let section of this.sections){
            if(section._async) {
                await section.execute();
            }else{
                section.execute();
            }
        }
    }

    then(inFunc, inAsync = true){
        let func = new FunctionSection(this, inFunc, inAsync);
        this._addSection(func)
        return this;
    }

    effect(inFile=""){
        let effect = new EffectSection(this, inFile);
        return this._addSection(effect);
    }

    macro(inMacro, inAsync = true){
        let macro;
        if(typeof inMacro === "string") {
            macro = game.macros.getName(inMacro);
            if (!macro) {
                throw new Error(`Macro '${inMacro}' was not found`);
            }
        } else if(inMacro instanceof Macro) {
            macro = inMacro;
        } else {
            throw new Error(`inMacro must be of instance string or Macro`);
        }

        let func = new FunctionSection(this, async function(){
            await macro.execute();
        }, inAsync);

        this._addSection(func)
        return this;
    }

    sound(inFile=""){
        let sound = new SoundSection(this, inFile);
        return this._addSection(sound);
    }

    wait(minMs = 1, maxMs = 1){
        if(minMs < 1) throw new Error('Wait ms cannot be less than 1')
        if(maxMs < 1) throw new Error('Max wait ms cannot be less than 1')
        let wait = lib.random_int_between(minMs, Math.max(minMs, maxMs))
        let section = this._createWaitSection(wait);
        this.sections.push(section);
        return this;
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
                        throw new Error(`Function ${name} was not found!`);
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
        this.sections.push(this._createWaitSection());
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

}