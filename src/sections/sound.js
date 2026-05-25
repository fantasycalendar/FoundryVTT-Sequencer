import * as lib from "../lib/lib.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";
import CrosshairsDocument from "../modules/sequencer-crosshair/CrosshairsDocument.js";
import * as canvaslib from "../lib/canvas-lib.js";
import flagManager from "../utils/flag-manager.js";

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
		this._persist = false;
		this._persistOptions = false;
		this._loopOptions = false;
		this._panSound = false;
		this._extraEndDuration = false;
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

	/**
	 * Sets the radius (in scene units) within which the sound is audible. Requires `.atLocation()` to be set,
	 * otherwise the sound remains global.
	 *
	 * @param {number} inNumber
	 * @returns {SoundSection}
	 */
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

	/**
	 * Whether the sound is completely blocked by walls. Requires `.atLocation()` to be set. If `true`, the
	 * `.muffledEffect()` will have no effect.
	 *
	 * @param {boolean} [inBool=true]
	 * @returns {SoundSection}
	 */
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

	/**
	 * Whether the sound's volume is eased by the distance from its origin. Requires `.atLocation()` to be set.
	 *
	 * @param {boolean} [inBool=true]
	 * @returns {SoundSection}
	 */
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

	/**
	 * Sets the audio channel the sound is played through. Accepts any channel name available on `game.audio` that
	 * is an `AudioContext` (eg. `"music"`, `"environment"`, `"interface"`).
	 *
	 * @param {string} inString
	 * @returns {SoundSection}
	 */
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

	/**
	 * Whether GMs always hear the sound as if standing at its origin, regardless of token position. Requires
	 * `.atLocation()` to be set.
	 *
	 * @param {boolean} [inBool=true]
	 * @returns {SoundSection}
	 */
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

	/**
	 * Allows you to control the number of loops and the delays between each loop.
	 *
	 * @param {object} [inOptions]
	 * @param {number} [inOptions.loopDelay=0] - delay (in ms) between each loop
	 * @param {number} [inOptions.loops=0] - number of loops before ending, 0 for indefinite
	 * @param {boolean} [inOptions.endOnLastLoop=false] - whether the sound should end when reaching the last loop
	 * @returns {SoundSection}
	 */
	loopOptions(inOptions={}){
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"loopOptions",
				`inOptions must be of type object`
			);

		inOptions = foundry.utils.mergeObject(
			{
				loopDelay: 0,
				loops: 0,
				endOnLastLoop: false
			},
			inOptions
		);

		if (typeof inOptions.endOnLastLoop !== "boolean")
			throw this.sequence._customError(
				this,
				"loopOptions",
				"inOptions.endOnLastLoop must be of type boolean"
			);

		if (typeof inOptions.loopDelay !== "number" || inOptions.loopDelay < 0)
			throw this.sequence._customError(
				this,
				"loopOptions",
				"inOptions.loopDelay must be of type number that is not below 0"
			);

		if (typeof inOptions.loops !== "number" || inOptions.loops < 0)
			throw this.sequence._customError(
				this,
				"loopOptions",
				"inOptions.loops must be of type number that is not below 0"
			);

		this._loopOptions = inOptions;

		return this;
	}

	/**
	 * Sets an audio effect to be applied while the sound is heard normally (no walls between source and listener).
	 * Requires `.atLocation()` to be set.
	 *
	 * @param {object} [options]
	 * @param {string} [options.type] - one of the keys in `CONFIG.soundEffects` (eg. `"lowpass"`, `"highpass"`, `"reverb"`)
	 * @param {number} [options.intensity=0] - intensity of the effect
	 * @returns {SoundSection}
	 */
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

	/**
	 * Sets an audio effect to be applied while the sound is heard through a wall. Requires `.atLocation()` to be
	 * set and `.constrainedByWalls()` to be `false` (the default).
	 *
	 * @param {object} [options]
	 * @param {string} [options.type] - one of the keys in `CONFIG.soundEffects` (eg. `"lowpass"`, `"highpass"`, `"reverb"`)
	 * @param {number} [options.intensity=0] - intensity of the effect
	 * @returns {SoundSection}
	 */
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
	 * Sets the target location of the sound, used together with `.atLocation()` so the sound has a direction (for
	 * `.panSound()`, distance falloff, etc).
	 *
	 * @param {object|string} inLocation - reference to a placeable, document, canvas coordinate, or a string name (see `.name()`)
	 * @param {object} [inOptions]
	 * @param {boolean} [inOptions.cacheLocation=false] - cache the target's location at sequence build time instead of resolving it at runtime
	 * @param {object|boolean} [inOptions.offset=false] - offset the target by `{ x, y }`
	 * @param {number|boolean} [inOptions.randomOffset=false] - offset the target by a random amount; if a number, used as a multiplier on the object size
	 * @param {boolean} [inOptions.gridUnits=false] - treat the offset's `x` and `y` as grid units
	 * @param {boolean} [inOptions.local=false] - offset relative to the sound's rotation rather than world axes
	 * @returns {SoundSection}
	 */
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

	/**
	 * Forces the sound to be heard globally, ignoring `.atLocation()`, `.radius()`, walls, and distance easing.
	 *
	 * @param {boolean} [inBool=true]
	 * @returns {SoundSection}
	 */
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
	 * Causes the sound to pan stereo (left/right) based on the position of the sound relative to the listener.
	 *
	 * @param {boolean} [inBool=true]
	 * @param {object} [inOptions]
	 * @param {number} [inOptions.innerEaseDistance=0] - distance within which the pan is at full strength
	 * @param {number} [inOptions.outerEaseDistance=0] - distance beyond which the pan stops easing; must be greater than `innerEaseDistance` when both are non-zero
	 * @returns {SoundSection}
	 */
	panSound(inBool = true, inOptions = {}) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"panSound",
				`inBool must be of type boolean`
			);
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"panSound",
				`inOptions must be of type object`
			);
		inOptions = foundry.utils.mergeObject(
			{
				innerEaseDistance: 0,
				outerEaseDistance: 0,
			},
			inOptions
		);
		if (typeof inOptions.innerEaseDistance !== "number")
			throw this.sequence._customError(
				this,
				"panSound",
				"inOptions.innerEaseDistance must be of type number"
			);
		if (typeof inOptions.outerEaseDistance !== "number")
			throw this.sequence._customError(
				this,
				"panSound",
				"inOptions.outerEaseDistance must be of type number"
			);
		if(inOptions.innerEaseDistance > 0 && inOptions.outerEaseDistance > 0 && inOptions.innerEaseDistance >= inOptions.outerEaseDistance){
			throw this.sequence._customError(
				this,
				"panSound",
				"inOptions.innerEaseDistance must be less than inOptions.outerEaseDistance"
			);
		}
		this._panSound = {
			active: inBool,
			...inOptions,
		};
		return this;
	}

	/**
	 * Adds extra time (in ms) before a persisted sound is considered ended. Only meaningful on `.persist()`ed sounds.
	 *
	 * @param {number} inExtraDuration
	 * @returns {SoundSection}
	 */
	extraEndDuration(inExtraDuration){
		if (typeof inExtraDuration !== "number")
			throw this.sequence._customError(
				this,
				"extraEndDuration",
					"inExtraDuration must be of type number"
			);
		this._extraEndDuration = inExtraDuration;
		return this;
	}

	/**
	 * Causes the sound to persist on the canvas. The sound can be ended later via the Sound Manager.
	 *
	 * @param {boolean} [inBool=true]
	 * @param {object} [inOptions]
	 * @param {boolean} [inOptions.persistTokenPrototype=false] - when attached to a token, persist the sound on the token's prototype data
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
				id: foundry.utils.randomID(),
				persistTokenPrototype: false
			},
			inOptions
		);
		if (typeof inOptions.persistTokenPrototype !== "boolean")
			throw this.sequence._customError(
				this,
				"persist",
				"inOptions.persistTokenPrototype must be of type boolean"
			);
		this._persist = inBool;
		this._persistOptions = inOptions;
		return this;
	}

	/**
	 *  A smart method that can take a reference to an object, or a direct on the canvas to attach an sound to,
	 *  or a string reference (see .name())
	 *
	 * @param {Object|String} inObject
	 * @param {Object} inOptions
	 * @returns {SoundSection}
	 */
	attachTo(inObject, inOptions = {}) {
		if (!inObject || !(typeof inObject === "object" || typeof inObject === "string")) {
			throw this.sequence._customError(
				this,
				"attachTo",
				`inObject is invalid, and must be of type of object, string, placeable object, or document`
			);
		}
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"attachTo",
				`inOptions must be of type object`
			);
		inOptions = foundry.utils.mergeObject(
			{
				bindVisibility: true,
				bindElevation: true,
			},
			inOptions
		);

		const validatedObject = this._validateLocation(inObject);
		if (validatedObject === undefined)
			throw this.sequence._customError(
				this,
				"attachTo",
				"could not find given object"
			);

		if (typeof inOptions.bindVisibility !== "boolean")
			throw this.sequence._customError(
				this,
				"attachTo",
				`inOptions.bindVisibility must be of type boolean`
			);
		if (typeof inOptions.bindElevation !== "boolean")
			throw this.sequence._customError(
				this,
				"attachTo",
				"inOptions.bindElevation must be of type boolean"
			);

		this._source = validatedObject;

		this._attachTo = {
			active: !!validatedObject,
			bindVisibility: inOptions.bindVisibility,
			bindElevation: inOptions.bindElevation,
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
		Object.assign(this.constructor.prototype, traits.offset);
		Object.assign(this.constructor.prototype, traits.moves);
	}

	/**
	 * @private
	 */
	async _initialize() {
		if (this._name) {
			this.sequence.nameOffsetMap ||= {};
			if (!this.sequence.nameOffsetMap[this._name]) {
				const source = this._getSourceObject();
				const target = this._getTargetObject();
				this.sequence.nameOffsetMap[this._name] = {
					seed: `${this._name}-${foundry.utils.randomID()}`,
					source: source,
					target: target,
					twister: {},
				};
			}
		}
	}

	/**
	 * @OVERRIDE
	 */
	async preRun() {
		const oldSource = this._source;
		const crosshairSource = this.sequence?.crosshairs?.[this._source];
		if(typeof this._source === "string" && crosshairSource){
			this._source = crosshairSource.uuid;
		}
		const oldTarget = this._target?.target;
		const crosshairTarget = this.sequence?.crosshairs?.[this._target?.target];
		if(typeof this._target?.target === "string" && crosshairTarget){
			this._target.target = crosshairTarget.uuid;
		}

		if(this._attachTo && !this._attachTo.active && typeof this._source === "string" && crosshairSource){
			this._attachTo.active = !!crosshairSource;
		}

		if (this._name && (oldSource !== this._source || oldTarget !== this._target?.target)) {
			this.sequence.nameOffsetMap[this._name].source = this._getSourceObject();
			this.sequence.nameOffsetMap[this._name].target = this._getTargetObject();
		}

		const source = this._getSourceObject();
		if(this._persistOptions?.persistTokenPrototype && !(this._attachTo?.active || lib.is_UUID(source))){
			this._persistOptions.persistTokenPrototype = false;
		}
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
				`File not found: ${playData.file}`,
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
			if(this._attachTo) {
				return lib.get_object_identifier(doc.object);
			}
			return doc.getOrientation().source;
		}
		if (this._source?.cachedLocation || !this._attachTo) {
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
				file: false,
			};
		}

		let { file, forcedIndex, customRange } = await this._determineFile(this._file);

		if (!file) {
			return {
				play: false,
				file: false,
				customRange: false
			};
		}

		let data = {
			_id: foundry.utils.randomID(),
			flagVersion: flagManager.latestFlagVersion,
			play: true,
			file: file.dbPath ?? file,
			forcedIndex,
			customRange,
			creationTimestamp: Date.now(),
			creatorUserId: game.user.id,
			source: this._getSourceObject(),
			target: this._getTargetObject(),
			attachTo: this._attachTo,
			moveTowards: this._moveTowards
				? {
					ease: this._moveTowards.ease,
					rotate: this._moveTowards.rotate,
				}
				: false,
			offset: this._offset,
			randomOffset: this._randomOffset,
			locationOptions: this._locationOptions,
			loopOptions: this._loopOptions,
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
			persist: this._persist,
			persistOptions: this._persistOptions,
			panSound: this._panSound,
			extraEndDuration: this._extraEndDuration
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
