import * as lib from "./lib/lib.js";
import SequencerFileCache from "./sequencer-file-cache.js";

export class SequencerFile {

    constructor(inData, inTemplate, inDBPath) {
        inData = foundry.utils.duplicate(inData);
        this.originalData = inData;
        this.template = inTemplate;
        this.dbPath = inDBPath;
        this.moduleName = inDBPath.split('.')[0];
        this.timeRange = inData?._timeRange;
        this.originalFile = inData?.file ?? inData;
        delete this.originalFile["_template"];
        delete this.originalFile["_timeRange"];
        this.file = foundry.utils.duplicate(this.originalFile);
        this.fileIndex = false;
        this.isRangeFind =
            typeof this.file !== "string" && !Array.isArray(this.originalFile)
                ? Object.keys(this.originalFile).filter((key) =>
                key.endsWith("ft")
            ).length > 0
                : false;

        this.fileTextureMap = Object.fromEntries(this.getAllFiles().map(file => {
            return [file, false];
        }))

        this.fileDistanceMap = false;
        this.twister = false;
    }

    copy() {
        return new SequencerFile(this.originalData, this.template, this.dbPath);
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
                directories[directory] = await getFiles(directory);
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
        if (this.isRangeFind) {
            return Object.values(this.file).deepFlatten();
        }
        return [this.file].deepFlatten();
    }

    getFile(inFt) {

        if (this.hasRangeFind(inFt)) {
            if (Array.isArray(this.file[inFt])) {
                return lib.is_real_number(this.fileIndex)
                    ? this.file[inFt][this.fileIndex]
                    : lib.random_array_element(this.file[inFt], { twister: this.twister });
            }
            return this.file[inFt];
        } else if (Array.isArray(this.file)) {
            return lib.is_real_number(this.fileIndex)
                ? this.file[this.fileIndex]
                : lib.random_array_element(this.file, { twister: this.twister });
        }

        return this.file;
    }

    hasRangeFind(inFt) {
        return inFt && this.isRangeFind && this.file[inFt];
    }

    static get ftToDistanceMap(){
        return {
            "90ft": canvas.grid.size * 15,
            "60ft": canvas.grid.size * 9,
            "30ft": canvas.grid.size * 5,
            "15ft": canvas.grid.size * 2,
            "05ft": 0
        }
    }

    get _gridSizeDiff(){
        return canvas.grid.size / this.template[0];
    }

    _getMatchingDistance(inEntry) {
        return SequencerFile.ftToDistanceMap[inEntry] / this._gridSizeDiff;
    }

    _rangeFind(inDistance) {

        if(!this.fileDistanceMap){
            let distances = Object.keys(this.file)
                .filter(entry => Object.keys(SequencerFile.ftToDistanceMap).indexOf(entry) > -1)
                .map(entry => {
                    return {
                        file: this.getFile(entry),
                        minDistance: this._getMatchingDistance(entry)
                    }
                });

            let uniqueDistances = [...new Set(distances.map(item => item.minDistance))];
            uniqueDistances.sort((a, b) => a - b);

            let max = Math.max(...uniqueDistances);
            let min = Math.min(...uniqueDistances);

            this.fileDistanceMap = distances
                .map(entry => {
                    entry.distances = {
                        min: entry.minDistance === min ? 0 : entry.minDistance,
                        max: entry.minDistance === max ? Infinity : uniqueDistances[uniqueDistances.indexOf(entry.minDistance) + 1]
                    };
                    return entry;
                })
        }

        const possibleFiles = this.fileDistanceMap
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

    destroy(){
        for(let texture of Object.values(this.fileTextureMap)){
            if(!texture) continue;
            try{
                texture.baseTexture.resource.source.removeAttribute('src');
                texture.baseTexture.resource.source.pause();
                texture.baseTexture.resource.source.load();
            }catch(err){ }
            texture.destroy();
        }
    }

    async _getTexture(file){
        if(this.fileTextureMap[file]) return this.fileTextureMap[file];
        this.fileTextureMap[file] = await SequencerFileCache.loadFile(file);
        return this.fileTextureMap[file];
    }

    async _getTextureForDistance(distance) {
        const file = this._rangeFind(distance);
        return await this._getTexture(file);
    }

    _adjustScaleForPadding(distance, width) {
        return distance / (width - (this.template ? this.template[1] + this.template[2] : 0));
    }

    _adjustAnchorForPadding(width){
        return this.template ? this.template[1] / width : undefined
    }

    async getTexture(distance){

        const texture = this.isRangeFind
            ? (await this._getTextureForDistance(distance))
            : (await this._getTexture(this.getFile()))

        return {
            texture,
            spriteScale: this._adjustScaleForPadding(distance, texture.width),
            spriteAnchor: this._adjustAnchorForPadding(texture.width)
        };
    }

}