import * as lib from "../../lib.js";

export default {

	/**
	 * Base properties
	 */
	_file: "",
	_baseFolder: "",
	_recurseFunction: false,
	_mustache: false,

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

	_recurseFileObject(inFile){

		if(typeof inFile === "string" || Array.isArray(inFile)) return inFile;

		if(this._recurseFunction){
			let [inFile, result] = this._recurseFunction(inFile);
			if(result) return inFile;
		}

		inFile = lib.random_object_element(inFile);

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
					inFile = inFile.replace(/\[[0-9]+]$/, "");
				}
				inFile = window.SequencerDatabase.get(inFile) || inFile;
			}
		}

		inFile = this._recurseFileObject(inFile);

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