import * as lib from './lib.js';

export default class SequencerDatabase{

    constructor() {
        this.contents = {};
        this.flattenedContents = [];
        let version = new lib.Version().onOrAfter("0.8.6");
        this.mergeFunc = version ? foundry.utils.mergeObject : mergeObject;
        this.duplicate = version ? foundry.utils.duplicate : duplicate;
    }

    /**
     *  Registers a set of entries to the database on the given module name
     *
     * @param  {string}      moduleName    The namespace to assign to the inserted entries
     * @param  {object}      entries       The entries to merge into the database
     * @return {void}
     */
    registerEntries(moduleName, entries){
        console.log(`Sequencer | Database | Entries for "${moduleName}" registered`);
        let newEntry = {[moduleName]: entries};
        this.contents = this.mergeFunc(this.contents, newEntry);
        this._flatten();
    }

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString){
        return this.flattenedContents.filter(entry => entry.startsWith(inString)).length > 0;
    }

    /**
     *  Gets the entry in the database by a dot-notated string
     *
     * @param  {string}             inString    The entry to find in the database
     * @return {object|boolean}                 The found entry in the database, or false if not found (with warning)
     */
    get(inString){
        inString = inString.replace(/\[[0-9]+]$/, "");
        if(!this.entryExists(inString)) return this._throwNotFound(inString);
        let parts = inString.split('.');
        let length = parts.length-1;

        let index = 0;
        let entry = parts?.[index];
        let currentInspect = this.contents?.[entry];
        while(index < length && currentInspect && entry){
            index++;
            entry = parts?.[index];
            currentInspect = currentInspect?.[entry];
        }
        if(!currentInspect) return this._throwNotFound(inString, entry);
        return currentInspect;
    }

    _flatten(){
        this.flattenedContents = Object.keys(lib.flattenObject(this.duplicate(this.contents)));
    }

    _throwNotFound(inString, entry = false){
        let error = `Sequencer | Database | Could not find "${inString}" in database`;
        if(entry) error += ` - found entries up to: "${entry}"`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    }
}