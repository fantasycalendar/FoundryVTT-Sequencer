import * as lib from "../lib.js";
import Section from "./base.js";

export default class SoundSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence);
        this.file(inFile);
        this._volume = 0.8;
        this._databaseEntry = false;
    }

    /**
     * Declares which sound to be played This may also be an array of paths, which will be randomly picked from each
     * time the sound is played.
     *
     * @param {string|array} inFile
     * @returns {SoundSection} this
     */
    file(inFile) {
        this._file = inFile;
        if(inFile) {
            this._databaseEntry = window.SequencerDatabase.entryExists(inFile.split('.')?.[0] ?? "");
        }
        return this;
    }

    async _run(repetition){
        let data = await this._sanitizeSoundData();
        if(!data.play) {
            this.sequence.throwError(this, "Play", `File not found: ${data.src}`);
            return new Promise((reject) => reject());
        }

        // To remove in 0.5.3
        let fadeIn = this._fadeIn || this._fadeInAudio;
        let fadeOut = this._fadeOut || this._fadeOutAudio;

        this.sequence.log(`Playing sound:`, data);

        let howler = await AudioHelper.play(data, true);

        if(fadeIn) {
            if(this.version) {
                howler.fade(data.targetVolume, { duration: fadeIn.duration, from: 0.0 })
            }else{
                howler.fade(0.0, data.targetVolume, fadeIn.duration)
            }
        }

        if(fadeOut) {
            setTimeout(function () {
                if(howler.playing) {
                    if(this.version) {
                        howler.fade(0.0, { duration: fadeOut.duration, from: data.targetVolume })
                    }else{
                        howler.fade(data.targetVolume, 0.0, fadeOut.duration)
                    }
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

    fadeIn(inVolume, options){
        super.fadeIn(inVolume, options);
        this.sequence.throwWarning(this, "fadeIn", "fadeIn has been marked as deprecated in 0.5.3, please use fadeInAudio!")
        return this;
    }

    fadeOut(inVolume, options){
        super.fadeIn(inVolume, options);
        this.sequence.throwWarning(this, "fadeOut", "fadeOut has been marked as deprecated in 0.5.3, please use fadeOutAudio!")
        return this;
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
        if(this._databaseEntry) {
            file = window.SequencerDatabase.get(file) || file;
        }
        if(Array.isArray(file)) {
            file = lib.random_array_element(file)
        }
        if(this._mustache) {
            let template = Handlebars.compile(file);
            file = template(this._mustache);
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
            volume: (this._fadeIn || this._fadeInAudio) ? 0 : this._volume,
            autoplay: true,
            loop: this._duration > duration,
            duration: this._duration ? this._duration : duration
        };
    }
}