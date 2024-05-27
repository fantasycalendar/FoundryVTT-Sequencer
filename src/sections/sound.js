import * as lib from "../lib/lib.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import { SequencerFileBase } from "../modules/sequencer-file.js";

class SoundSection extends Section {
  constructor(inSequence, inFile = "") {
    super(inSequence);
    this._file = inFile;
    this._volume = 0.8;
	  this._persist = false;
    this._overrides = [];
  }

  static niceName = "Sound";

  /**
   * Adds a function that will run at the end of the sound serialization step, but before it is played. Allows direct
   * modifications of sound's data.
   *
   * @param {function} inFunc
   * @returns {SoundSection}
   */
  addOverride(inFunc) {
    if (!lib.is_function(inFunc))
      throw this.sequence._customError(
        this,
        "addOverride",
        "The given function needs to be an actual function."
      );
    this._overrides.push(inFunc);
    return this;
  }

	/**
	 * Causes the sound to persist indefinitely on the canvas until _ended via SequencerSoundManager.endAllSounds() or
	 * name the sound with .name() and then end it through SequencerSoundManager.endSound()
	 *
	 * @param {Boolean} [inBool=true] inBool
	 * @param {Object} [inOptions={}] inOptions
	 * @returns {SoundSection}
	 */
	persist(inBool = true, inOptions = {}) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"persist",
				"inBool must be of type boolean"
			);
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"persist",
				`inOptions must be of type object`
			);
		inOptions = foundry.utils.mergeObject(
			{
				id: randomID()
			},
			inOptions
		);
		this._persist = inBool;
		this._persistOptions = inOptions;
		return this;
	}

  /**
   * @private
   */
  _applyTraits() {
    Object.assign(this.constructor.prototype, traits.files);
    Object.assign(this.constructor.prototype, traits.audio);
    Object.assign(this.constructor.prototype, traits.time);
    Object.assign(this.constructor.prototype, traits.users);
    Object.assign(this.constructor.prototype, traits.name);
  }

  /**
   * @OVERRIDE
   * @returns {Promise}
   */
  async run() {
    const playData = await this._sanitizeSoundData();

    if (!playData.play && this.sequence.softFail) {
      return new Promise((reject) => {
        reject();
      });
    }

    if (!playData?.play) {
      this.sequence._customError(
        this,
        "Play",
        `File not found: ${playData.src}`
      );
      return new Promise((reject) => reject());
    }

    if (Hooks.call("preCreateSequencerSound", playData) === false) return;

    let push =
      !(
        playData?.users?.length === 1 && playData?.users?.includes(game.userId)
      ) && !this.sequence.localOnly;

    SequencerSoundManager.play(playData, push);

    await new Promise((resolve) =>
      setTimeout(resolve, this._currentWaitTime + playData.duration)
    );
  }

  /**
   * @returns {Promise}
   * @private
   */
  async _sanitizeSoundData() {
    if (this._deserializedData) {
      return this._deserializedData;
    }

    if (!this._file) {
      return {
        play: false,
        src: false,
      };
    }

    let { file, forcedIndex } = await this._determineFile(this._file);

    if (!file) {
      return {
        play: false,
        src: false,
      };
    }

    if (file instanceof SequencerFileBase) {
      file.forcedIndex = forcedIndex;
      if (file.timeRange) {
        [this._startTime, this._endTime] = file.timeRange;
        this._isRange = true;
      }
      file = file.getFile();
    }

    let soundFile = await AudioHelper.preloadSound(file);
    if (!soundFile || soundFile.failed) {
      return {
        play: false,
        src: this._file,
      };
    }
    let duration = soundFile.duration * 1000;

    let startTime =
      (this._startTime
        ? !this._startPerc
          ? this._startTime
          : this._startTime * duration
        : 0) / 1000;

    if (this._endTime) {
      duration = !this._endPerc
        ? Number(
            this._isRange
              ? this._endTime - this._startTime
              : duration - this._endTime
          )
        : this._endTime * duration;
    }

    let data = {
      id: randomID(),
      play: true,
      src: file,
      loop: this._duration > duration || this._persist,
      volume: this._volume,
      fadeIn: this._fadeInAudio,
      fadeOut: this._fadeOutAudio,
      startTime: startTime,
      duration: this._duration || duration,
      sceneId: game.user.viewedScene,
      users: this._users ? Array.from(this._users) : null,
      name: this._name,
      origin: this._origin
    };

    for (let override of this._overrides) {
      data = await override(this, data);
    }

    if (typeof data.src !== "string" || data.src === "") {
      throw this.sequence._customError(
        this,
        "file",
        "a sound must have a src of type string!"
      );
    }

    return data;
  }

  async _serialize() {
    const data = await super._serialize();
    const sectionData = await this._sanitizeSoundData();
    return {
      ...data,
      type: "sound",
      sectionData,
    };
  }

  async _deserialize(data) {
    this._deserializedData = data.sectionData;
    return super._deserialize(data);
  }
}

export default SoundSection;
