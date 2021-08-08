import * as lib from "../lib.js";
import SequencerAudioHelper from "../sequencer-audio-helper.js";
import Section from "./section.js";

// Traits
import files from "./traits/files.js";
import audio from "./traits/audio.js";

class SoundSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence);
        this._file = inFile;
        this._volume = 0.8;
		this._overrides = [];
    }

	/**
	 * Adds a function that will run at the end of the sound serialization step, but before it is played. Allows direct
	 * modifications of sound's data. For example, it could be manipulated to change which file will be used based
	 * on the distance to the target.
	 *
	 * @param {function} inFunc
	 * @returns {SoundSection} this
	 */
	addOverride(inFunc) {
		if(!lib.is_function(inFunc)) this.sequence._throwError(this, "addOverride", "The given function needs to be an actual function.");
		this._overrides.push(inFunc);
		return this;
	}

    async _run(repetition){
        let {play, ...data} = await this._sanitizeSoundData();

        if(!play) {
            this.sequence._throwError(this, "Play", `File not found: ${data.src}`);
            return new Promise((reject) => reject());
        }

        this.sequence._log(`Playing sound:`, data);

        return SequencerAudioHelper.play(data, true);
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

        let file = this._determineFile(this._file)

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
            fadeIn: this._fadeInAudio,
            fadeOut: this._fadeOutAudio,
            duration: this._duration || duration
        };
    }
}

// Apply traits
Object.assign(SoundSection, files);
Object.assign(SoundSection, audio);

export default SoundSection;