import * as lib from "../../lib/lib.js";
import { SequencerFileRangeFind } from "../../sequencer-file.js";

export default {

    /**
     * Base properties
     */
    _file: "",
    _fileOptions: false,
    _baseFolder: "",
    _mustache: null,
    _silentlyFail: true,

    /**
     * Declares which file to be played. This may also be an array of paths, which will be randomly picked from each
     * time the section is played.
     *
     * @param {string|array} inFile
     * @param {boolean} silentlyFail
     * @returns this
     */
    file(inFile, silentlyFail = false) {
        this._file = inFile;
        this._silentlyFail = silentlyFail;
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
        if (typeof inBaseFolder !== "string") throw this.sequence._customError(this, "baseFolder", "inBaseFolder must be of type string");
        this._baseFolder = inBaseFolder + (inBaseFolder.endsWith("/") ? "" : "/");
        return this;
    },

    /**
     * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
     *
     * @param {object} inMustache
     * @returns this
     */
    setMustache(inMustache) {
        if (typeof inMustache !== "object") throw this.sequence._customError(this, "setMustache", "inMustache must be of type object");
        this._mustache = inMustache;
        return this;
    },

    async _determineFile(inFile) {

        if(!Array.isArray(inFile) && typeof inFile === "object"){
            return this._validateCustomRange(inFile);
        }

        if (Array.isArray(inFile)) inFile = lib.random_array_element(inFile, { recurse: true });

        inFile = this._applyMustache(inFile);

        if (Sequencer.Database.entryExists(inFile)) {
            return this._determineDatabaseFile(inFile);
        }

        const determinedFile = await this._processFile(inFile);

        return { file: determinedFile, forcedIndex: false, customRange: false };

    },

    async _processFile(inFile){
        inFile = this._applyMustache(inFile);
        inFile = this._applyBaseFolder(inFile);
        inFile = await this._applyWildcard(inFile);
        if (Array.isArray(inFile)) inFile = lib.random_array_element(inFile, { recurse: true });
        return inFile;
    },

    async _validateCustomRange(inFile){

        const finalFiles = {};
        const validRanges = Object.keys(SequencerFileRangeFind.ftToDistanceMap);
        for(const [range, rangeFile] of Object.entries(inFile)){
            if(!validRanges.includes(range)){
                throw this.sequence._customError(this, "file", `a file-distance key map must only contain the following keys: ${validRanges.join(", ")}`);
            }
            finalFiles[range] = await this._processFile(rangeFile);
        }

        return { file: finalFiles, forcedIndex: false, customRange: true };

    },

    _determineDatabaseFile(inFile){
        const entries = Sequencer.Database.getEntry(inFile);
        const entry = Array.isArray(entries) ? lib.random_array_element(entries) : entries;
        const match = inFile.match(/\[([0-9]+)]$/);
        return { file: entry, forcedIndex: match ? Number(match[1]) : false, customRange: false };
    },

    _applyBaseFolder(inFile) {
        if (Array.isArray(inFile)) return inFile.map((file) => this._applyBaseFolder(file));
        return inFile.startsWith(this._baseFolder) ? inFile : this._baseFolder + inFile;
    },

    _applyMustache(inFile) {
        if (!this._mustache) return inFile;
        let template = Handlebars.compile(inFile);
        return template(this._mustache);
    },

    async _applyWildcard(inFile) {
        if (!inFile.includes("*")) return inFile;
        if (Array.isArray(inFile)) return inFile.map(async (file) => await this._applyWildcard(file));
        inFile = this._applyBaseFolder(inFile);
        return lib.getFiles(inFile, { applyWildCard: true });
    }

}