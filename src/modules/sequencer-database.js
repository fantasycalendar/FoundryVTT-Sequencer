import * as lib from "../lib/lib.js";
import LoadingBar from "../utils/loadingBar.js";
import { SequencerFile, SequencerFileBase } from "./sequencer-file.js";
import { writable, get } from "svelte/store";
import CONSTANTS from "../constants.js";

class Database {
  #entriesStore = writable({});

  privateModules = [];
  flattenedEntries = [];
  inverseFlattenedEntries = new Map();

  get entries() {
    return get(this.#entriesStore);
  }
  set entries(entries) {
    this.#entriesStore.set(entries);
  }
  get entriesStore() {
    return this.#entriesStore;
  }

  get publicModules() {
    return Object.keys(this.entries).filter(
      (module) => !this.privateModules.includes(module)
    );
  }

  get publicFlattenedEntries() {
    return this.flattenedEntries.filter((entry) => {
      return this.privateModules.indexOf(entry.split(".")[0]) === -1;
    });
  }

  get publicFlattenedSimpleEntries() {
    return lib.make_array_unique(
      this.publicFlattenedEntries.map((entry) => {
        return entry.split(CONSTANTS.FEET_REGEX)[0];
      })
    );
  }

  /**
   *  Retrieves an object of every public entry
   *
   * @return {object}
   */
  get filePathDatabasePaths() {
    const fileDatabaseObject = {};
    Object.entries(this.entries)
      .map((entry) => entry[1])
      .deepFlatten()
      .forEach((sequencerFile) => {
        if (sequencerFile?.rangeFind) {
          Object.entries(sequencerFile.file).forEach((entry) => {
            fileDatabaseObject[entry[1]] =
              sequencerFile.dbPath + "." + entry[0];
          });
        } else {
          fileDatabaseObject[sequencerFile.file] = sequencerFile.dbPath;
        }
      });
    return fileDatabaseObject;
  }

  /**
   *  Registers a set of entries to the database on the given module name
   *
   * @param  {string}      inModuleName  The namespace to assign to the inserted entries
   * @param  {object}      inEntries     The entries to merge into the database
   * @param  {boolean}     isPrivate     Whether to mark these entries as private and not show in Effect Player or Database Viewer
   * @return {boolean}
   */
  registerEntries(inModuleName, inEntries, isPrivate = false) {
    if (inModuleName.includes("."))
      return this._throwError(
        "registerEntries",
        "module name must not contain periods"
      );
    if (this.entries[inModuleName])
      lib.custom_warning(
        "Sequencer",
        `registerEntries | module "${inModuleName}" has already been registered to the database! Do you have two similar modules active?`,
        true
      );
    this._flatten(inEntries, inModuleName);
    const processedEntries = this._processEntries(inModuleName, inEntries);
    if (isPrivate) this.privateModules.push(inModuleName);
    this.entries = foundry.utils.mergeObject(this.entries, {
      [inModuleName]: processedEntries,
    });
    lib.debug(
      `Sequencer | Database | Entries for "${inModuleName}" registered`
    );
    Hooks.callAll("registerSequencerDatabaseEntries", inModuleName);
    return true;
  }

  /**
   *  Validates the entries under a certain module name, checking whether paths to assets are correct or not
   *
   * @param  {string}     inModuleName    The namespace to assign to the inserted entries
   * @return {boolean}
   */
  async validateEntries(inModuleName) {
    let entries = this.getEntry(inModuleName);
    if (!Array.isArray(entries)) {
      entries = [entries];
    }
    ui.notifications.info(
      `Validating paths registered to "${inModuleName}"...`
    );
    let isValid = true;
    LoadingBar.init(
      `Validating paths registered to "${inModuleName}"...`,
      entries.length
    );
    for (let entry of entries) {
      const result = await entry.validate();
      LoadingBar.incrementProgress();
      isValid = !(!result || !isValid);
    }
    if (!isValid) {
      ui.notifications.error(
        `Validation of paths registered to "${inModuleName}" failed! Errors logged in console.`
      );
    } else {
      ui.notifications.info(
        `Validation of paths registered to "${inModuleName}" complete! No errors found!`
      );
    }
  }

  /**
   *  Quickly checks if the entry exists in the database
   *
   * @param  {string}      inString    The entry to find in the database
   * @return {boolean}                 If the entry exists in the database
   */
  entryExists(inString) {
    if (typeof inString !== "string")
      return this._throwError("entryExists", "inString must be of type string");
    inString = inString.trim();
    if (inString === "")
      return this._throwError("entryExists", "inString cannot be empty");
    inString = inString.replace(/\[[0-9]+]$/, "");
    return this.flattenedEntries.find((entry) => entry.startsWith(inString));
  }

  /**
   *  Gets the entry in the database by a dot-notated string
   *
   * @param  {string}                     inString        The entry to find in the database
   * @param  {boolean}                    softFail        Whether it should soft fail (no error) when no entry was found
   * @return {array|SequencerFile|boolean}                The found entry in the database, or false if not found (with warning)
   */
  getEntry(inString, { softFail = false } = {}) {
    if (typeof inString !== "string") {
      if (softFail) return false;
      return this._throwError("getEntry", "inString must be of type string");
    }
    inString = inString.trim();
    if (inString === "") {
      if (softFail) return false;
      return this._throwError("getEntry", "inString cannot be empty");
    }
    inString = inString.replace(/\[[0-9]+]$/, "");
    if (!this.entryExists(inString)) {
      if (softFail) return false;
      return this._throwError(
        "getEntry",
        `Could not find ${inString} in database`
      );
    }

    let ft = false;
    let index = false;
    if (CONSTANTS.FEET_REGEX.test(inString)) {
      ft = inString.match(CONSTANTS.FEET_REGEX)[0];
      const split = inString.split(ft).filter((str) => str !== "");
      if (split.length > 1) {
        index = split[1].split(".")[0];
      }
      inString = split[0];
    }

    const module = inString.split(".")[0];
    const exactEntries = this.entries[module].filter((entry) => {
      return entry.dbPath === inString;
    });

    let filteredEntries = (
      exactEntries.length
        ? exactEntries
        : this.entries[module].filter((entry) => {
            return entry.dbPath.startsWith(inString);
          })
    ).map((entry) => {
      let foundFile = entry;
      if (ft) foundFile = entry.file?.[ft] ?? foundFile;
      if (index) foundFile = foundFile?.[index] ?? foundFile;
      return foundFile;
    });

    if (!filteredEntries.length)
      return this._throwError(
        "getEntry",
        `Could not find ${inString} in database`
      );

    const foundEntry =
      filteredEntries.length === 1 ? filteredEntries[0] : filteredEntries;

    if (index && filteredEntries.length === 1) {
      foundEntry.fileIndex = Number(index);
    }

    return foundEntry;
  }

  /**
   *  Gets all files under a database path
   *
   * @param  {string}         inDBPath    The module to get all files from
   * @return {array|boolean}                  The found entries in the database under the module's name, or false if not found (with warning)
   */
  getAllFileEntries(inDBPath) {
    if (typeof inDBPath !== "string")
      return this._throwError(
        "getAllFileEntries",
        "inDBPath must be of type string"
      );
    inDBPath = inDBPath.trim();
    if (inDBPath === "")
      return this._throwError("getAllFileEntries", "inDBPath cannot be empty");
    if (!this.entryExists(inDBPath))
      return this._throwError(
        "getAllFileEntries",
        `Could not find ${inDBPath} in database`
      );
    const entries = this._recurseGetFilePaths(inDBPath);
    return lib.make_array_unique(entries.flat());
  }

  /**
   *  Get all valid entries under a certain path
   *
   * @param  {string}             inPath      The database path to get entries under
   * @return {array|boolean}                  An array containing the next layer of valid paths
   */
  getPathsUnder(
    inPath,
    {
      ranges = false,
      arrays = false,
      match = false,
      fullyQualified = false,
    } = {}
  ) {
    if (typeof inPath !== "string")
      return this._throwError("getPathsUnder", "inPath must be of type string");
    inPath = inPath.trim();
    if (inPath === "")
      return this._throwError("getPathsUnder", "inPath cannot be empty");
    inPath = inPath.replace(/\[[0-9]+]$/, "");
    if (!this.entryExists(inPath))
      return this._throwError(
        "getPathsUnder",
        `Could not find ${inPath} in database`
      );
    const entries = this.flattenedEntries.filter((e) => {
      return (
        (e.startsWith(inPath + ".") || e === inPath) &&
        (!match || (match && e.match(match)))
      );
    });
    if (entries.length === 0) return [];
    return lib.make_array_unique(
      entries
        .map((e) => (!arrays ? e.split(CONSTANTS.ARRAY_REGEX)[0] : e))
        .map((e) => (!ranges ? e.split(CONSTANTS.FEET_REGEX)[0] : e))
        .map((e) => (!fullyQualified ? e.split(inPath)[1] : e))
        .map((e) => (!fullyQualified ? (e ? e.split(".")[1] : "") : e))
        .filter(Boolean)
    );
  }

  /**
   *  Get all valid entries under a certain path
   *
   * @param  {string}             inPath          The database path to search for
   * @param  {boolean}            publicOnly      Whether to only search for public modules
   * @return {array|boolean}                      An array containing potential database paths
   */
  searchFor(inPath, publicOnly = true) {
    const modules = publicOnly ? this.publicModules : Object.keys(this.entries);
    const originalEntries = publicOnly
      ? this.publicFlattenedEntries
      : this.flattenedEntries;

    if ((!inPath || inPath === "") && !modules.includes(inPath)) return modules;

    if (typeof inPath !== "string") {
      return this._throwError("searchFor", "inString must be of type string");
    }

    inPath = inPath.trim();

    if (inPath === "")
      return this._throwError("searchFor", "inString cannot be empty");

    inPath = inPath.replace(/\[[0-9]+]$/, "");
    inPath = inPath.trim();

    let entries = originalEntries.filter(
      (e) => e.startsWith(inPath) && e !== inPath
    );

    if (inPath.endsWith(".")) inPath = inPath.substring(0, inPath.length - 1);
    let length = inPath.split(".").length + 1;
    let foundEntries = entries.map((e) => {
      let path = e.split(CONSTANTS.FEET_REGEX)[0];
      return path.split(".").slice(0, length).join(".");
    });

    if (foundEntries.length === 0) {
      const regexString = lib
        .str_to_search_regex_str(inPath)
        .replace(/\s+/g, "|");
      const searchParts = regexString.split("|").length;
      const regexSearch = new RegExp(regexString, "gu");
      foundEntries = originalEntries
        .filter((e) => {
          return e.match(regexSearch)?.length >= searchParts;
        })
        .map((e) => {
          return e.split(CONSTANTS.FEET_REGEX)[0];
        });
    }

    return lib.make_array_unique(foundEntries);
  }

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
    return false;
  }

  /**
   * Gets all file paths from the entirety of
   *
   * @param inDBPath
   * @returns {Array}
   * @private
   */
  _recurseGetFilePaths(inDBPath) {
    const module = inDBPath.split(".")[0];
    return this.entries[module]
      .filter((entry) => entry.dbPath.startsWith(inDBPath))
      .map((entry) => {
        return entry.getAllFiles();
      })
      .flat();
  }

  /**
   * Flattens a given object to just their db path and file path
   *
   * @param entries
   * @param inModule
   * @private
   */
  _flatten(entries, inModule) {
    let flattened = lib.flatten_object(
      foundry.utils.duplicate({ [inModule]: entries })
    );
    this.flattenedEntries = lib.make_array_unique(
      this.flattenedEntries.concat(
        Object.keys(flattened).map((file) => file.split(".file")[0])
      )
    );
    this.inverseFlattenedEntries = Object.keys(flattened).reduce(
      (acc, entry) => {
        return acc.set(flattened[entry], entry.split(".file")[0]);
      },
      this.inverseFlattenedEntries
    );
  }

  /**
   * Processes and recurse into a large object containing file paths at any given depth
   *
   * @param moduleName
   * @param entries
   * @returns {object}
   * @private
   */
  _processEntries(moduleName, entries) {
    const allPaths = new Set(
      this.flattenedEntries
        .filter((e) => e.split(".")[0] === moduleName)
        .map((e) => e.split(CONSTANTS.FEET_REGEX)[0])
    );

    const allTemplates = foundry.utils.mergeObject(entries?._templates ?? {}, {
      default: [100, 0, 0],
    });

    if (entries?._templates) {
      delete entries?._templates;
    }

    const moduleEntries = [];

    const mediaFileExtensions = Object.keys(CONST.FILE_CATEGORIES.IMAGE)
      .concat(Object.keys(CONST.FILE_CATEGORIES.VIDEO))
      .concat(Object.keys(CONST.FILE_CATEGORIES.AUDIO))
      .concat(['json']);

    for (let wholeDBPath of allPaths) {
      let metadata = this._getCleanData(entries);
      let dbPath = wholeDBPath.split(".");
      dbPath.shift();
      let combinedPath = "";
      for (let part of dbPath) {
        combinedPath = combinedPath ? combinedPath + "." + part : part;
        const entry = foundry.utils.getProperty(entries, combinedPath);
        if (Array.isArray(entry) || typeof entry === "string" || entry?.file) {
          metadata = this._getCleanData(entry, { existingData: metadata });
          break;
        }
        metadata = this._getCleanData(entry, { existingData: metadata });
      }

      if (!metadata.template) metadata.template = "default";
      if (typeof metadata.template === "string") {
        metadata.template =
          allTemplates?.[metadata.template] ?? allTemplates?.["default"];
      }

      let data = foundry.utils.getProperty(entries, dbPath.join("."));
      if (!Array.isArray(data) && !(typeof data === "string")) {
        data = this._getCleanData(data, { metadata: false });
      }

      if (typeof data === "string") {
        const existingEntry = this.entryExists(data);
        const extension = data
          .split(".")
          [data.split(".").length - 1].toLowerCase();

        if (
          !existingEntry &&
          extension &&
          !mediaFileExtensions.includes(extension)
        ) {
          console.warn(
            `Sequencer | Database | registerEntries - failed to register ${wholeDBPath} to ${data}!`
          );
          this.flattenedEntries.splice(
            this.flattenedEntries.indexOf(wholeDBPath),
            1
          );
          continue;
        } else if (existingEntry) {
          const sequencerFile = this.getEntry(data);
          const clone = sequencerFile.clone();
          clone.dbPath = wholeDBPath;
          clone.metadata = foundry.utils.mergeObject(
            clone.metadata ?? {},
            metadata ?? {}
          );
          moduleEntries.push(clone);
          continue;
        }
      }

      moduleEntries.push(SequencerFileBase.make(data, wholeDBPath, metadata));
    }

    return moduleEntries;
  }

  _getCleanData(data, { existingData = {}, metadata = true } = {}) {
    data = Object.entries(data).filter((entry) => {
      return metadata === entry[0].startsWith("_");
    });
    if (metadata) {
      data = data.map((entry) => [entry[0].slice(1), entry[1]]);
    }
    return foundry.utils.mergeObject(existingData, Object.fromEntries(data));
  }
}

const SequencerDatabase = new Database();

export default SequencerDatabase;
