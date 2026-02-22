import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { SequencerFileBase } from "./sequencer-file.js";
import CONSTANTS from "../constants.js";
import flagManager from "../utils/flag-manager.js";
import FoundryShim from "../utils/foundry-shim.js";
import soucePosition from "../utils/plugins-manager.js";


class SequencerSound {
	constructor(data) {
		this.id = data._id
		this.data = data;
		this.twister = lib.createMersenneTwister(data.seed);
		this.actualCreationTime = (+new Date());
		this.creationTimeDelta = 0;
		this.started = false;
		this.sound = null;
		this.totalDuration = null;
		this.soundDuration = null;
		this.startTime = null;
		this.endTime = null;
		this._file = null;
		this.playSound = game.settings.get("sequencer", "soundsEnabled") &&
			game.user.viewedScene === data.sceneId &&
			(!data?.users?.length || data?.users?.includes(game.userId));
		this.panner = null;
		this.loops = this.data.loopOptions.loops ?? 0;
		this.loopDelay = this.data.loopOptions.loopDelay ?? 0;
		this.currentLoop = 0;
		this._sourcePosition = null;
		this._targetPosition = null;
		this.position = this.sourcePosition;
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

	get playbackOptions() {
		return {
			loopStart: (this.startTime ?? 0) / 1000,
			loopEnd: (this.endTime ?? 0) / 1000,
			offset: this.startOffset / 1000,
			channel: this.data.channel || "interface"
		}
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

		this.sound.data = this.data;
		this.sound.sound_id = this.data._id;
		this.sound.sound_playing = this.playSound || game.user.isGM;
		this.sound.loop = this.totalDuration > this.soundDuration && !(this.loops && this.loopDelay);
		this.sound.volume_multiplier = 1.0;
		this.sound.volume = this.data.volume * this.sound.volume_multiplier;
	}

	get volume_property() {
		return "volume";
	}

	get file() {
		if (this._file) return this._file;
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
		this._file = file;
		return file;
	}

	getFile() {
		if (this.file.rangeFind && this.source && this.target){
			let distance = (new foundry.canvas.geometry.Ray(this.sourcePosition, this.targetPosition)).distance;
			return this.file.getFileForDistance(distance);
		}
		return this.file.getFile();
	}

	async play() {
	}

	static make(data) {
		if (data.persist && data.source && !data.global) {
			return new SequencerPersistentSound(data);
		} else if (data.source && !data.global) {
			return new SequencerPlacedSound(data);
		}
		return new SequencerGlobalSound(data);
	}

	animate() {
	}

	stop() {
	}

	addFlags() {
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
}

class SequencerGlobalSound extends SequencerSound {
	get playData() {
		return {
			...this.data.locationOptions,
			...this.playbackOptions,
			volume: this.data.fadeIn ? 0 : this.data.volume,
		};
	}

	async play() {
		this.sound.play(this.playData);
		this.started = true;
		this.animate();
		return new Promise((resolve) => {
			this.sound.addEventListener("stop", resolve);
			this.sound.addEventListener("end", resolve);
			if (this.totalDuration) {
				setTimeout(() => {
					this.stop();
					resolve();
				}, this.totalDuration);
			}
		})
	}

	animate() {
		if (!this.playSound) return;

		if (this.data.fadeIn) {
			this.fadeIn();
		}

		if (this.data.fadeOut) {
			this.fadeOut();
		}
	}

	stop() {
		this.sound.stop();
	}
}

class SequencerPlacedSound extends SequencerSound {

	constructor(data) {
		super(data);
		if (this.isSourceDestroyed) {
			this.stop();
		}
	}

	get volume_property() {
		return "volume_multiplier";
	}

	get playbackOptions() {
		return {
			...super.playbackOptions,
			delay: this.started ? (this.data?.loopOptions?.loopDelay / 1000) ?? 0 : 0
		}
	}

	update() {
		if (!this.started) return;

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
			if(this.data.panSound) {
				const x = ray.dx / ray.distance;
				const sign = Math.sign(x);
				const a = Math.min(1, Math.abs(x));
				config.pan = sign * Math.pow(a, 1.6)
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

	async play() {
		if (!this.sound.loaded) {
			setTimeout(() => this.play(), 100);
			return;
		}

		this.sound.playAtPosition(this.sourcePosition, this.data.locationOptions?.radius || 1, this.playData);

		if (!this.started) {
			this.animate()
		}

		this.started = true;

		if (this.loops && this.currentLoop < this.loops) {
			this.currentLoop += 1;
			return setTimeout(this.play.bind(this), this.duration);
		}

		return new Promise((resolve) => {
			this.sound.addEventListener("stop", resolve);
			this.sound.addEventListener("end", resolve);
			if (this.totalDuration) {
				setTimeout(() => {
					this.stop();
					resolve();
				}, this.totalDuration);
			}
		})
	}

	animate() {
		canvas.app.ticker.add(this.update, this);

		if (this.data.moveTowards) {
			SequencerAnimationEngine.addAnimation(this.data._id, {
				target: this,
				propertyName: "position.x",
				from: this.sourcePosition.x,
				to: this.targetPosition.x,
				duration: this.totalDuration,
				ease: this.data.moveTowards.ease ?? "linear",
				delay: 0,
				absolute: true
			});

			SequencerAnimationEngine.addAnimation(this.data._id, {
				target: this,
				propertyName: "position.y",
				from: this.sourcePosition.y,
				to: this.targetPosition.y,
				duration: this.totalDuration,
				ease: this.data.moveTowards.ease ?? "linear",
				delay: 0,
				absolute: true
			});
		}

		if (this.playSound) {
			if (this.data.fadeIn) {
				this.fadeIn();
			}

			if (this.data.fadeOut) {
				this.fadeOut();
			}
		}
	}

	stop() {
		canvas.app.ticker.remove(this.update, this);
		if (this.panner) {
			this.panner.disconnect();
		}
		this.sound.stop();
		this.ended = true;
	}
}

class SequencerPersistentSound extends SequencerPlacedSound {

	constructor(data) {
		super(data);
		this.started = false;
		this.creationTimeDelta = this.actualCreationTime - this.data.creationTimestamp;
	}

	get startOffset() {
		let offset = (this.startTime ?? 0);
		if (this.creationTimeDelta > this.soundDuration && !this.started) {
			offset += this.creationTimeDelta % this.duration;
		}
		return offset;
	}

	get loopDuration() {
		if (!this.started) {
			return this.duration - this.startOffset;
		}
		return this.duration;
	}

	async play() {
		if (this.ended) return;

		if (this.currentLoop > this.loops && this.data.loopOptions?.endOnLastLoop) {
			return this.stop(true);
		}

		if (game.audio.locked) {
			setTimeout(() => this.play(), 100);
			return;
		}

		await this.sound.stop();

		await this.sound.playAtPosition(this.sourcePosition, this.data.locationOptions?.radius || 1, this.playData);

		if (!this.sound.gain) {
			setTimeout(() => this.play(), 100);
			return;
		}

		if (!this.started) {
			this.animate();
		}

		setTimeout(this.play.bind(this), this.loopDuration);

		if (this.loops) {
			this.currentLoop += 1;
		}

		this.started = true;
	}

	fadeIn() {
		let fadeInDuration = Math.min(this.data.fadeIn.duration, this.totalDuration)
		if (this.creationTimeDelta <= fadeInDuration) {
			super.fadeIn();
		}
	}

	fadeOut() {
		if (!this.ended) return;
		if (this.data.fadeOut) {
			return super.fadeOut(0);
		}
		return 0;
	}

	addFlags() {
		let uuid = this.context?.uuid;
		if (!uuid) return;
		flagManager.addFlags(uuid, { sounds: this.data });
	}

	stop(removeFlags = false) {
		this.ended = true;
		let endDuration = this.fadeOut();
		if (removeFlags) {
			flagManager.removeFlags(this.context.uuid, { sounds: this.data });
		}
		setTimeout(() => {
			SequenceManager.RunningSounds.delete(this.id);
			super.stop();
		}, endDuration);
	}
}

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
