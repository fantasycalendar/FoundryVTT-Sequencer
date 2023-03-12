import * as lib from "../lib/lib.js";
import SequencerFileCache from "./sequencer-file-cache.js";

export class SequencerFile {

  constructor(inData, inDBPath, inMetadata) {
    inData = foundry.utils.duplicate(inData);
    inMetadata = foundry.utils.duplicate(inMetadata);
    this.originalData = inData;
    this.originalMetadata = inMetadata;
    for (let [key, value] of Object.entries(inMetadata)) {
      this[key] = value;
    }
    this.dbPath = inDBPath;
    this.moduleName = inDBPath.split('.')[0];
    this.originalFile = inData?.file ?? inData;
    this.file = foundry.utils.duplicate(this.originalFile);
    this.fileIndex = false;

    this.fileTextureMap = Object.fromEntries(this.getAllFiles().map(file => {
      return [file, false];
    }))

    this.twister = false;
  }

  static make(inData, inDBPath, inMetadata) {

    const originalFile = inData?.file ?? inData;
    const file = foundry.utils.duplicate(originalFile);
    const isRangeFind = typeof file !== "string" && !Array.isArray(originalFile)
      ? Object.keys(originalFile).filter(key => key.endsWith("ft")).length > 0
      : false;

    return isRangeFind
      ? new SequencerFileRangeFind(inData, inDBPath, inMetadata)
      : new SequencerFile(inData, inDBPath, inMetadata)
  }

  clone() {
    return SequencerFile.make(this.originalData, this.dbPath, this.originalMetadata);
  }

  async validate() {
    let isValid = true;
    const directories = {};
    const allFiles = this.getAllFiles();
    for (const file of allFiles) {
      let directory = file.split("/")
      directory.pop()
      directory = directory.join('/')
      if (directories[directory] === undefined) {
        directories[directory] = await lib.getFiles(directory);
      }
    }
    for (const file of allFiles) {
      let directory = file.split("/")
      directory.pop()
      directory = directory.join('/')

      if (directories[directory].indexOf(file) === -1) {
        console.warn(`"${this.dbPath}" has an incorrect file path, could not find file. Points to:\n${file}`)
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
      return lib.is_real_number(this.fileIndex)
        ? this.file[this.fileIndex]
        : lib.random_array_element(this.file, { twister: this.twister });
    }

    return this.file;
  }

  getPreviewFile(entry) {
    let parts = entry.split('.');
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

  destroy() {
    for (let texture of Object.values(this.fileTextureMap)) {
      if (!texture) continue;
      try {
        texture?.baseTexture?.resource?.source?.removeAttribute('src');
      } catch (err) {
      }
      try {
        texture?.baseTexture?.resource?.source?.pause();
      } catch (err) {
      }
      try {
        texture?.baseTexture?.resource?.source?.remove();
      } catch (err) {
      }
      try {
        texture?.baseTexture?.resource?.source?.load();
      } catch (err) {
      }
      texture.destroy();
    }
  }

  async _getTexture(file) {
    if (this.fileTextureMap[file]) return this.fileTextureMap[file];
    this.fileTextureMap[file] = await SequencerFileCache.loadFile(file);
    return this.fileTextureMap[file];
  }

  _adjustScaleForPadding(distance, width) {
    return distance / (width - (this.template ? this.template[1] + this.template[2] : 0));
  }

  _adjustAnchorForPadding(width) {
    return this.template ? this.template[1] / width : undefined
  }

  async getTexture(distance) {
    const filePath = this.getFile();
    const texture = await this._getTexture(this.getFile());
    return {
      filePath,
      texture,
      spriteScale: this._adjustScaleForPadding(distance, texture.width),
      spriteAnchor: this._adjustAnchorForPadding(texture.width)
    };
  }
}

export class SequencerFileRangeFind extends SequencerFile {

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
      "05ft": 0
    }
  }

  get _gridSizeDiff() {
    return canvas.grid.size / this.template[0];
  }

  getAllFiles() {
    return Object.values(this.file).deepFlatten();
  }

  getFile(inFt) {

    if (inFt && this.file[inFt]) {
      if (Array.isArray(this.file[inFt])) {
        return lib.is_real_number(this.fileIndex)
          ? this.file[inFt][this.fileIndex]
          : lib.random_array_element(this.file[inFt], { twister: this.twister });
      }
      return this.file[inFt];
    }

    return this.file;
  }

  getPreviewFile(entry) {
    let parts = entry.split('.');
    const ft = parts.find(part => Object.keys(SequencerFileRangeFind.ftToDistanceMap).indexOf(part) > -1)
    if (!ft) {
      return super.getPreviewFile(entry);
    }
    const fileIndex = parts.slice(parts.indexOf(ft) + 1)?.[0];
    if (lib.is_real_number(Number(fileIndex))) {
      this.fileIndex = Number(fileIndex);
    }
    return this.getFile(ft);
  }

  async getTexture(distance) {
    const { filePath, texture } = await this._getTextureForDistance(distance);
    return {
      filePath,
      texture,
      spriteScale: this._adjustScaleForPadding(distance, texture.width),
      spriteAnchor: this._adjustAnchorForPadding(texture.width)
    };
  }

  _getMatchingDistance(inEntry) {
    return SequencerFileRangeFind.ftToDistanceMap[inEntry] / this._gridSizeDiff;
  }

  _rangeFind(inDistance) {

    if (!this._fileDistanceMap) {
      let distances = Object.keys(this.file)
        .filter(entry => Object.keys(SequencerFileRangeFind.ftToDistanceMap).indexOf(entry) > -1)
        .map(ft => {
          return {
            file: this.getFile(ft),
            minDistance: this._getMatchingDistance(ft)
          }
        });

      let uniqueDistances = [...new Set(distances.map(item => item.minDistance))];
      uniqueDistances.sort((a, b) => a - b);

      let max = Math.max(...uniqueDistances);
      let min = Math.min(...uniqueDistances);

      this._fileDistanceMap = distances
        .map(entry => {
          entry.distances = {
            min: entry.minDistance === min ? 0 : entry.minDistance,
            max: entry.minDistance === max ? Infinity : uniqueDistances[uniqueDistances.indexOf(entry.minDistance) + 1]
          };
          return entry;
        })
    }

    const possibleFiles = this._fileDistanceMap
      .filter(entry => {
        const relativeDistance = inDistance / this._gridSizeDiff;
        return relativeDistance >= entry.distances.min && relativeDistance < entry.distances.max;
      })
      .map(entry => entry.file)
      .flat();

    return possibleFiles.length > 1
      ? lib.random_array_element(possibleFiles, { twister: this.twister })
      : possibleFiles[0];
  }

  async _getTextureForDistance(distance) {
    const filePath = this._rangeFind(distance);
    const texture = await this._getTexture(filePath);
    return { filePath, texture }
  }
}

export class SequencerFileProxy {
  constructor(dbPath, entry) {
    return new Proxy({}, {
      entry: false,
      get(target, prop) {
        // If the entry hasn't been resolved yet, return it and set it
        if(!this.entry){
          this.entry = Sequencer.Database.getEntry(entry);
        }
        // Return the proxy path in any other case
        if(prop === "dbPath") return dbPath;
        // If the path results in an array, grab a random element every time
        if(Array.isArray(this.entry)){
          return Reflect.get(lib.random_array_element(this.entry), prop);
        }
        return Reflect.get(this.entry, prop);
      }
    })
  }
}
