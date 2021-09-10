import * as lib from "../lib/lib.js";
import SequencerAudioHelper from "../sequencer-audio-helper.js";
import Section from "./section.js";

// Traits
import files from "./traits/files.js";
import audio from "./traits/audio.js";
import time from "./traits/time.js";
import users from "./traits/users.js";

class SoundSection extends Section {

    constructor(inSequence, inFile = "") {
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
        if (!lib.is_function(inFunc)) throw this.sequence._throwError(this, "addOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    _applyTraits() {
        Object.assign(this.constructor.prototype, files);
        Object.assign(this.constructor.prototype, audio);
        Object.assign(this.constructor.prototype, time);
        Object.assign(this.constructor.prototype, users);
    }

    async _run(repetition) {
        let { play, ...data } = await this._sanitizeSoundData();

        if (!play) {
            throw this.sequence._throwError(this, "Play", `File not found: ${data.src}`);
            return new Promise((reject) => reject());
        }

        let push = !(data.users.length === 1 && data.users.includes(game.userId));
        return SequencerAudioHelper.play(data, push);
    }

    async _getSoundDuration(inFilePath) {
        let cachedDuration = this.sequence._getFileFromCache(inFilePath);
        if (!cachedDuration) {
            cachedDuration = await lib.getSoundDuration(inFilePath);
            if (!cachedDuration) return false;
            this.sequence._addFileToCache(inFilePath, cachedDuration)
        }
        return cachedDuration;
    }

    async _sanitizeSoundData() {

        let file = this._determineFile(this._file)

        if (file instanceof lib.SequencerFile) {
            if (file.timeRange) {
                [this._startTime, this._endTime] = file.timeRange;
                this._isRange = true;
            }
            file = file.getFile();
        }

        let duration = await this._getSoundDuration(file);
        if (!duration) {
            return {
                play: false,
                src: file
            };
        }

        let startTime = (this._startTime ? (!this._startPerc ? this._startTime : this._startTime * duration) : 0) / 1000;

        if (this._endTime) {
            duration = !this._endPerc
                ? this._isRange ? this._endTime - this._startTime : duration - this._endTime
                : this._endTime * duration;
        }

        duration += this._waitUntilFinishedDelay;

        return {
            play: true,
            src: file,
            loop: this._duration > duration,
            volume: this._volume,
            fadeIn: this._fadeInAudio,
            fadeOut: this._fadeOutAudio,
            startTime: startTime,
            duration: this._duration || duration,
            sceneId: game.user.viewedScene,
            users: Array.from(this._users)
        };
    }
}

export default SoundSection;