import * as lib from "../lib.js";
import Section from "./base.js";

export default class SoundSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._volume = 0.8;
    }

    _sanitizeSound() {
        let file = this._file;
        if(Array.isArray(this._file)) {
            file = lib.random_array_element(this._file)
        }
        return {
            src: [file],
            volume: this._volume ?? 0.8,
            autoplay: true,
            loop: false
        };
    }

    file(inFile) {
        if(!(typeof inFile === "string" || Array.isArray(inFile))) throw new Error("inFile must be of type string or array");
        this._file = inFile;
        return this;
    }

    volume(inVolume) {
        if(typeof inVolume !== "number") throw new Error("inVolume must be of type number");
        this._volume = Math.max(0, Math.min(1.0, inVolume));
        return this;
    }

    async _getSoundDuration(inFilePath){
        let cachedDuration = this.sequence._getFileFromCache(inFilePath);
        if(!cachedDuration) {
            cachedDuration = await lib.getSoundDuration(inFilePath);
            this.sequence._addFileToCache(inFilePath, cachedDuration)
        }
        return cachedDuration;
    }

    async run(){
        let data = this._sanitizeSound();
        let duration = await this._getSoundDuration(data.src[0]);
        return new Promise(async (resolve) => {
            AudioHelper.play(data, true);
            setTimeout(resolve, duration);
        });
    }
}