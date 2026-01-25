import * as lib from "../lib/lib.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";
import CrosshairsDocument from "../modules/sequencer-crosshair/CrosshairsDocument.js";
import * as canvaslib from "../lib/canvas-lib.js";

class SoundSection extends Section {
	constructor(inSequence, inFile = "") {
		super(inSequence);
		this._file = inFile;
		this._volume = 0.8;
		this._channel = "interface";
		this._overrides = [];
		this._locationOptions = {};
		this._toLocation = false;
		this._moveTowards = false;
		this._global = false;
	}

	get _target() {
		return this._toLocation || this._moveTowards || false;
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

	constrainedByWalls(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"constrainedByWalls",
				`inBool must be of type boolean`
			);
		this._locationOptions['walls'] = inBool;
		return this;
	}

	distanceEasing(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"distanceEasing",
				`inBool must be of type boolean`
			);
		this._locationOptions['easing'] = inBool;
		return this;
	}

	audioChannel(inString) {
		if (typeof inString !== "string")
			throw this.sequence._customError(
				this,
				"audioChannel",
				`inString must be of type string`
			);
		if (!(game.audio?.[inString] instanceof AudioContext)) {
			const validChannels = Object.entries(game.audio)
				.filter(e => e[1] instanceof AudioContext)
				.map(e => e[0]);
			throw this.sequence._customError(
				this,
				"audioChannel",
				`inString must be of type ${validChannels.slice(0, -1).join(", ")}, or ${validChannels.slice(-1)}`
			);
		}
		this._channel = inString;
		return this;
	}

	alwaysForGMs(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"alwaysForGMs",
				`inBool must be of type boolean`
			);
		this._locationOptions['gmAlways'] = inBool;
		return this;
	}

	visualize(inBool = true) {
		if (typeof inBool !== "boolean") {
			throw this.sequence._customError(
				this,
				"visualize",
				`inBool must be of type boolean`
			)
		}
		this._locationOptions['visualize'] = inBool;
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

	toLocation(inLocation, inOptions = {}) {
		if (!inLocation || !(typeof inLocation === "object" || typeof inLocation === "string")) {
			throw this.sequence._customError(
				this,
				"toLocation",
				`inLocation is invalid, and must be of type of object, string, placeable object, or document`
			);
		}
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"toLocation",
				`inOptions must be of type object`
			);
		inOptions = foundry.utils.mergeObject(
			{
				cacheLocation: false,
				offset: false,
				randomOffset: false,
				gridUnits: false,
				local: false,
			},
			inOptions
		);
		inLocation = this._validateLocation(inLocation);
		if (inLocation === undefined)
			throw this.sequence._customError(
				this,
				"toLocation",
				"could not find position of given object"
			);
		if (typeof inOptions.cacheLocation !== "boolean")
			throw this.sequence._customError(
				this,
				"toLocation",
				"inOptions.cacheLocation must be of type boolean"
			);
		if (
			!(
				typeof inOptions.randomOffset === "boolean" ||
				lib.is_real_number(inOptions.randomOffset)
			)
		)
			throw this.sequence._customError(
				this,
				"toLocation",
				"inOptions.randomOffset must be of type boolean or number"
			);

		if (inOptions.offset) {
			const offsetData = this._validateOffset(
				"toLocation",
				inOptions.offset,
				inOptions
			);
			this._offset = {
				source: this._offset?.source ?? false,
				target: offsetData,
			};
		}

		this._randomOffset = {
			source: this._randomOffset?.source ?? false,
			target: inOptions.randomOffset,
		};

		this._toLocation =
			inOptions.cacheLocation && typeof inLocation !== "string"
				? canvaslib.get_object_canvas_data(inLocation, { uuid: false })
				: inLocation;

		return this;
	}

	globalSound(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"globalSound",
				`inBool must be of type boolean`
			);
		this._global = inBool;
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
		Object.assign(this.constructor.prototype, traits.offset);
		Object.assign(this.constructor.prototype, traits.moves);
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
			) && !this.sequence.local && !this.sequence.remote;

		let duration = await SequencerSoundManager.play(playData, push);

		await new Promise((resolve) =>
			setTimeout(resolve, this._currentWaitTime + duration),
		);
	}

	_getSourceObject() {
		if (!this._source || typeof this._source !== "object") {
			return this._source;
		}
		if (this._source instanceof CrosshairsPlaceable || this._source instanceof CrosshairsDocument) {
			const doc = this._source?.document ?? this._source;
			return doc.getOrientation().source;
		}
		if (this._source?.cachedLocation) {
			return canvaslib.get_object_canvas_data(this._source, { uuid: true });
		}
		return (
			lib.get_object_identifier(this._source) ??
			canvaslib.get_object_canvas_data(this._source, { uuid: true })
		);
	}

	/**
	 * @private
	 */
	_getTargetObject() {
		let target = this._target.target ?? this._target;
		if (!target || typeof target !== "object") {
			return target;
		}
		if (target instanceof CrosshairsPlaceable || target instanceof CrosshairsDocument) {
			const doc = target?.document ?? target;
			return doc.getOrientation().source;
		}
		if (target?.cachedLocation) {
			return canvaslib.get_object_canvas_data(target, { uuid: true });
		}
		return (
			lib.get_object_identifier(target) ??
			canvaslib.get_object_canvas_data(target, { uuid: true })
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

		let data = {
			id: foundry.utils.randomID(),
			play: true,
			src: file.dbPath ?? file,
			forcedIndex,
			source: this._getSourceObject(),
			target: this._getTargetObject(),
			moveTowards: this._moveTowards
				? {
					ease: this._moveTowards.ease,
					rotate: this._moveTowards.rotate,
				}
				: false,
			offset: this._offset,
			randomOffset: this._randomOffset,
			locationOptions: this._locationOptions,
			volume: this._volume,
			channel: this._channel,
			global: this._global,
			fadeIn: this._fadeInAudio,
			fadeOut: this._fadeOutAudio,
			time:
				this._startTime || this._endTime
					? {
						start: lib.is_real_number(this._startTime)
							? {
								value: this._startTime,
								isPerc: this._startPerc,
							}
							: false,
						end: lib.is_real_number(this._endTime)
							? {
								value: this._endTime,
								isPerc: this._endPerc,
							}
							: false,
						isRange: this._isRange,
					}
					: false,
			duration: this._duration,
			sceneId: this._source?.parent?.id || game.user.viewedScene,
			users: this._users ? Array.from(this._users) : null,
			name: this._name,
			origin: this._origin,
			seed: `${this._name ?? "sequencer-sound"}-${foundry.utils.randomID()}-${this._currentRepetition}`,
			nameOffsetMap: this.sequence.nameOffsetMap,
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
