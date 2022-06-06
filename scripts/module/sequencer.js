import * as lib from './lib/lib.js';
import FunctionSection from './sections/func.js';
import EffectSection from './sections/effect.js';
import SoundSection from './sections/sound.js';
import AnimationSection from './sections/animation.js';
import Section from "./sections/section.js";

export default class Sequence {

    constructor(moduleName = "Sequencer") {
        this.id = randomID();
        this.moduleName = moduleName;
        this.sections = [];
        this.nameOffsetMap = false;
        this.effectIndex = 0;
        this.sectionToCreate = undefined;
        return lib.sequence_proxy_wrap(this);
    }

    /**
     * Plays all of this sequence's sections
     *
     * @returns {Promise}
     */
    async play() {
        Hooks.call("createSequencerSequence");
        lib.debug("Initializing sections")
        for (let section of this.sections) {
            await section._initialize();
        }
        this.effectIndex = 0;
        lib.debug("Playing sections")

        const promises = [];
        for (let section of this.sections) {
            if (section instanceof EffectSection) this.effectIndex++;
            if (section.shouldWaitUntilFinished) {
                promises.push(await section._execute());
            } else {
                promises.push(section._execute());
            }
            if (!section._isLastSection) await new Promise((resolve) => setTimeout(resolve, 1));
        }

        return Promise.allSettled(promises).then(() => {
            Hooks.call("endedSequencerSequence");
            lib.debug("Finished playing sections")
        });
    }

    /**
     * Creates a section that will run a function.
     *
     * @param {function} inFunc
     * @returns {Sequence} this
     */
    thenDo(inFunc) {
        const func = lib.section_proxy_wrap(new FunctionSection(this, inFunc));
        this.sections.push(func)
        return func;
    }

    /**
     * Creates a section that will run a macro based on a name or a direct reference to a macro.
     *
     * @param {string|Macro} inMacro
     * @param {*} args
     * @returns {Sequence} this
     */
    macro(inMacro, ...args) {
        let macro;
        let compendium = false;
        if (typeof inMacro === "string") {
            if (inMacro.startsWith("Compendium")) {
                let packArray = inMacro.split(".")
                let pack = game.packs.get(`${packArray[1]}.${packArray[2]}`)
                // Catch invalid compendium pack
                if (!pack) {
                    throw lib.custom_error(this.moduleName, `macro - Compendium '${packArray[1]}.${packArray[2]}' was not found`);
                }
                macro = packArray;
                compendium = pack;
            }else {
                macro = game.macros.getName(inMacro);
                if (!macro) {
                    throw lib.custom_error(this.moduleName, `macro - Macro '${inMacro}' was not found`);
                }
            }
        } else if (inMacro instanceof Macro) {
            macro = inMacro;
        } else {
            throw lib.custom_error(this.moduleName, `macro - inMacro must be of instance string or Macro`);
        }

        if(args && args.length && !game.modules.get("advanced-macros")?.active){
            lib.custom_warning(this.moduleName, `macro - Supplying macros with arguments require the advanced-macros module to be active`, true);
        }

        const func = lib.section_proxy_wrap(new FunctionSection(this, async () => {
            if(compendium){
                const macroData = (await compendium.getDocuments()).find((i) => i.data.name === macro[3])?.toObject();
                if (!macroData) {
                    throw lib.custom_error(this.moduleName, `macro - Macro '${macro[3]}' was not found in compendium '${macro[1]}.${macro[2]}'`);
                }
                macro = new Macro(macroData);
                macro.data.permission.default = CONST.DOCUMENT_PERMISSION_LEVELS.OWNER;
            }
            await macro.execute(...args);
        }, true));
        this.sections.push(func)
        return this;
    }

    /**
     * Creates an effect section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Effect section.
     *
     * @param {string} [inFile] inFile
     * @returns {Section}
     */
    effect(inFile = "") {
        const effect = lib.section_proxy_wrap(new EffectSection(this, inFile));
        this.sections.push(effect);
        return effect;
    }

    /**
     * Creates a sound section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Sound section.
     *
     * @param {string} [inFile] inFile
     * @returns {Section}
     */
    sound(inFile = "") {
        const sound = lib.section_proxy_wrap(new SoundSection(this, inFile));
        this.sections.push(sound);
        return sound;
    }

    /**
     * Creates an animation. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Animation section.
     *
     * @param {Token|Tile} [inTarget=false] inTarget
     * @returns {AnimationSection}
     */
    animation(inTarget) {
        const animation = lib.section_proxy_wrap(new AnimationSection(this, inTarget));
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
    wait(msMin = 1, msMax = 1) {
        if (msMin < 1) throw lib.custom_error(this.moduleName, `wait - Wait ms cannot be less than 1`);
        if (msMax < 1) throw lib.custom_error(this.moduleName, `wait - Max wait ms cannot be less than 1`);
        const wait = lib.random_int_between(msMin, Math.max(msMin, msMax))
        const section = lib.section_proxy_wrap(this._createWaitSection(wait));
        this.sections.push(section);
        return this;
    }

    /**
     * Adds the sections from a given Sequence to this Sequence
     *
     * @param {Sequence|FunctionSection|EffectSection|AnimationSection|SoundSection} inSequence
     * @returns {Sequence} this
     */
    addSequence(inSequence) {
        if (inSequence instanceof Section) inSequence = inSequence.sequence;
        if (!(inSequence instanceof Sequence)){
            throw lib.custom_error(this.moduleName, `addSequence - could not find the sequence from the given parameter`);
        }
        this.sections = this.sections.concat(inSequence.sections);
        return this;
    }

    _createCustomSection(...args){
        const func = lib.section_proxy_wrap(new this.sectionToCreate(this, ...args));
        this.sectionToCreate = undefined;
        this.sections.push(func)
        return func;
    }

    _createWaitSection(ms = 1) {
        return new FunctionSection(this, async function () {
            return new Promise(async (resolve) => {
                setTimeout(resolve, ms)
            });
        });
    }

    _showWarning(self, func, warning, notify) {
        lib.custom_warning(this.moduleName, `${self.constructor.name.replace("Section", "")} | ${func} - ${warning}`, notify);
    }

    _customError(self, func, error) {
        return lib.custom_error(this.moduleName, `${self.constructor.name.replace("Section", "")} | ${func} - ${error}`);
    }

}