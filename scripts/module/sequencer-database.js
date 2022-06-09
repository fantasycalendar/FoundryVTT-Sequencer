import * as lib from './lib/lib.js';
import LoadingBar from "./lib/loadingBar.js";
import { SequencerFile } from "./sequencer-file.js";

const SequencerDatabase = {

    entries: {},
    flattenedEntries: [],
    privateModules: [],
    feetTest: new RegExp(/\.[0-9]+ft\.*/g),

    get publicModules(){
        return Object.keys(this.entries).filter(module => !this.privateModules.includes(module));
    },

    get publicFlattenedEntries(){
        return this.flattenedEntries.filter(entry => !this.privateModules.includes(entry.split('.')[0]));
    },

    get publicFlattenedSimpleEntries(){
        return lib.make_array_unique(this.publicFlattenedEntries.map(entry => {
            return entry.split(this.feetTest)[0];
        }));
    },

    /**
     *  Registers a set of entries to the database on the given module name
     *
     * @param  {string}      inModuleName  The namespace to assign to the inserted entries
     * @param  {object}      inEntries     The entries to merge into the database
     * @param  {boolean}     isPrivate     Whether to mark these entries as private and not show in Effect Player or Database Viewer
     * @return {boolean}
     */
    registerEntries(inModuleName, inEntries, isPrivate = false) {
        if(inModuleName.includes(".")) return this._throwError("registerEntries", "module name must not contain periods");
        if(this.entries[inModuleName]) lib.custom_warning("Sequencer", `registerEntries | module "${inModuleName}" has already been registered to the database! Do you have two similar modules active?`, true)
        this._flatten(inEntries, inModuleName);
        const processedEntries = this._processEntries(inModuleName, inEntries);
        this.entries = foundry.utils.mergeObject(this.entries,
            { [inModuleName]: processedEntries }
        );
        if(isPrivate) this.privateModules.push(inModuleName);
        console.log(`Sequencer | Database | Entries for "${inModuleName}" registered`);
        return true;
    },

    /**
     *  Validates the entries under a certain module name, checking whether paths to assets are correct or not
     *
     * @param  {string}     inModuleName    The namespace to assign to the inserted entries
     * @return {boolean}
     */
    async validateEntries(inModuleName) {
        const entries = this.getEntry(inModuleName);
        ui.notifications.info(`Validating paths registered to "${inModuleName}"...`)
        let isValid = true;
        LoadingBar.init(`Validating paths registered to "${inModuleName}"...`, entries.length);
        for(let entry of entries){
            const result = await entry.validate()
            LoadingBar.incrementProgress();
            isValid = !(!result || !isValid);
        }
        if(!isValid){
            ui.notifications.error(`Validation of paths registered to "${inModuleName}" failed! Errors logged in console.`)
        }else{
            ui.notifications.info(`Validation of paths registered to "${inModuleName}" complete! No errors found!`)
        }
    },

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString) {
        if (typeof inString !== "string") return this._throwError("entryExists", "inString must be of type string");
        inString = inString.trim()
        if (inString === "")  return this._throwError("entryExists", "inString cannot be empty")
        inString = inString.replace(/\[[0-9]+]$/, "");
        return this.flattenedEntries.find(entry => entry.startsWith(inString));
    },

    /**
     *  Gets the entry in the database by a dot-notated string
     *
     * @param  {string}                     inString        The entry to find in the database
     * @param  {boolean}                    softFail        Whether it should soft fail (no error) when no entry was found
     * @return {array|SequencerFile|boolean}                The found entry in the database, or false if not found (with warning)
     */
    getEntry(inString, { softFail = false }={}) {
        if (typeof inString !== "string") return this._throwError("getEntry", "inString must be of type string")
        inString = inString.trim()
        if (inString === "")  return this._throwError("getEntry", "inString cannot be empty")
        inString = inString.replace(/\[[0-9]+]$/, "");
        if (!this.entryExists(inString)){
            if(softFail) return false;
            return this._throwError("getEntry", `Could not find ${inString} in database`);
        }

        let ft = false;
        let index = false;
        if(this.feetTest.test(inString)){
            ft = inString.match(this.feetTest)[0];
            const split = inString.split(ft).filter(str => str !== "");
            if(split.length > 1){
                index = split[1].split('.')[0];
            }
            inString = split[0];
        }

        const module = inString.split('.')[0];
        const exactEntries = this.entries[module].filter(entry => {
            return entry.dbPath === inString;
        });

        let filteredEntries = (exactEntries.length
            ? exactEntries
            : this.entries[module].filter(entry => {
                return entry.dbPath.startsWith(inString);
            })).map(entry => {
                let foundFile = entry;
                if(ft) foundFile = entry.file?.[ft] ?? foundFile;
                if(index) foundFile = foundFile?.[index] ?? foundFile;
                return foundFile;
            });

        if (!filteredEntries.length) return this._throwError("getEntry", `Could not find ${inString} in database`);

        const foundEntry = filteredEntries.length === 1 ? filteredEntries[0] : filteredEntries;

        if(index && filteredEntries.length === 1){
            foundEntry.fileIndex = Number(index);
        }

        return foundEntry;
    },
    /**
     *  Gets all files under a database path
     *
     * @param  {string}         inDBPath    The module to get all files from
     * @return {array|boolean}                  The found entries in the database under the module's name, or false if not found (with warning)
     */
    getAllFileEntries(inDBPath) {
        if (typeof inDBPath !== "string") return this._throwError("getAllFileEntries", "inDBPath must be of type string");
        inDBPath = inDBPath.trim();
        if (inDBPath === "")  return this._throwError("getAllFileEntries", "inDBPath cannot be empty")
        if (!this.entryExists(inDBPath)) return this._throwError("getAllFileEntries", `Could not find ${inDBPath} in database`);
        const entries = this._recurseGetFilePaths(inDBPath);
        return lib.make_array_unique(entries.flat());
    },

    /**
     *  Get all valid entries under a certain path
     *
     * @param  {string}             inPath      The database path to get entries under
     * @return {array}                          An array containing the next layer of valid paths
     */
    getPathsUnder(inPath){
        if (typeof inPath !== "string") return this._throwError("getPathsUnder", "inPath must be of type string")
        inPath = inPath.trim();
        if (inPath === "")  return this._throwError("getPathsUnder", "inPath cannot be empty")
        inPath = inPath.replace(/\[[0-9]+]$/, "");
        if (!this.entryExists(inPath)) return this._throwError("getPathsUnder", `Could not find ${inPath} in database`);
        let entries = this.flattenedEntries.filter(e => e.startsWith(inPath) && e !== inPath);
        if(entries.length === 0) return [];
        return lib.make_array_unique(entries.map(e => e.split(inPath)[1].split('.')[1]));
    },

    /**
     *  Get all valid entries under a certain path
     *
     * @param  {string}             inPath          The database path to search for
     * @param  {boolean}            publicOnly      Whether to only search for public modules
     * @return {array|boolean}                      An array containing potential database paths
     */
    searchFor(inPath, publicOnly = true){

        const modules = publicOnly ? this.publicModules : Object.keys(this.entries);
        let entries = publicOnly ? this.publicFlattenedEntries : this.flattenedEntries;

        if((!inPath || inPath === "") && !modules.includes(inPath)) return modules;

        if (typeof inPath !== "string"){
            return this._throwError("searchFor", "inString must be of type string")
        }

        inPath = inPath.trim();

        if (inPath === "")  return this._throwError("searchFor", "inString cannot be empty")

        inPath = inPath.replace(/\[[0-9]+]$/, "");
        inPath = inPath.trim()

        entries = entries.filter(e => e.startsWith(inPath) && e !== inPath);

        if(inPath.endsWith(".")) inPath = inPath.substring(0, inPath.length - 1);
        let length = inPath.split('.').length+1;
        let foundEntries = entries.map(e =>{
            let path = e.split(this.feetTest)[0];
            return path.split('.').slice(0, length).join('.');
        });

        if(foundEntries.length === 0){
            const regexString = lib.str_to_search_regex_str(inPath).replace(/\s+/g, "|");
            const searchParts = regexString.split('|').length;
            const regexSearch = new RegExp(regexString, "gu");
            foundEntries = this.flattenedEntries.filter(e => {
                return e.match(regexSearch)?.length >= searchParts;
            }).map(e =>{
                return e.split(this.feetTest)[0];
            });
        }

        return lib.make_array_unique(foundEntries);
    },

    /**
     * Throws an error without THROWING one. Duh.
     *
     * @param inFunctionName
     * @param inError
     * @returns {boolean}
     * @private
     */
    _throwError(inFunctionName, inError) {
        let error = `Sequencer | Database | ${inFunctionName} - ${inError}`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    },

    /**
     * Gets all file paths from the entirety of
     *
     * @param inDBPath
     * @returns {Array}
     * @private
     */
    _recurseGetFilePaths(inDBPath) {
        const module = inDBPath.split('.')[0];
        return this.entries[module]
            .filter(entry => entry.dbPath.startsWith(inDBPath))
            .map(entry => {
                return entry.getAllFiles();
            }).flat();
    },

    /**
     * Flattens a given object to just their db path and file path
     *
     * @param entries
     * @param inModule
     * @private
     */
    _flatten(entries, inModule) {
        let flattened = lib.flatten_object(foundry.utils.duplicate({ [inModule]: entries }));
        this.flattenedEntries = lib.make_array_unique(this.flattenedEntries.concat(Object.keys(flattened)));
    },

    /**
     * Processes and recurse into a large object containing file paths at any given depth
     *
     * @param moduleName
     * @param entries
     * @returns {object}
     * @private
     */
    _processEntries(moduleName, entries) {
        entries = foundry.utils.duplicate(entries);
        let globalTemplate = entries?._templates ?? {};
        if(!globalTemplate?.["default"]){
            globalTemplate["default"] = [100, 0, 0];
        }
        let entryCache = [];
        this._recurseEntries(entryCache, moduleName, entries, globalTemplate);
        return entryCache;
    },

    /**
     * The main meat of the previous method, which handles individual types of entries within the object itself
     *
     * @param entryCache
     * @param dbPath
     * @param entries
     * @param globalTemplate
     * @param template
     * @returns {object}
     * @private
     */
    _recurseEntries(entryCache, dbPath, entries, globalTemplate, template) {

        if (entries?._template) {
            if(Array.isArray(entries?._template) && entries?._template.length === 3){
                template = entries?._template;
            }else {
                template = globalTemplate?.[entries._template] ?? template ?? globalTemplate?.["default"];
            }
        }

        if (typeof entries === "string" || typeof entries?.file === "string") {

            entryCache.push(SequencerFile.make(entries, template ?? globalTemplate?.["default"], dbPath));

        } else if (Array.isArray(entries)) {

            for (let i = 0; i < entries.length; i++) {
                let recurseDBPath = dbPath + "." + i;
                this._recurseEntries(entryCache, recurseDBPath, entries[i], globalTemplate, template);
            }

        } else {

            let feetTest = new RegExp(/^[0-9]+ft$/g);

            let foundDistances = Object.keys(entries).filter(entry => feetTest.test(entry)).length !== 0;

            if (foundDistances) {
                entryCache.push(SequencerFile.make(entries, template ?? globalTemplate?.["default"], dbPath));
            } else {
                for (let entry of Object.keys(entries)) {
                    if (entry.startsWith('_')) continue;
                    let recurseDBPath = dbPath + "." + entry;
                    this._recurseEntries(entryCache, recurseDBPath, entries[entry], globalTemplate, template);
                }
            }
        }

        return entries;
    }
}

export default SequencerDatabase;