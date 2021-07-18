import * as lib from "../lib.js";
import SequencerAudioHelper from "../sequencer-audio-helper.js";
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
        this._file = inFile;
        return this;
    }

    async _run(repetition){
        let {play, ...data} = await this._sanitizeSoundData();
        if(!play) {
            this.sequence.throwError(this, "Play", `File not found: ${data.src}`);
            return new Promise((reject) => reject());
        }

        this.sequence.log(`Playing sound:`, data);

        return SequencerAudioHelper.play(data, true);
    }

    fadeIn(inVolume, options){
        super.fadeIn(inVolume, options);
        this.sequence.throwWarning(this, "fadeIn", "fadeIn has been marked as deprecated in a future version, please use fadeInAudio!")
        return this;
    }

    fadeOut(inVolume, options){
        super.fadeIn(inVolume, options);
        this.sequence.throwWarning(this, "fadeOut", "fadeOut has been marked as deprecated in a future version, please use fadeOutAudio!")
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
        if(Array.isArray(file)) file = lib.random_array_element(file)

        let databaseEntry = window.SequencerDatabase.entryExists(file.split('.')?.[0] ?? "");
        if(databaseEntry) {
            file = window.SequencerDatabase.get(file) || file;
            if(Array.isArray(file)) file = lib.random_array_element(file);
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
            src: file,
            loop: this._duration > duration,
            volume: this._volume,
            fadeIn: this._fadeIn /* To remove in 0.5.3 */ || this._fadeInAudio || undefined,
            fadeOut: this._fadeOut /* To remove in 0.5.3 */ || this._fadeOutAudio || undefined,
            duration: this._duration ?? duration
        };
    }
}