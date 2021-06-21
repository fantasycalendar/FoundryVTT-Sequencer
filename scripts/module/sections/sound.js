import * as lib from "../lib.js";
import Section from "./base.js";

export default class SoundSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._volume = 0.8;
    }

    /**
     * Declares which sound to be played This may also be an array of paths, which will be randomly picked from each
     * time the sound is played.
     *
     * @param {string|array} inFile
     * @returns {SoundSection} this
     */
    file(inFile) {
        if(!(typeof inFile === "string" || Array.isArray(inFile))){
            this.throwError("file", "inFile must be of type string or array");
        }
        this._file = inFile;
        return this;
    }

    /**
     * Sets the volume of the sound.
     *
     * @param {number} inVolume
     * @returns {SoundSection} this
     */
    volume(inVolume) {
        if(typeof inVolume !== "number") this.throwError("volume", "inVolume must be of type number");
        this._volume = Math.max(0, Math.min(1.0, inVolume));
        return this;
    }

    async _run(repetition){
        let data = this._sanitizeSoundData();
        let duration = await this._getSoundDuration(data.src[0]);
        return new Promise(async (resolve) => {
            AudioHelper.play(data, true);
            setTimeout(resolve, duration);
        });
    }

    async _getSoundDuration(inFilePath){
        let cachedDuration = this.sequence._getFileFromCache(inFilePath);
        if(!cachedDuration) {
            cachedDuration = await lib.getSoundDuration(inFilePath);
            this.sequence._addFileToCache(inFilePath, cachedDuration)
        }
        return cachedDuration;
    }

    _sanitizeSoundData() {
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
}