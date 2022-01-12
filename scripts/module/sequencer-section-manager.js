import Section from "./sections/section.js";
import * as lib from "./lib/lib.js";

export default class SequencerSectionManager {

    constructor() {
        this.externalSections = {};
    }

    /**
     * Registers a class by a name that will then be available through the Sequencer
     *
     * @param {String}      inModuleName
     * @param {String}      inMethodName
     * @param {Class}       inClass
     * @param {Boolean}     overwrite
     * @returns {Boolean}               Whether the registration succeeded
     */
    registerSection(inModuleName, inMethodName, inClass, overwrite = false){

        if(!(inClass.prototype instanceof Section)) {
            throw lib.custom_error(inModuleName, `inClass must be instance of Sequencer.BaseSection`);
        }

        let coreMethods = Object.getOwnPropertyNames(Sequence.prototype)
            .filter(method => {
                return !method.startsWith("_") && method !== "constructor"
            });

        if(coreMethods.includes(inMethodName)){
            throw lib.custom_error(inModuleName, `${inMethodName} is an existing protected method of the Sequence class - please register with another method name!`);
        }

        if(this.externalSections[inMethodName] && !overwrite){
            throw lib.custom_error(inModuleName, `${inMethodName} is already a registered Section with the class ${this.externalSections[inMethodName].constructor.name}`);
        }

        coreMethods = coreMethods.concat(Object.keys(this.externalSections));

        const clashingMethods = Object.getOwnPropertyNames(inClass.prototype).filter(method => coreMethods.includes(method));

        if(clashingMethods.length){
            let errors = clashingMethods.join(", ");
            throw lib.custom_error(inModuleName, `${inMethodName} cannot contain the following methods: ${errors}<br>These methods are existing methods on the Sequence or from already registered Sections. Please rename these methods to avoid conflicts.`);
        }

        lib.debug(`SectionManager | Successfully registered ${inMethodName} with Sequencer!`)

        this.externalSections[inMethodName] = inClass;

        return true;

    }

}