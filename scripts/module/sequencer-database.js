import * as lib from './lib.js';

export default class SequencerDatabase{

    constructor() {
        this.contents = {};
        this.flattenedContents = [];
        this._currentTemplate = false;
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
        this.contents = foundry.utils.mergeObject(this.contents, newEntry);
        this._flatten();
    }

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString){
        inString = inString.replace(/\[[0-9]+]$/, "")
        return this.flattenedContents.find(entry => entry.startsWith(inString));
    }

    /**
     *  Gets the entry in the database by a dot-notated string
     *
     * @param  {string}             inString    The entry to find in the database
     * @return {object|boolean}                 The found entry in the database, or false if not found (with warning)
     */
    getEntry(inString){
        inString = inString.replace(/\[[0-9]+]$/, "");
        if(!this.entryExists(inString)) return this._throwNotFound(inString);
        let parts = inString.split('.');
        let length = parts.length-1;

        let index = 0;
        let entry = parts?.[index];
        let currentInspect = this.contents?.[entry];

        let globalTemplates = currentInspect?._templates;
        let currentTemplate = false;

        while(index < length && currentInspect && entry){
            index++;
            entry = parts?.[index];
            currentInspect = currentInspect?.[entry];
            if(globalTemplates) {
				currentTemplate = globalTemplates?.[currentInspect?._template] || currentTemplate;
			}
        }

        if(!currentInspect) return this._throwNotFound(inString, entry);

		return {entry: currentInspect, globalTemplates, currentTemplate};
    }

    _flatten(){
        this.flattenedContents = Object.keys(
            lib.flattenObject(foundry.utils.duplicate(this.contents))
        );
    }

    _throwNotFound(inString, entry = false){
        let error = `Sequencer | Database | Could not find "${inString}" in database`;
        if(entry) error += ` - found entries up to: "${entry}"`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    }
}