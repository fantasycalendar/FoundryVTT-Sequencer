import * as lib from "../lib.js";
import Section from "./base.js";

export default class SoundSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence);
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
            this.sequence.throwError(this, "file", "inFile must be of type string or array");
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
        if(typeof inVolume !== "number") this.sequence.throwError(this, "volume", "inVolume must be of type number");
        this._volume = Math.max(0, Math.min(1.0, inVolume));
        return this;
    }

    async _run(repetition){
        let data = await this._sanitizeSoundData();
        if(!data.play) {
            this.sequence.throwError(this, "Play", `File not found: ${data.src}`);
            return new Promise((reject) => reject());
        }

        this.sequence.log(`Playing sound:`, data);

        let howler = await AudioHelper.play(data, true);

        if(this._fadeIn) {
            howler.fade(data.targetVolume, this._fadeIn.duration, 0.0)
        }

        if(this._fadeOut) {
            let fadeOut = this._fadeOut;
            setTimeout(function () {
                if(howler.playing) {
                    howler.fade(0, fadeOut.duration, data.targetVolume)
                }
            }, Math.max(data.duration - fadeOut.duration, 0));
        }

        return new Promise(async (resolve) => {
            setTimeout(function(){
                howler.stop()
                resolve();
            }, data.duration);
        });
    }

    async _getSoundDuration(inFilePath){
        let cachedDuration = this.sequence._getFileFromCache(inFilePath);
        if(!cachedDuration) {
            cachedDuration = await lib.getSoundDuration(inFilePath);
            if(!cachedDuration) return false;
            this.sequence._addFileToCache(inFilePath, cachedDuration)
        }
        return cachedDuration;
    }

    async _sanitizeSoundData() {
        let file = this._file;
        if(Array.isArray(this._file)) {
            file = lib.random_array_element(this._file)
        }
        let duration = await this._getSoundDuration(file);
        if(!duration){
            return {
                play: false,
                src: file
            };
        }
        duration += this._waitUntilFinishedDelay;
        return {
            play: true,
            src: [file],
            targetVolume: this._volume,
            volume: this._fadeIn ? 0 : this._volume,
            autoplay: true,
            loop: this._duration > duration,
            duration: this._duration ? this._duration : duration
        };
    }
}