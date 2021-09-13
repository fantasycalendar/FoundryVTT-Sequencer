import Section from "./sections/section.js";
import * as lib from "./lib/lib.js";

export default class SequencerSectionManager {

    constructor() {
        this.externalSections = {};
    }

    /**
     * Registers a class by a name that will then be available
     *
     * @param {String}      inName
     * @param {Class}       inClass
     * @param {Boolean}     overwrite
     * @returns {Boolean}               Whether the registration succeeded
     */
    registerSection(inName, inClass, overwrite = false){

        if(!(inClass.prototype instanceof Section)) {
            throw lib.throwError("SequencerSectionManager", `inClass must be instance of Sequencer.BaseSection`);
        }

        if(this.externalSections[inName] && !overwrite){
            throw lib.throwError("SequencerSectionManager", `${inName} is already a registered Section with the class ${inClass.constructor.name}`);
        }

        if(game.settings.get('sequencer', 'debug')) console.log(`DEBUG | Sequencer.SectionManager | Successfully ${inName} to Sequencer with the class ${inClass.constructor.name}`)

        this.externalSections[inName] = inClass;

        return true;

    }

}