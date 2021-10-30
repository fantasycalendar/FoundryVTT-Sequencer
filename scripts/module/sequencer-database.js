import * as lib from './lib/lib.js';
import loadingBar from "./lib/loadingBar.js";

const SequencerDatabase = {

    entries: {},
    flattenedEntries: [],

    /**
     *  Registers a set of entries to the database on the given module name
     *
     * @param  {string}      inModuleName  The namespace to assign to the inserted entries
     * @param  {object}      inEntries     The entries to merge into the database
     * @return {boolean}
     */
    registerEntries(inModuleName, inEntries) {
        if(inModuleName.includes(".")) return this._throwError("registerEntries", "module name must not contain periods");
        if(this.entries[inModuleName]) lib.showWarning("Sequencer", `registerEntries | module "${inModuleName}" has already been registered to the database! Do you have two similar modules active?`, true)
        this._flatten(inEntries, inModuleName);
        this.entries = foundry.utils.mergeObject(this.entries,
            { [inModuleName]: this._processFiles(inModuleName, inEntries) }
        );
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
        loadingBar.init(`Validating paths registered to "${inModuleName}"...`, entries.length);
        for(let entry of entries){
            const result = await entry.validate()
            loadingBar.incrementProgress();
            isValid = !(!result || !isValid);
        }
        if(!isValid){
            ui.notifications.error(`Validation of paths registered to "${inModuleName}" failed! Errors logged in console.`)
        }else{
            ui.notifications.info(`Validation of paths registered to "${inModuleName}" complete! No errors found!`)
        }
        loadingBar.hide();
    },

    /**
     *  Quickly checks if the entry exists in the database
     *
     * @param  {string}      inString    The entry to find in the database
     * @return {boolean}                 If the entry exists in the database
     */
    entryExists(inString) {
        if (typeof inString !== "string") return this._throwError("entryExists", "inString must be of type string");
        inString = inString.replace(/\[[0-9]+]$/, "");
        return this.flattenedEntries.find(entry => entry.startsWith(inString));
    },

    /**
     *  Gets the entry in the database by a dot-notated string
     *
     * @param  {string}             inString    The entry to find in the database
     * @return {array|lib.SequencerFile}        The found entry in the database, or false if not found (with warning)
     */
    getEntry(inString) {
        if (typeof inString !== "string") return this._throwError("getEntry", "inString must be of type string")
        inString = inString.replace(/\[[0-9]+]$/, "");
        if (!this.entryExists(inString)) return this._throwError("getEntry", `Could not find ${inString} in database`);

        const ft = inString.endsWith("ft") ? inString.split('.').pop() : false;
        if(ft){
            inString = inString.split('.');
            inString.pop()
            inString = inString.join('.');
        }

        const module = inString.split('.')[0];
        const foundFiles = this.entries[module].filter(entry => {
            return entry.dbPath.startsWith(inString);
        }).map(entry => {
            return ft ? entry.file[ft] : entry;
        })

        if (!foundFiles.length) return this._throwError("getEntry", `Could not find ${inString} in database`);

        return foundFiles.length === 1 ? foundFiles[0] : foundFiles;
    },

    /**
     *  Get all valid entries under a certain path
     *
     * @param  {string}             inPath      The database path to get entries under
     * @return {array}                          An array containing the next layer of valid paths
     */
    getPathsUnder(inPath){
        if (typeof inPath !== "string") return this._throwError("getPathsUnder", "inString must be of type string")
        inPath = inPath.replace(/\[[0-9]+]$/, "");
        if (!this.entryExists(inPath)) return this._throwError("getPathsUnder", `Could not find ${inPath} in database`);
        let entries = this.flattenedEntries.filter(e => e.startsWith(inPath) && e !== inPath);
        if(entries.length === 0) return [];
        return lib.makeArrayUnique(entries.map(e => e.split(inPath)[1].split('.')[1]));
    },

    /**
     *  Gets all files under a module
     *
     * @param  {string}         inModuleName    The module to get all files from
     * @return {array|boolean}                  The found entries in the database under the module's name, or false if not found (with warning)
     */
    getAllFileEntries(inModuleName) {
        if (typeof inModuleName !== "string") return this._throwError("getAllFileEntries", "inString must be of type string");
        if (!this.entryExists(inModuleName)) return this._throwError("getAllFileEntries", `Could not find ${inModuleName} in database`);
        const entries = this._recurseEntriesUnder(inModuleName);
        return lib.makeArrayUnique(entries.flat());
    },

    _throwError(inFunctionName, inError) {
        let error = `Sequencer | Database | ${inFunctionName} - ${inError}`;
        ui.notifications.error(error);
        console.error(error);
        return false;
    },

    _recurseEntriesUnder(inModuleName) {
        return this.entries[inModuleName]
            .filter(entry => entry.moduleName === inModuleName)
            .map(entry => {
                return entry.getAllFiles();
            }).flat();
    },

    _flatten(entries, inModule) {
        let flattened = lib.flattenObject(foundry.utils.duplicate({ [inModule]: entries }));
        this.flattenedEntries = lib.makeArrayUnique(this.flattenedEntries.concat(Object.keys(flattened)));
    },

    _processFiles(moduleName, entries) {
        entries = foundry.utils.duplicate(entries);
        let globalTemplate = entries?._templates ?? false;
        let entryCache = [];
        this._recurseFiles(entryCache, moduleName, entries, globalTemplate);
        return entryCache;
    },

    _recurseFiles(entryCache, dbPath, entries, globalTemplate, template) {

        if (entries?._template) {
            template = globalTemplate?.[entries._template] ?? template ?? globalTemplate?.["default"];
        }

        if (typeof entries === "string" || typeof entries?.file === "string") {

            entryCache.push(new lib.SequencerFile(entries, template, dbPath));

        } else if (Array.isArray(entries)) {

            for (let i = 0; i < entries.length; i++) {
                let recurseDBPath = dbPath + "." + i;
                this._recurseFiles(entryCache, recurseDBPath, entries[i], globalTemplate, template);
            }

        } else {

            let feetTest = new RegExp(/^[0-9]+ft$/g);

            let foundDistances = Object.keys(entries).filter(entry => feetTest.test(entry)).length !== 0;

            if (foundDistances) {
                entryCache.push(new lib.SequencerFile(entries, template, dbPath));
            } else {
                for (let entry of Object.keys(entries)) {
                    if (entry.startsWith('_')) continue;
                    let recurseDBPath = dbPath + "." + entry;
                    this._recurseFiles(entryCache, recurseDBPath, entries[entry], globalTemplate, template);
                }
            }
        }

        return entries;
    }
}

export default SequencerDatabase;