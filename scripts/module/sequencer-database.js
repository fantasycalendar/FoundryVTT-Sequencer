import * as lib from './lib/lib.js';

const SequencerDatabase = {

        entries: {},
        flattenedEntries: [],

    /**
     *  Registers a set of entries to the database on the given module name
     *
     * @param  {string}      moduleName    The namespace to assign to the inserted entries
     * @param  {object}      entries       The entries to merge into the database
     * @return {void}
     */
    registerEntries(moduleName, entries){
		this._flatten(entries, moduleName);
		this.entries = foundry.utils.mergeObject(this.entries,
			{ [moduleName]: this._processFiles(entries) }
		);
		console.log(`Sequencer | Database | Entries for "${moduleName}" registered`);
    },

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString){
        inString = inString.replace(/\[[0-9]+]$/, "");
        return this.flattenedEntries.find(entry => entry.startsWith(inString));
    },

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
        let currentInspect = this.entries?.[entry];

        while(index < length && currentInspect && entry){
            index++;
            entry = parts?.[index];
            currentInspect = currentInspect?.[entry];
            if(currentInspect instanceof lib.SequencerFile){
				currentInspect = currentInspect.file;
			}
        }

        if(!currentInspect) return this._throwNotFound(inString);

		return currentInspect;
    },

	getAllFileEntries(inString){
		if(!this.entryExists(inString)) return this._throwNotFound(inString);
		return this.getAllFilesUnder(inString);
	},

	getAllFilesUnder(inString){
		if(!this.entryExists(inString)) return this._throwNotFound(inString);
    	let entries = this.getEntry(inString);
    	return Array.from(new Set(this._recurseEntriesUnder(entries)));
	},

	_recurseEntriesUnder(entries, listEntries = []) {

		if(entries instanceof lib.SequencerFile){

			if(entries.rangeFind){
				listEntries = listEntries.concat(Object.values(entries.file));
			}else{
				listEntries.push(entries.file);
			}
		}else{
			if(Array.isArray(entries)){
				for(let i = 0; i < entries.length; i++){
					listEntries = this._recurseEntriesUnder(entries[i], listEntries);
				}
			}else{
				for (let [key, entry] of Object.entries(entries)) {
					if (key.startsWith('_')) continue;
					listEntries = this._recurseEntriesUnder(entry, listEntries);
				}
			}
		}

		return listEntries;

	},

    _flatten(entries, inModule){
    	let flattened = lib.flattenObject(foundry.utils.duplicate({[inModule]: entries}));
        this.flattenedEntries = Array.from(new Set(this.flattenedEntries.concat(Object.keys(flattened))));
    },

    _throwNotFound(inString){
        let error = `Sequencer | Database | Could not find "${inString}" in database`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    },

	_processFiles(entries){
		entries = foundry.utils.duplicate(entries);
    	let globalTemplate = entries._templates ?? false;
    	return this._recurseFiles(entries, globalTemplate);
	},

    _recurseFiles(entries, globalTemplate, template){

		if(entries._template){
			template = globalTemplate?.[entries._template] ?? template ?? globalTemplate?.["default"];
		}

		if(typeof entries === "string" || typeof entries?.file === "string"){

			entries = new lib.SequencerFile(entries, template);

		}else if(Array.isArray(entries)){

			for(let i = 0; i < entries.length; i++){
				entries[i] = this._recurseFiles(entries[i], globalTemplate, template);
			}

		}else{

			let feetTest = new RegExp(/^[0-9]+ft$/g);

			let foundDistances = Object.keys(entries).filter(entry => feetTest.test(entry)).length !== 0;

			if(foundDistances){
				entries = new lib.SequencerFile(entries, template);
			}else {
				for (let entry of Object.keys(entries)) {
					if (entry.startsWith('_')) continue;
					entries[entry] = this._recurseFiles(entries[entry], globalTemplate, template);
				}
			}
		}

		return entries;
	}
}

export default SequencerDatabase;