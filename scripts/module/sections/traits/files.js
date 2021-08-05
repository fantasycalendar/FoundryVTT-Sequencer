import * as lib from "../../lib.js";

export default {

	/**
	 * Base properties
	 */
	_file: "",
	_baseFolder: "",
	_mustache: false,
	_globalTemplate: false,
	_currentTemplate: false,

	/**
	 * Declares which .webm to be played This may also be an array of paths, which will be randomly picked from each
	 * time the effect is played.
	 *
	 * @param {string|array} inFile
	 * @returns this
	 */
	file(inFile) {
		this._file = inFile;
		return this;
	},

	/**
	 * Defines the base folder that will prepend to the file path. This is mainly just useful to make the file
	 * path easier to manage.
	 *
	 * @param {string} inBaseFolder
	 * @returns this
	 */
	baseFolder(inBaseFolder) {
		if(typeof inBaseFolder !== "string") this.sequence._throwError(this, "baseFolder", "inBaseFolder must be of type string");
		inBaseFolder = inBaseFolder.replace("\\", "/");
		if(!inBaseFolder.endsWith("/")) {
			inBaseFolder += "/";
		}
		this._baseFolder = inBaseFolder;
		return this;
	},

	/**
	 * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
	 *
	 * @param {object} inMustache
	 * @returns this
	 */
	setMustache(inMustache) {
		if(typeof inMustache !== "object") this.sequence._throwError(this, "setMustache", "inMustache must be of type object");
		this._mustache = inMustache;
		return this;
	},

	_recurseFileObject(inFile, recurseFunction=false){

		if(typeof inFile === "string" || Array.isArray(inFile)) return inFile;

		if(inFile._template){
			this._currentTemplate = this._globalTemplate?.[inFile._template] || this._currentTemplate;
		}

		if(recurseFunction){
			let result = recurseFunction(inFile)
			inFile = result[0];
			if(result[1]) return inFile;
		}

		inFile = lib.random_object_element(inFile);

		return this._recurseFileObject(inFile, recurseFunction);

	},

	_determineFile(inFile, recurseFunction=false){

		if(Array.isArray(inFile)) inFile = lib.random_array_element(inFile);

		inFile = this._applyMustache(inFile);

		let forcedIndex = false;
		if(typeof inFile === "string") {
			let databaseEntry = window.SequencerDatabase.entryExists(inFile);
			if(databaseEntry){
				let match = inFile.match(/\[([0-9]+)]$/)
				if(match) {
					forcedIndex = Number(match[1]);
				}
				let dbEntry = window.SequencerDatabase.getEntry(inFile);
				if(dbEntry){
					inFile = dbEntry.entry;
					this._globalTemplate = dbEntry.globalTemplates;
					this._currentTemplate = dbEntry.currentTemplate ?? this._globalTemplate?.["default"] ?? false;
				}
			}
		}

		inFile = this._recurseFileObject(inFile, recurseFunction);

		if(Array.isArray(inFile)) {
			inFile = typeof forcedIndex !== "number" ? lib.random_array_element(inFile) : inFile[forcedIndex % inFile.length];
		}

		inFile = inFile.startsWith(this._baseFolder) ? inFile : this._baseFolder + inFile;

		inFile = this._applyMustache(inFile);

		return inFile;

	},

	_applyMustache(inFile){
		if (typeof inFile === "string" && this._mustache) {
			let template = Handlebars.compile(inFile);
			inFile = template(this._mustache);
		}
		return inFile;
	}

}