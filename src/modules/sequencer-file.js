import * as lib from "../lib/lib.js";
import SequencerFileCache from "./sequencer-file-cache.js";

export class SequencerFileBase {
  static make(inData, inDBPath, inMetadata) {
    if (typeof inData === 'string' && !inDBPath && !inMetadata) {
      return new SequencerFilePlain(inData)
    }
    const originalFile = inData?.file ?? inData;
    const file = foundry.utils.duplicate(originalFile);
    const isRangeFind =
      typeof file !== "string" && !Array.isArray(originalFile)
        ? Object.keys(originalFile).filter((key) => key.endsWith("ft")).length >
          0
        : false;

    return isRangeFind
      ? new SequencerFileRangeFind(inData, inDBPath, inMetadata)
      : new SequencerFile(inData, inDBPath, inMetadata);
  }
}

export class SequencerFilePlain extends SequencerFileBase {
  #file
  rangeFind = false;

  constructor(inData) {
    super();
    this.#file = inData
  }

  getFileForDistance() {
    return this.getFile()
  }

  getFile() {
    return this.#file
  }
  getAllFiles() {
    return [this.#file]
  }
  async validate() {
    return Promise.resolve(!!this.#file)
  }

  clone() {
    return new SequencerFilePlain(this.#file)
  }

  getTimestamps() {
    return undefined
  }
}


export class SequencerFile extends SequencerFileBase {
  rangeFind = false;

  get isFlipbook() {
    return this.originalMetadata?.flipbook
  }

  constructor(inData, inDBPath, inMetadata) {
    super();
    inData = foundry.utils.duplicate(inData);
    inMetadata = foundry.utils.duplicate(inMetadata);
    this.originalData = inData;
    this.originalMetadata = inMetadata;
    for (let [key, value] of Object.entries(inMetadata)) {
      this[key] = value;
    }
    this.dbPath = inDBPath;
    this.moduleName = inDBPath.split(".")[0];
    this.originalFile = inData?.file ?? inData;
    this.file = foundry.utils.duplicate(this.originalFile);
    this.fileIndex = null;
    this.twister = false;
  }

  clone() {
    return SequencerFile.make(
      this.originalData,
      this.dbPath,
      this.originalMetadata
    );
  }

  async validate() {
    let isValid = true;
    const directories = {};
    const allFiles = this.getAllFiles();
    for (const file of allFiles) {
      let directory = file.split("/");
      directory.pop();
      directory = directory.join("/");
      if (directories[directory] === undefined) {
        directories[directory] = await lib.getFiles(directory);
      }
    }
    for (const file of allFiles) {
      let directory = file.split("/");
      directory.pop();
      directory = directory.join("/");

      if (directories[directory].indexOf(file) === -1) {
        console.warn(
          `"${this.dbPath}" has an incorrect file path, could not find file. Points to:\n${file}`
        );
        isValid = false;
      }
    }
    return isValid;
  }

  getAllFiles() {
    return [this.file].deepFlatten();
  }

  getFile() {
    if (Array.isArray(this.file)) {
      this.fileIndex = lib.is_real_number(this.fileIndex)
        ? this.fileIndex
        : lib.random_array_element(this.file, {
            twister: this.twister,
            index: true,
          });
      return this.file[this.fileIndex];
    }
    return this.file;
  }

  getTimestamps() {
    if (Array.isArray(this.originalMetadata?.timestamps)) {
      return (
        this.originalMetadata?.timestamps?.[this.fileIndex] ??
        this.originalMetadata?.timestamps[0]
      );
    }
    return this.originalMetadata?.timestamps;
  }

  getPreviewFile(entry) {
    let parts = entry.split(".");
    let files = this.getAllFiles();
    if (Array.isArray(files)) {
      if (lib.is_real_number(parts[parts.length - 1])) {
        files = files[parts[parts.length - 1]];
      } else {
        const index = Math.floor(lib.interpolate(0, files.length - 1, 0.5));
        files = files?.[index - 1] ?? files[index];
      }
    }
    return files;
  }

  getFileForDistance() {
    return this.getFile()
  }
}

export class SequencerFileRangeFind extends SequencerFile {
  rangeFind = true;

  constructor(...args) {
    super(...args);
    this._fileDistanceMap = false;
  }

  static get ftToDistanceMap() {
    return {
      "90ft": canvas.grid.size * 15,
      "60ft": canvas.grid.size * 9,
      "30ft": canvas.grid.size * 5,
      "15ft": canvas.grid.size * 2,
      "05ft": 0,
    };
  }

  get _gridSizeDiff() {
    return canvas.grid.size / this.template[0];
  }

  getAllFiles() {
    return Object.values(this.file).deepFlatten();
  }

  getFile(inFt = '15ft') {
    if (inFt && this.file[inFt]) {
      if (Array.isArray(this.file[inFt])) {
        const fileIndex = lib.is_real_number(this.fileIndex)
          ? Math.min(this.file[inFt].length - 1, this.fileIndex)
          : lib.random_array_element(this.file[inFt], {
              twister: this.twister,
              index: true,
            });
        return this.file[inFt][fileIndex];
      }
      return this.file[inFt];
    }

    return this.file;
  }

  getPreviewFile(entry) {
    let parts = entry.split(".");
    const ft = parts.find(
      (part) =>
        Object.keys(SequencerFileRangeFind.ftToDistanceMap).indexOf(part) > -1
    );
    if (!ft) {
      return super.getPreviewFile(entry);
    }
    const fileIndex = parts.slice(parts.indexOf(ft) + 1)?.[0];
    if (lib.is_real_number(Number(fileIndex))) {
      this.fileIndex = Number(fileIndex);
    }
    return this.getFile(ft);
  }

  _getMatchingDistance(inEntry) {
    return SequencerFileRangeFind.ftToDistanceMap[inEntry] / this._gridSizeDiff;
  }

  getFileForDistance(inDistance) {
    if (!this._fileDistanceMap) {
      let distances = Object.keys(this.file)
        .filter(
          (entry) =>
            Object.keys(SequencerFileRangeFind.ftToDistanceMap).indexOf(entry) >
            -1
        )
        .map((ft) => {
          return {
            file: this.getFile(ft),
            minDistance: this._getMatchingDistance(ft),
          };
        });

      let uniqueDistances = [
        ...new Set(distances.map((item) => item.minDistance)),
      ];
      uniqueDistances.sort((a, b) => a - b);

      let max = Math.max(...uniqueDistances);
      let min = Math.min(...uniqueDistances);

      this._fileDistanceMap = distances.map((entry) => {
        entry.distances = {
          min: entry.minDistance === min ? 0 : entry.minDistance,
          max:
            entry.minDistance === max
              ? Infinity
              : uniqueDistances[uniqueDistances.indexOf(entry.minDistance) + 1],
        };
        return entry;
      });
    }

    const possibleFiles = this._fileDistanceMap
      .filter((entry) => {
        const relativeDistance = inDistance / this._gridSizeDiff;
        return (
          relativeDistance >= entry.distances.min &&
          relativeDistance < entry.distances.max
        );
      })
      .map((entry) => entry.file)
      .flat();

    return possibleFiles.length > 1
      ? lib.random_array_element(possibleFiles, { twister: this.twister })
      : possibleFiles[0];
  }
}
