import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import * as canvaslib from "../lib/canvas-lib.js";
import * as soundlib from "../lib/sound-lib.js";
import { SequencerFileBase } from "./sequencer-file.js";
import CONSTANTS from "../constants.js";
import flagManager from "../utils/flag-manager.js";
import FoundryShim from "../utils/foundry-shim.js";


const SOUND_STATES = {
	STARTING: 0,
	PLAYING: 1,
	ENDING: 2,
	ENDED: 3
}

const global_sound_mixin = (base_class) =>
	class extends base_class {
		get playData() {
			return {
				...this.data.locationOptions,
				...this.playbackOptions,
				volume: this.data.fadeIn ? 0 : this.data.volume,
			};
		}

		async playSound(){
			this.sound.play(this.playData);
		}
	}

const placed_sound_mixin = (base_class) =>
	class extends base_class {

		movementDuration = 0;

		constructor(...args) {
			super(...args);
			if (this.isSourceDestroyed) {
				this.stop();
			}
		}

		get volume_property() {
			return "volume_multiplier";
		}

		async load(){
			await super.load();
			this.movementDuration = this.totalDuration;
			if(this.moveTowards) {
				if (this.data.moveSpeed) {
					const distance = canvaslib.distance_between(
						this.sourcePosition,
						this.targetPosition
					);
					this.movementDuration = (distance / this.data.moveSpeed) * 1000;
				}
				if (this.creationTimeDelta > this.movementDuration) {
					this.position = this.targetPosition;
				}
			}
		}

		async playSound() {
			await this.sound.playAtPosition(this.position, this.data.locationOptions?.radius || 1, this.playData);
		}

		update() {
			if (this.state !== SOUND_STATES.PLAYING) return;

			let volume = this.data.volume ?? 0.8;

			let {
				easing = true,
				walls = false,
				gmAlways = false,
				sourceData = {},
				radius = 1,
				muffledEffect = { type: "lowpass", intensity: 5 }
			} = this.data.locationOptions ?? {};

			let sourcePosition = this.sourcePosition;

			const source = new CONFIG.Canvas.soundSourceClass({ object: null });
			source.initialize({
				x: sourcePosition.x,
				y: sourcePosition.y,
				elevation: sourcePosition.elevation ?? 0,
				radius: canvas.dimensions.distancePixels * radius,
				walls,
				...sourceData
			});

			const config = { sound: this.sound, source, listener: undefined, volume: 0, walls, muffled: false, pan: 0 };

			// Configure playback volume using the closest listener position
			const listeners = (gmAlways && game.user.isGM) ? [sourcePosition] : canvas.sounds.getListenerPositions();
			for (const l of listeners) {
				const v = volume * source.getVolumeMultiplier(l, { easing });
				Object.assign(config, { listener: l, volume: v });
				let ray = new foundry.canvas.geometry.Ray(l, sourcePosition)
				if(this.data.panSound?.active && ray.distance > 0) {
					const normalized_x = ray.dx / ray.distance; // -1..1

					const panned_value = soundlib.ease_pan_value(normalized_x, 1.6);
					let pan_ease_factor = 1.0;

					if(this.data.panSound?.innerEaseDistance > 0) {
						const inner_ease_distance = this.data.panSound?.innerEaseDistance || 0;
						const outer_ease_distance = (
							this.data.panSound?.outerEaseDistance || Math.min(inner_ease_distance * 2, this.data.locationOptions?.radius ?? 1)
						);
						const inner_ease_distance_pixels = (inner_ease_distance / canvas.grid.distance) * canvas.grid.size;
						const outer_ease_distance_pixels = (outer_ease_distance / canvas.grid.distance) * canvas.grid.size;
						pan_ease_factor = soundlib.calculate_pan_factor(ray.distance, inner_ease_distance_pixels, outer_ease_distance_pixels);
					}

					// Within the ease distance => closer to 0, beyond it => full pan
					config.pan = panned_value * pan_ease_factor;
				}
			}

			canvas.sounds._configurePlayback(config);

			let applyEffect = false;
			let hasMuffledEffect = this.sound.effects.findIndex(e => e.type === muffledEffect.type);

			if (hasMuffledEffect > -1 && !config.muffled) {
				this.sound.effects[hasMuffledEffect].disconnect();
				this.sound.effects.splice(hasMuffledEffect, 1);
				applyEffect = true;
			} else if (hasMuffledEffect === -1 && config.muffled) {
				const sfx = CONFIG.soundEffects;
				let effect;
				if (config.muffled && (muffledEffect?.type in sfx)) {
					const muffledCfg = sfx[muffledEffect.type];
					effect = new muffledCfg.effectClass(this.sound.context, muffledEffect);
					this.sound.effects.push(effect);
				}
				applyEffect = true;
			}

			let hasPanner = this.sound.effects.findIndex(e => e.type === "panner");
			if(this.data.panSound) {
				this.panner ||= this.sound.context.createStereoPanner();
				this.panner.type = "panner"
				if (hasPanner === -1) {
					this.sound.effects.push(this.panner);
					applyEffect = true;
				}
			}

			if(applyEffect) {
				this.sound.applyEffects(this.sound.effects);
			}

			if (this.data.attachTo?.active) {
				if (this.sourceDocument.hidden) {
					config.volume = 0;
				}
			}

			this.sound.volume = config.volume * this.sound.volume_multiplier;

			if(this.data.panSound) {
				const t = this.sound.context.currentTime;
				this.panner.pan.cancelScheduledValues(t);
				this.panner.pan.setValueAtTime(this.panner.pan.value, t);
				this.panner.pan.linearRampToValueAtTime(config.pan, t + 0.03);
			}
		}

		get playData() {
			let volume = this.data.volume ?? 0.8;
			if (this.data.attachTo?.active) {
				if (this.sourceDocument.hidden) {
					volume = 0;
				}
			}
			return {
				easing: true,
				walls: false,
				gmAlways: false,
				radius: 1,
				muffledEffect: { type: "lowpass", intensity: 5 },
				...this.data.locationOptions,
				playbackOptions: this.playbackOptions,
				volume
			}
		}

		animate() {
			super.animate();
			canvas.app.ticker.add(this.update, this);

			if (this.data.moveTowards && this.creationTimeDelta <= this.movementDuration) {
				SequencerAnimationEngine.addAnimation(this.data._id, {
					target: this,
					propertyName: "position.x",
					from: this.sourcePosition.x,
					to: this.targetPosition.x,
					duration: this.movementDuration,
					ease: this.data.moveTowards.ease ?? "linear",
					delay: 0,
					absolute: true
				});

				SequencerAnimationEngine.addAnimation(this.data._id, {
					target: this,
					propertyName: "position.y",
					from: this.sourcePosition.y,
					to: this.targetPosition.y,
					duration: this.movementDuration,
					ease: this.data.moveTowards.ease ?? "linear",
					delay: 0,
					absolute: true
				});
			}
		}

		stop() {
			canvas.app.ticker.remove(this.update, this);
			if (this.panner) {
				this.panner.disconnect();
			}
			super.stop();
		}
	};

const persistent_sound_mixin = (base_class) =>
	class extends base_class {
		stop(removeFlags = false) {
			if (removeFlags) {
				flagManager.removeFlags(this.context.uuid, {
					sounds: this.data
				});
			}
			let extraEndDuration = this.data.extraEndDuration ?? 0;
			let endDuration = extraEndDuration + this.fadeOut();
			setTimeout(() => {
				SequenceManager.RunningSounds.delete(this.id);
				super.stop();
			}, endDuration);
		}

		fadeIn() {
			let fadeInDuration = Math.min(this.data.fadeIn.duration, this.totalDuration)
			if (this.creationTimeDelta <= fadeInDuration) {
				super.fadeIn();
			}
		}

		get startOffset() {
			let offset = (this.startTime ?? 0);
			if (this.creationTimeDelta > this.soundDuration && this.state === SOUND_STATES.STARTING) {
				offset += this.creationTimeDelta % this.duration;
			}
			return offset;
		}

		get loopDuration() {
			if (this.state === SOUND_STATES.STARTING) {
				return super.loopDuration -  this.startOffset;
			}
			return super.loopDuration;
		}
	}

class SequencerSound {
	
	/**
	 * @property {string} id - Unique identifier for the sound.
	 */
	id;

	/**
	 * @property {Object} data - The data associated with the sound.
	 */
	data;

	/**
	 * @property {Object} twister - Mersenne Twister instance for random number generation.
	 */
	twister;

	/**
	 * @property {number} actualCreationTime - The actual creation time of the sound.
	 */
	actualCreationTime;

	/**
	 * @property {number} creationTimeDelta - The difference in time since the sound was created and when it started playing.
	 */
	creationTimeDelta;

	/**
	 * @property {number} state - The current state of the sound.
	 * Possible values are:
	 * - 0: STARTING - The sound is in the process of starting.
	 * - 1: PLAYING - The sound is currently playing.
	 * - 2: ENDING - The sound is in the process of ending.
	 * - 3: ENDED - The sound has finished playing.
	 */
	state;

	/**
	 * @property {Object|null} sound - The sound object instance.
	 */
	sound;

	/**
	 * @property {number|null} totalDuration - The total playback duration of the sound.
	 */
	totalDuration;

	/**
	 * @property {number|null} soundDuration - The duration of the actual sound file.
	 */
	soundDuration;

	/**
	 * @property {number|null} startTime - The start time of the sound in milliseconds.
	 */
	startTime;

	/**
	 * @property {number|null} endTime - The end time of the sound in milliseconds.
	 */
	endTime;

	/**
	 * @private
	 * @property {Object|null} #file - The file metadata associated with the sound.
	 */
	#file;

	/**
	 * @property {boolean} shouldPlaySound - Whether the sound should play based on user settings.
	 */
	shouldPlaySound;

	/**
	 * @property {Object|null} panner - Stereo panner node for sound effects.
	 */
	panner;

	/**
	 * @property {number} loops - Number of loops the sound is configured to play.
	 */
	loops;

	/**
	 * @property {number} loopDelay - Delay between loops in milliseconds.
	 */
	loopDelay;

	/**
	 * @property {number} currentLoop - The current loop count.
	 */
	currentLoop = 0;

	/**
	 * @property {Object|null} _sourcePosition - The source position of the sound on canvas.
	 */
	_sourcePosition;

	/**
	 * @property {Object|null} _targetPosition - The target position of the sound on canvas.
	 */
	_targetPosition;

	/**
	 * @property {Object|null} loopTimes - Information about the loop's start and end times.
	 */
	loopTimes;

	/**
	 * @property {Object|null} position - The current playback position of the sound.
	 */
	position;
	
	
	constructor(data) {
		this.id = data._id
		this.data = data;
		this.twister = lib.createMersenneTwister(data.seed);
		this.actualCreationTime = (+new Date());
		this.creationTimeDelta = this.actualCreationTime - this.data.creationTimestamp;
		this.state = SOUND_STATES.STARTING;
		this.shouldPlaySound = game.settings.get("sequencer", "soundsEnabled") &&
			game.user.viewedScene === data.sceneId &&
			(!data?.users?.length || data?.users?.includes(game.userId));
		this.panner = null;
		this.loops = this.data.loopOptions.loops ?? 0;
		this.loopDelay = this.data.loopOptions.loopDelay ?? 0;
		this.position = this.sourcePosition;
	}

	static make(data) {
		if (data.persist && data.source && !data.global) {
			return new SequencerPersistentPlacedSound(data);
		} else if (data.source && !data.global) {
			return new SequencerPlacedSound(data);
		} else if (data.persist) {
			return new SequencerPersistentGlobalSound(data);
		}
		return new SequencerGlobalSound(data);
	}

	get sourcePosition() {
		if (this.data.attachTo?.active) {
			if (!this.isSourceDestroyed) {
				let position = canvaslib.get_object_position(this.source);
				let offset = canvaslib.getOffsetFromData(this.data, { type: "source", twister: this.twister });
				let elevation = this.data.attachTo.bindElevation ? position.elevation : 0;
				this._sourcePosition = {
					x: position.x - offset.x,
					y: position.y - offset.y,
					elevation
				};
			}
		} else if (!this._sourcePosition) {
			this._sourcePosition = this.data.source ? canvaslib.getPositionFromData(this.data, "source", this.twister) : false;
		}
		return this._sourcePosition;
	}

	get targetPosition() {
		if (!this._targetPosition) {
			this._targetPosition = this.data.target ? canvaslib.getPositionFromData(this.data, "target", this.twister) : false;
		}
		return this._targetPosition;
	}

	_validateObject(inObject) {
		if (lib.is_UUID(inObject) || !canvaslib.is_object_canvas_data(inObject)) {
			inObject = lib.get_object_from_scene(inObject, this.data.sceneId);
			inObject = inObject?._object ?? inObject;
		}
		return inObject;
	}

	_getObjectByID(inIdentifier, specific = false, returnSource = false) {
		let source = inIdentifier;
		let offsetMap = this._nameOffsetMap?.[inIdentifier];
		if (offsetMap) {
			if (specific) {
				source = (returnSource
						? offsetMap?.sourceObj || offsetMap?.targetObj
						: offsetMap?.targetObj || offsetMap?.sourceObj
				) || source;
			} else {
				source = offsetMap?.targetObj || offsetMap?.sourceObj || source;
			}
		} else {
			source = this._validateObject(source);
		}
		return source;
	}

	/**
	 * Whether the source of this sound has been destroyed
	 *
	 * @returns {boolean}
	 */
	get isSourceDestroyed() {
		return (
			this.source && this.source?.destroyed && (!this.sourceDocument?.object || this.sourceDocument?.object?.destroyed || this.source.constructor.name === "Crosshairs")
		);
	}

	get source() {
		if (!this._source && this.data.source) {
			const getDifferentTarget = this.data.source === this.data.target;
			this._source = this._getObjectByID(this.data.source?.uuid ?? this.data.source, getDifferentTarget, true) ?? this.data.source;
			this._source = this._source?._object ?? this._source;
		}
		return this._source;
	}

	get sourceDocument() {
		return this.source?.document ?? this.source;
	}

	get target() {
		if (!this._target && this.data.target) {
			const getDifferentTarget = this.data.source === this.data.target;
			this._target = this._getObjectByID(this.data.target?.uuid ?? this.data.target, getDifferentTarget, false) ?? this.data.target;
			this._target = this._target?._object ?? this._target;
		}
		return this._target;
	}

	get targetDocument() {
		return this.target?.document ?? this.target;
	}

	get context() {
		return this.data.attachTo?.active && this.sourceDocument
			? this.sourceDocument
			: game.scenes.get(this.data.sceneId);
	}

	static checkShouldPlay(data) {
		return !data.local || data.creatorUserId === game.user.id;
	}

	static checkValid(data) {
		if (data.delete) {
			return false;
		}
		let sourceExists = true;
		let targetExists = true;
		if (data.source && lib.is_UUID(data.source)) {
			sourceExists = fromUuidSync(data.source);
		}
		if (data.target && lib.is_UUID(data.target)) {
			targetExists = fromUuidSync(data.target);
		}
		for (let tiedDocumentUuid of data?.tiedDocuments ?? []) {
			if (tiedDocumentUuid && lib.is_UUID(tiedDocumentUuid)) {
				let tiedDocumentExists = fromUuidSync(tiedDocumentUuid);
				if (!tiedDocumentExists) return false;
			}
		}
		if (
			data.source &&
			lib.is_UUID(data.source) &&
			data.target &&
			lib.is_UUID(data.target)
		) {
			const sourceScene = data.source.split(".")[1];
			const targetScene = data.target.split(".")[1];
			if (sourceScene !== targetScene || sourceScene !== data.sceneId)
				return false;
		}
		return sourceExists && targetExists;
	}

	get startOffset() {
		return (this.startTime ?? 0)
	}

	get looping() {
		return this.loopTimes && this.state === SOUND_STATES.PLAYING;
	}

	get playbackOptions() {
		let loopStart = (this.startTime ?? 0);
		let loopEnd = (this.endTime ?? 0);
		let offset = this.startOffset / 1000;
		if(this.loopTimes){
			if(this.state === SOUND_STATES.PLAYING){
				loopStart = this.loopTimes.loopStart;
				offset = this.loopTimes.loopStart;
			}
			if(this.state === SOUND_STATES.STARTING || this.state === SOUND_STATES.PLAYING){
				loopEnd = this.loopTimes.loopEnd;
			}
			if(this.state === SOUND_STATES.ENDING){
				loopStart = this.loopTimes.forcedEnd || this.loopTimes.loopEnd;
			}
		}
		let loop = this.looping;
		return {
			loop,
			offset,
			loopStart: loopStart / 1000,
			loopEnd: loopEnd / 1000,
			channel: this.data.channel || "interface",
			delay: 0
		};
	}

	async load() {
		if (!this.sound) {
			let placedOnCanvas = this.data.source && !this.data.global;
			let sound = new foundry.audio.Sound(this.getFile(), {
				context: placedOnCanvas ? game.audio.environment : game.audio.interface
			});
			await sound.load();
			this.sound = sound;
		}
		this.soundDuration = this.sound.duration * 1000;

		this.startTime = 0;
		this.endTime = this.soundDuration;

		if (this.data.time?.start) {
			if (this.data.time.start.isPerc) {
				this.startTime = this.data.time.start.value * this.soundDuration;
			} else {
				this.startTime = this.data.time.start.value;
			}
		}
		if (this.data.time?.end) {
			if (this.data.time.end.isPerc) {
				this.endTime = this.soundDuration - (this.soundDuration * this.data.time.end.value);
			} else {
				this.endTime = this.data.time.isRange
					? this.data.time.end.value
					: this.soundDuration - this.data.time.end.value;
			}
		}

		this.duration = this.data.duration === false
			? this.endTime - this.startTime
			: this.data.duration;

		this.totalDuration = this.duration;

		if (this.loops && !this.data.duration) {
			this.totalDuration += this.loopDelay;
			this.totalDuration *= this.loops + 1;
		}

		if (
			this.file?.markers &&
			this.startTime === 0 &&
			this.endTime === this.duration
		) {
			this.loopTimes = {
				loopStart: this.file.markers.loop.start,
				loopEnd: this.file.markers.loop.end,
				forcedEnd: this.file.markers.forcedEnd,
			};
		}

		this.sound.data = this.data;
		this.sound.sound_id = this.data._id;
		this.sound.loop = this.totalDuration > this.soundDuration && !(this.loops && this.loopDelay);
		this.sound.volume_multiplier = 1.0;
		this.sound.volume = this.data.volume * this.sound.volume_multiplier;
	}

	get volume_property() {
		return "volume";
	}

	get file() {
		if (this.#file){
			return this.#file;
		}
		let file;

		if (this.data.customRange) {
			const template = this.data.template
				? [this.data.template.gridSize, this.data.template.startPoint, this.data.template.endPoint]
				: [100, 0, 0];
			file = SequencerFileBase.make(
				this.data.file,
				"temporary.range.file",
				{ template },
			);
		} else if (Sequencer.Database.entryExists(this.data.file)) {
			file = Sequencer.Database.getEntry(this.data.file).clone();
		} else {
			file = SequencerFileBase.make(this.data.file);
		}

		if (lib.is_real_number(this.data.forcedIndex)) {
			file.fileIndex = this.data.forcedIndex;
		}
		this.#file = file;
		return file;
	}

	getFile() {
		if (this.file.rangeFind && this.source && this.target){
			let distance = (new foundry.canvas.geometry.Ray(this.sourcePosition, this.targetPosition)).distance;
			return this.file.getFileForDistance(distance);
		}
		return this.file.getFile();
	}

	async playSound(){
		throw new Error("NotImplementedError: playSound() must be implemented by a subclass of SequencerSound.");
	}

	async play(forcePlay=false) {
		if (this.state === SOUND_STATES.ENDED){
			return;
		}

		if (this.currentLoop > this.loops && this.data.loopOptions?.endOnLastLoop) {
			return this.stop(true);
		}

		if (game.audio.locked) {
			setTimeout(() => this.play(), 100);
			return;
		}

		if(!this.sound.loop || forcePlay) {
			await this.sound.stop();
			await this.playSound();
		}

		if (!this.sound.gain) {
			setTimeout(() => this.play(), 100);
			return;
		}

		if (this.state === SOUND_STATES.STARTING) {
			this.animate();
		}

		if (this.loops) {
			this.currentLoop += 1;
		}

		if(!this.sound.loop) {
			setTimeout(this.play.bind(this), this.loopDuration);
		}

		this.state = SOUND_STATES.PLAYING;
	}

	get loopDuration() {
		let duration = this.duration;
		if (this.loopTimes){
			if(this.state === SOUND_STATES.STARTING){
				duration = this.loopTimes.loopEnd;
			} else if (this.state === SOUND_STATES.PLAYING) {
				duration = this.loopTimes.loopEnd - this.loopTimes.loopStart;
			}
		}
		return duration;
	}

	animate() {
		if (!this.shouldPlaySound) return;

		if (this.data.fadeIn) {
			this.fadeIn();
		}

		if (this.data.fadeOut) {
			this.fadeOut();
		}
	}

	stop() {
		if(this.loopTimes){
			this.state = SOUND_STATES.ENDING;
			let currentTime = this.sound.currentTime * 1000;

			let lastLoopWaitDuration = currentTime > this.loopTimes.loopStart
				? this.loopTimes.loopEnd - currentTime
				: this.loopTimes.loopStart - currentTime;

			if(this.loopTimes.forcedEnd) {
				this.play(true);
			}else{
				setTimeout(() => {
					this.play(true);
				}, lastLoopWaitDuration);
			}
			let stopWaitDuration = this.loopTimes.forcedEnd
				? this.duration - this.loopTimes.forcedEnd
				: lastLoopWaitDuration + (this.duration - this.loopTimes.loopEnd);
			return setTimeout(() => {
				this.state = SOUND_STATES.ENDED;
				this.sound.stop();
			}, stopWaitDuration);
		}
		this.state = SOUND_STATES.ENDED;
		this.sound.stop();
	}

	fadeIn() {
		this.sound.volume = 0.0;
		SequencerAnimationEngine.addAnimation(this.data._id, {
			target: this.sound,
			propertyName: this.volume_property,
			from: 0.0,
			to: 1.0,
			duration: Math.min(this.data.fadeIn.duration, this.duration),
			ease: this.data.fadeIn.ease,
			delay: Math.min(this.data.fadeIn.delay, this.duration),
			absolute: true
		});
	}

	fadeOut(immediate = false) {
		let fadeOut = this.data.fadeOut;
		let duration = Math.min(fadeOut.duration, this.duration);
		let delay = lib.is_real_number(immediate)
			? Math.max(immediate - fadeOut.duration + fadeOut.delay, 0)
			: Math.max(this.totalDuration - fadeOut.duration + fadeOut.delay, 0);

		SequencerAnimationEngine.addAnimation(this.data._id, {
			target: this.sound,
			propertyName: this.volume_property,
			from: 1.0,
			to: 0.0,
			duration,
			ease: fadeOut.ease,
			delay,
			absolute: true
		});

		return duration + delay;
	}

	addFlags() {
		let uuid = this.context?.uuid;
		if (uuid) {
			flagManager.addFlags(uuid, { sounds: this.data });
		}
	}
}

class SequencerGlobalSound extends global_sound_mixin(SequencerSound) {}
class SequencerPersistentGlobalSound extends global_sound_mixin(persistent_sound_mixin(SequencerSound)) {}
class SequencerPlacedSound extends placed_sound_mixin(SequencerSound) {}
class SequencerPersistentPlacedSound extends placed_sound_mixin(persistent_sound_mixin(SequencerSound)) {}

export default class SequencerSoundManager {

	static setup() {
		Hooks.on("preCreateToken", this._patchCreationData.bind(this));
		Hooks.on("preCreateDrawing", this._patchCreationData.bind(this));
		Hooks.on("preCreateTile", this._patchCreationData.bind(this));
		Hooks.on("preCreateMeasuredTemplate", this._patchCreationData.bind(this));
		Hooks.on("preCreateRegion", this._patchCreationData.bind(this));
		Hooks.on("createToken", this._documentCreated.bind(this));
		Hooks.on("createDrawing", this._documentCreated.bind(this));
		Hooks.on("createTile", this._documentCreated.bind(this));
		Hooks.on("createMeasuredTemplate", this._documentCreated.bind(this));
		Hooks.on("createRegion", this._documentCreated.bind(this));
	}

	static async _patchCreationData(inDocument, data, options) {
		const sounds = flagManager.getSoundFlags(inDocument);

		if (!sounds?.length) return;

		const updates = {};

		let documentUuid;
		if (!inDocument._id) {
			const documentId = foundry.utils.randomID();
			documentUuid = inDocument.uuid + documentId;
			updates["_id"] = documentId;
			options.keepId = true;
		} else {
			documentUuid = inDocument.uuid;
		}

		updates[CONSTANTS.SOUNDS_FLAG] = this._patchSoundDataForDocument(
			documentUuid,
			sounds
		);

		return flagManager.updateFlags(inDocument, updates);
	}

	static _patchSoundDataForDocument(inDocumentUuid, sounds) {
		return sounds.map((sound) => {
			sound[0] = foundry.utils.randomID();
			const soundData = sound[1];
			soundData._id = sound[0];
			if (lib.is_UUID(soundData.source)) {
				soundData.source = inDocumentUuid;
			}
			soundData.sceneId = inDocumentUuid.split(".")[1];
			return sound;
		});
	}

	/**
	 * Plays the sounds of a given document on creation
	 *
	 * @param inDocument
	 * @returns {*}
	 */
	static async _documentCreated(inDocument) {
		let sounds = flagManager.getSoundFlags(inDocument);
		if (inDocument instanceof TokenDocument && inDocument?.actorLink) {
			let actorSounds = flagManager.getSoundFlags(inDocument?.actor);
			if (actorSounds.length) {
				actorSounds = this._patchSoundDataForDocument(
					inDocument.uuid,
					actorSounds
				);
			}
			sounds = sounds.concat(actorSounds);
		}
		if (!sounds?.length) return;
		return this._playSoundsMap(sounds, inDocument);
	}

	/**
	 * Sets up persisting sounds when the scene is first loaded
	 *
	 * @returns {promise}
	 */
	static async initializePersistentSounds() {
		await this.tearDownPersistentSounds();
		let docSoundsMap = {};
		let soundsToRemove = {};
		let databaseSounds = foundry.utils.deepClone(flagManager.getDatabaseFlags().sounds);
		for (let [uuid, sounds] of Object.entries(databaseSounds)) {
			let doc = fromUuidSync(uuid);
			if (doc instanceof FoundryShim.Actor && doc.prototypeToken.actorLink) {
				for (let token of doc.getActiveTokens()) {
					let tokenSounds = foundry.utils.deepClone(sounds);
					docSoundsMap[token.document.uuid] = tokenSounds.map(([id, sound]) => {
						if (lib.is_UUID(sound.source)) {
							sound.source = token.document.uuid;
						}
						sound.sceneId = canvas.scene.id;
						return [id, sound];
					})
				}
			} else if (doc) {
				docSoundsMap[uuid] = sounds;
			} else {
				soundsToRemove[uuid] = sounds;
			}
		}
		const promises = Object.entries(docSoundsMap)
			.map(([uuid, sounds]) => {
				return this._playSoundsMap(sounds, fromUuidSync(uuid));
			})
			.flat();
		for (let [uuid, sounds] of Object.entries(soundsToRemove)) {
			flagManager.removeFlags(uuid, {
				sounds, removeAllSounds: true
			});
		}
		return Promise.all(promises).then(() => {
			Hooks.callAll("sequencerSoundManagerReady");
		});
	}

	/**
	 * Tears down persisting sounds when the scene is unloaded
	 */
	static tearDownPersistentSounds() {
		return Promise.allSettled(
			this.sounds.map((sound) => {
				SequenceManager.RunningSounds.delete(sound._id);
				return sound.stop();
			})
		);
	}

	/**
	 * Plays multiple sounds at the same time
	 *
	 * @param inSounds
	 * @param inDocument
	 * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}[]>}
	 * @private
	 */
	static _playSoundsMap(inSounds, inDocument) {
		if (inSounds instanceof Map) inSounds = Array.from(inSounds);
		return Promise.all(
			inSounds.map((sound) => {
				if (!SequencerSound.checkShouldPlay(sound[1])) return;
				if (!SequencerSound.checkValid(sound[1])) {
					if (!game.user.isGM) return;
					lib.custom_warning(
						`Sequencer`,
						`Removed sound from ${inDocument.uuid} as it no longer had a valid source or target`
					);
					return flagManager.removeFlags(inDocument.uuid, { sounds: sound });
				}
				return this._playSound(sound[1], false)
					.then((result) => {
						if (!result) {
							lib.debug("Error playing sound");
						}
					})
					.catch((err) => {
						lib.debug("Error playing sound:", err);
					});
			})
		);
	}

	/**
	 * Returns all the currently running sounds
	 *
	 * @returns {Array}
	 */
	static get sounds() {
		return Array.from(SequenceManager.RunningSounds.values());
	}

	/**
	 * Opens the Sequencer Manager with the sounds tab open
	 */
	static show() {
		return EffectsUIApp.show({ tab: "manager" });
	}

	/**
	 * Play an audio file.
	 *
	 * @param {Object} data The data that describes the audio to play.
	 * @param {boolean} [push=false] A flag indicating whether to make other clients play the audio, too.
	 * @returns {Number} A promise that resolves when the audio file has finished playing.
	 */
	static async play(data, push = true) {
		if (push)
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, data);
		return this._playSound(data);
	}

	/**
	 * @param {Object} data
	 * @param {Boolean} setFlags
	 * @returns {Number}
	 * @private
	 */
	static async _playSound(data, setFlags = true) {

		if (data.delete) return false;

		Hooks.callAll("createSequencerSound", data);

		lib.debug(`Playing sound:`, data);

		let sequencerSound = SequencerSound.make(data);

		await sequencerSound.load();

		SequenceManager.RunningSounds.add(sequencerSound.id, sequencerSound);

		let promise = sequencerSound.play();

		if (data.persist) {
			let responsibleUser = game.users.getDesignatedUser((user) => user.active);
			if (responsibleUser === game.user && setFlags) {
				sequencerSound.addFlags();
			}
			return sequencerSound.duration;
		}

		promise.then(() => {
			SequenceManager.RunningSounds.delete(sequencerSound.id);
			sequencerSound.stop();
			Hooks.callAll("endedSequencerSound", data);
		});

		return sequencerSound.duration;
	}

	static _validateFilters(inFilter) {

		if (inFilter?.sounds) {
			if (!Array.isArray(inFilter.sounds)) {
				inFilter.sounds = [inFilter.sounds];
			}
			inFilter.sounds = inFilter.sounds.map((sound) => {
				if (!(typeof sound === "string" || sound instanceof SequencerSound))
					throw lib.custom_error(
						"Sequencer",
						"SoundManager | collections in inFilter.sounds must be of type string or SequencerSound",
					);
				if (sound instanceof SequencerSound) return sound.data._id;
				return sound;
			});
		}

		if (inFilter?.name && typeof inFilter?.name !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.name must be of type string",
			);

		if (inFilter?.sceneId) {
			if (typeof inFilter.sceneId !== "string")
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be of type string",
				);
			if (!game.scenes.get(inFilter.sceneId))
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be a valid scene id (could not find scene)",
				);
		} else {
			inFilter.sceneId = game.user.viewedScene;
		}

		if (inFilter?.origin && typeof inFilter?.origin !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.origin must be of type string",
			);

		if (
			!inFilter.sounds &&
			!inFilter.name &&
			!inFilter.sceneId &&
			!inFilter.origin
		) {
			return false;
		}

		return foundry.utils.mergeObject(
			{
				sounds: null,
				name: null,
				sceneId: null,
				origin: null,
			},
			inFilter,
		);
	}

	static _filterSounds(inFilter) {
		if (inFilter.name) {
			inFilter.name = new RegExp(
				"^" + lib.str_to_search_regex_str(lib.safe_str(inFilter.name)) + "$",
				"gu",
			);
		}
		return this.sounds.filter((sound) => {
			return (
				(inFilter.sounds === null || inFilter.sounds.includes(sound.data._id)) &&
				(inFilter.name === null || (sound.data.name && inFilter.name && sound.data.name.match(inFilter.name)?.length)) &&
				(inFilter.sceneId === null || (sound.data.sceneId === inFilter.sceneId)) &&
				(inFilter.origin === null || inFilter.origin === sound.data.origin)
			)
		});
	}

	static getSounds(inFilter = {}) {
		const filters = this._validateFilters(inFilter);
		if (!inFilter)
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | getSounds | Incorrect or incomplete parameters provided",
			);
		return this._filterSounds(filters);
	}

	static endSounds(inFilter, push = true) {
		const filters = this._validateFilters(inFilter);
		const sounds = this._filterSounds(filters);
		if (!sounds?.length) return;
		const ids = sounds.map(sound => sound.data._id);
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}

	/**
	 * @param inSoundIds
	 * @private
	 */
	static _endSounds(inSoundIds) {
		const actorSoundsToEnd = this.sounds.filter((sound) => {
			return (
				sound.context?.actorLink &&
				inSoundIds.includes(sound.data?.persistOptions?.id)
			);
		});
		const soundsByActorUuid = Object.values(
			lib.group_by(actorSoundsToEnd, "context.actor.uuid")
		);

		const regularSoundsToEnd = this.sounds.filter((sound) => {
			return (
				inSoundIds.includes(sound.id) ||
				(!sound.context?.actorLink &&
					inSoundIds.includes(sound.data?.persistOptions?.id))
			);
		});
		const soundsByContextUuid = Object.values(
			lib.group_by(regularSoundsToEnd, "context.uuid")
		);

		soundsByContextUuid.forEach((sounds) => {
			sounds = sounds.filter(
				(sound) => sound.data.persist && !sound.data.temporary
			);
			if (!sounds.length) return;
			const soundData = sounds.map((sound) => sound.data);
			flagManager.removeFlags(
				sounds[0].context.uuid,
				{ sounds: soundData, removeAllSounds: !inSoundIds }
			);
		});

		soundsByActorUuid.forEach((sounds) => {
			sounds = sounds.filter(
				(sound) => sound.data.persist && !sound.data.temporary
			);
			if (!sounds.length) return;

			const soundContext = sounds[0].context;
			const soundData = sounds.map((sound) => sound.data);

			if (
				!(
					soundContext instanceof TokenDocument &&
					soundContext.actorLink &&
					soundContext.actor.prototypeToken.actorLink
				)
			) {
				return;
			}

			const persistentSoundData = soundData.filter(
				(data) => lib.is_UUID(data?.source) && data?.persistOptions?.persistTokenPrototype
			);
			if (!persistentSoundData.length) return;

			const actorSounds = flagManager.getSoundFlags(soundContext.actor);
			const applicableActorSounds = actorSounds
				.filter((sound) => {
					return (
						lib.is_UUID(sound[1]?.source) &&
						sound[1]?.persistOptions?.persistTokenPrototype &&
						persistentSoundData.some(
							(persistentSound) =>
								persistentSound.persistOptions.id ===
								sound[1]?.persistOptions?.id
						)
					);
				})
				.map((e) => e[0]);

			flagManager.removeFlags(
				soundContext.actor.uuid,
				{ sounds: applicableActorSounds, removeAllSounds: !inSoundIds }
			);
		});

		const soundsToEnd = soundsByContextUuid
			.concat(soundsByActorUuid)
			.deepFlatten();

		return Promise.allSettled(
			soundsToEnd.map((sound) => this._removeSound(sound))
		);
	}

	static _removeSound(sound) {
		SequenceManager.RunningSounds.delete(sound.id);
		return sound.stop();
	}

	static endAllSounds(push = true) {
		const ids = SequenceManager.RunningSounds.keys();
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}
}
