import * as lib from "../lib/lib.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import { SequencerFileBase } from "../modules/sequencer-file.js";
import CONSTANTS from "../constants.js";

class SoundSection extends Section {
	constructor(inSequence, inFile = "") {
		super(inSequence);
		this._file = inFile;
		this._volume = 0.8;
		this._channel = "interface";
		this._overrides = [];
		this._locationOptions = {};
	}

	static niceName = "Sound";

	/**
	 * Declares which file to be played. This may also be an array of paths, which will be randomly picked from each
	 * time the section is played.
	 *
	 * @param {string|array} inFile
	 * @returns this
	 */
	file(inFile) {
		this._file = inFile;
		return this;
	}

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
				"The given function needs to be an actual function.",
			);
		this._overrides.push(inFunc);
		return this;
	}

	radius(inNumber) {
		if (!lib.is_real_number(inNumber))
			throw this.sequence._customError(
				this,
				"radius",
				"inNumber must be of type number"
			);
		this._locationOptions['radius'] = inNumber;
		return this;
	}

	constrainedByWalls(inBool) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"constrainedByWalls",
				`inBool must be of type boolean`
			);
		this._locationOptions['walls'] = inBool;
		return this;
	}

	distanceEasing(inBool) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"distanceEasing",
				`inBool must be of type boolean`
			);
		this._locationOptions['easing'] = inBool;
		return this;
	}

	setAudioChannel(inString) {
		if (typeof inString !== "string")
			throw this.sequence._customError(
				this,
				"setAudioChannel",
				`inString must be of type string`
			);
		this._channel = inString;
		return this;
	}

	alwaysForGMs(inBool) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"alwaysForGMs",
				`inBool must be of type boolean`
			);
		this._locationOptions['gmAlways'] = inBool;
		return this;
	}

	baseEffect(options = {}) {
		options = foundry.utils.mergeObject({
			type: "",
			intensity: 0
		}, options);
		if (typeof options.type !== "string" || !CONFIG.soundEffects[options.type])
			throw this.sequence._customError(
				this,
				"baseEffect",
				`options.type must be of type string, and one of ${Object.keys(CONFIG.soundEffects).join(", ")}`
			);
		if (!lib.is_real_number(options.intensity))
			throw this.sequence._customError(
				this,
				"baseEffect",
				"options.intensity must be of type number"
			);
		this._locationOptions['baseEffect'] = {
			type: options.type,
			intensity: options.intensity
		};
		return this;
	}

	muffledEffect(options = {}) {
		options = foundry.utils.mergeObject({
			type: "",
			intensity: 0
		}, options);
		if (typeof options.type !== "string" || !CONFIG.soundEffects[options.type])
			throw this.sequence._customError(
				this,
				"baseEffect",
				`options.type must be of type string, and one of ${Object.keys(CONFIG.soundEffects).join(", ")}`
			);
		if (!lib.is_real_number(options.intensity))
			throw this.sequence._customError(
				this,
				"baseEffect",
				"options.intensity must be of type number"
			);
		this._locationOptions['muffledEffect'] = {
			type: options.type,
			intensity: options.intensity
		};
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
		Object.assign(this.constructor.prototype, traits.location);
	}

	/**
	 * @OVERRIDE
	 * @returns {Promise}
	 */
	async run() {
		const playData = await this._sanitizeSoundData();

		if (typeof playData.src !== "string" || playData.src === "") {
			if (this.sequence.softFail) {
				playData.play = false;
			} else {
				throw this.sequence._customError(
					this,
					"file",
					"a sound must have a src of type string!",
				);
			}
		}

		if (playData.location && !CONSTANTS.IS_V12) {
			if (this.sequence.softFail) {
				playData.play = false;
			} else {
				throw this.sequence._customError(
					this,
					"atLocation",
					"a sound cannot have a location in v11",
				);
			}
		}

		if (!playData.play && this.sequence.softFail) {
			return new Promise((reject) => {
				reject();
			});
		}

		if (!playData?.play) {
			this.sequence._customError(
				this,
				"Play",
				`File not found: ${playData.src}`,
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
			setTimeout(resolve, this._currentWaitTime + playData.duration),
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

		let soundFile = await SequencerSoundManager.AudioHelper.preloadSound(file);
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
						: duration - this._endTime,
				)
				: this._endTime * duration;
		}

		let data = {
			id: foundry.utils.randomID(),
			play: true,
			src: file,
			location: this._source?.uuid
				|| (this._source?.x && this._source?.y
					? { x: this._source?.x, y: this._source?.y }
					: null),
			offset: this._offset,
			randomOffset: this._randomOffset,
			locationOptions: this._locationOptions,
			loop: this._duration > duration,
			volume: this._volume,
			fadeIn: this._fadeInAudio,
			fadeOut: this._fadeOutAudio,
			startTime: startTime,
			duration: this._duration || duration,
			sceneId: this._source?.parent?.id || game.user.viewedScene,
			users: this._users ? Array.from(this._users) : null,
			name: this._name,
			origin: this._origin,
			seed: `${this._name}-${foundry.utils.randomID()}-${this._currentRepetition}`
		};

		for (let override of this._overrides) {
			data = await override(this, data);
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
