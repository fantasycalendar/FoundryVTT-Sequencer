import * as lib from "../../lib/lib.js";

export default {

	/**
	 * Base properties
	 */
	_file: "",
	_baseFolder: "",
	_mustache: false,

	/**
	 * Declares which file to be played. This may also be an array of paths, which will be randomly picked from each
	 * time the section is played.
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
		if(typeof inBaseFolder !== "string") throw this.sequence._throwError(this, "baseFolder", "inBaseFolder must be of type string");
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
		if(typeof inMustache !== "object") throw this.sequence._throwError(this, "setMustache", "inMustache must be of type object");
		this._mustache = inMustache;
		return this;
	},

	_recurseFileObject(inFile){

		if(inFile instanceof lib.SequencerFile || typeof inFile === "string" || typeof inFile.file === "string"){
			return inFile;
		}

		if(Array.isArray(inFile)){
			inFile = lib.random_array_element(inFile);
		}else{
			inFile = lib.random_object_element(inFile);
		}

		return this._recurseFileObject(inFile);

	},

	_determineFile(inFile){

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
					inFile = dbEntry;
				}
			}
		}

		inFile = this._recurseFileObject(inFile);

		if(Array.isArray(inFile)) {
			inFile = typeof forcedIndex !== "number" ? lib.random_array_element(inFile) : inFile[forcedIndex % inFile.length];
		}

		if(typeof forcedIndex === "number" && inFile instanceof lib.SequencerFile){
			inFile.fileIndex = forcedIndex;
		}

		inFile = this._applyBaseFolder(inFile);

		inFile = this._applyMustache(inFile);

		return inFile;

	},

	_applyBaseFolder(inFile){

		if(inFile instanceof lib.SequencerFile){
			return inFile.applyBaseFolder(this._baseFolder);
		}

		return inFile.startsWith(this._baseFolder) ? inFile : this._baseFolder + inFile;

	},

	_applyMustache(inFile){
		if(!this._mustache) return inFile;

		if(inFile instanceof lib.SequencerFile){
			inFile = inFile.applyMustache(this._mustache);
		}else if (typeof inFile === "string") {
			let template = Handlebars.compile(inFile);
			inFile = template(this._mustache);
		}
		return inFile;
	}

}