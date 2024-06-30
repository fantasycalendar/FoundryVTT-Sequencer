import CONSTANTS from "../constants.js";
import filters from "../lib/filters.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { SequencerFileBase } from "../modules/sequencer-file.js";
import SequencerAnimationEngine from "../modules/sequencer-animation-engine.js";
import SequencerFileCache from "../modules/sequencer-file-cache.js";
import flagManager from "../utils/flag-manager.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerEffectManager from "../modules/sequencer-effect-manager.js";
import { SequencerAboveUILayer } from "./effects-layer.js";
import VisionSamplerShader from "../lib/filters/vision-mask-filter.js";
import MaskFilter from "../lib/filters/mask-filter.js";

const hooksManager = {
	_hooks: new Map(),
	_hooksRegistered: new Set(),

	addHook(effectUuid, hookName, callable, callNow = false) {
		if (!this._hooksRegistered.has(hookName)) {
			lib.debug("registering hook for: " + hookName);
			this._hooksRegistered.add(hookName);
			Hooks.on(hookName, (...args) => {
				this._hookCalled(hookName, ...args);
			});
		}

		const key = hookName + "-" + effectUuid;

		if (!this._hooks.has(key)) {
			this._hooks.set(key, []);
		}

		this._hooks.get(key).push(callable);

		if (callNow) {
			setTimeout(() => {
				callable();
			}, 20);
		}
	},

	_hookCalled(hookName, ...args) {
		Array.from(this._hooks)
			.filter((entry) => entry[0].startsWith(hookName + "-"))
			.map((hooks) => hooks[1])
			.deepFlatten()
			.forEach((callback) => callback(...args));
	},

	removeHooks(effectUuid) {
		Array.from(this._hooks)
			.filter((entry) => entry[0].endsWith("-" + effectUuid))
			.forEach((entry) => this._hooks.delete(entry[0]));
	},
};

const SyncGroups = {
	times: new Map(),
	effectIds: new Map(),

	get(effect) {
		const fullName = effect.data.sceneId + "-" + effect.data.syncGroup;
		const effectIds = new Set(this.effectIds.get(fullName));
		if (effectIds && !effectIds.has(effect.id)) {
			effectIds.add(effect.id);
			this.effectIds.set(fullName, Array.from(effectIds));
		}
		return this.times.get(fullName);
	},

	set(effect) {
		const fullName = effect.data.sceneId + "-" + effect.data.syncGroup;
		this.times.set(fullName, effect.data.creationTimestamp);
		this.effectIds.set(fullName, [effect.id]);
	},

	remove(effect) {
		const fullName = effect.data.sceneId + "-" + effect.data.syncGroup;
		const effectIds = new Set(this.effectIds.get(fullName));
		effectIds.delete(effect.id);
		if (effectIds.size) {
			this.effectIds.set(fullName, Array.from(effectIds));
		} else {
			this.effectIds.delete(fullName);
			this.times.delete(fullName);
		}
	}
};

export default class CanvasEffect extends PIXI.Container {
	#elevation = 0;
	#sort = 0;
	#sortLayer = 800

	constructor(inData) {
		super();

		this.sortableChildren = true;

		// Set default values
		this.actualCreationTime = +new Date();
		this.data = inData;

		this._resolve = null;
		this._durationResolve = null;

		this.ready = false;
		this._ended = false;
		this._isEnding = false;
		this._lastDimensions = {};

		this._cachedSourceData = {};
		this._cachedTargetData = {};

		this.uuid = false;

	}

	static get protectedValues() {
		return [
			"_id",
			"sequenceId",
			"creationTimestamp",
			"creatorUserId",
			"moduleName",
			"index",
			"repetition",
			"moves",
			"fadeIn",
			"fadeOut",
			"scaleIn",
			"scaleOut",
			"rotateIn",
			"rotateOut",
			"fadeInAudio",
			"fadeOutAudio",
			"animations",
			"nameOffsetMap",
			"persist",
		];
	}

	/** @type {number} */
	get elevation() {
		return this.#elevation;
	}

	set elevation(value) {
		this.#elevation = value;
	}

	/** @type {number} */
	get sort() {
		return this.#sort;
	}

	set sort(value) {
		this.#sort = value;
	}

	/** @type {number} */
	get sortLayer() {
		return this.#sortLayer;
	}

	set sortLayer(value) {
		this.#sortLayer = value;
	}

	get context() {
		return this.data.attachTo?.active && this.sourceDocument
			? this.sourceDocument
			: game.scenes.get(this.data.sceneId);
	}

	get isIsometricActive() {
		const sceneIsIsometric = foundry.utils.getProperty(
			game.scenes.get(this.data.sceneId),
			CONSTANTS.INTEGRATIONS.ISOMETRIC.SCENE_ENABLED
		);
		return CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE && sceneIsIsometric;
	}

	get creationTimestamp() {
		if (this.data.syncGroup) {
			const time = SyncGroups.get(this);
			if (time) return time;
			SyncGroups.set(this)
		}
		return this.data.creationTimestamp;
	}

	/**
	 * The ID of the effect
	 *
	 * @returns {string}
	 */
	get id() {
		return this.data._id;
	}

	/**
	 * Whether this effect is destroyed or is in the process of being destroyed
	 */
	get isDestroyed() {
		return (
			this.destroyed ||
			(this.source && this.isSourceDestroyed) ||
			(this.target && this.isTargetDestroyed)
		);
	}

	/**
	 * Whether the source of this effect is temporary
	 *
	 * @returns {boolean}
	 */
	get isSourceTemporary() {
		return (
			this.data.attachTo?.active &&
			this.sourceDocument &&
			!lib.is_UUID(this.sourceDocument?.uuid)
		);
	}

	/**
	 * Whether the source of this effect has been destroyed
	 *
	 * @returns {boolean}
	 */
	get isSourceDestroyed() {
		return (
			this.source && this.source?.destroyed && (!this.sourceDocument?.object || this.sourceDocument?.object?.destroyed || this.source.constructor.name === "Crosshairs")
		);
	}

	/**
	 * Whether the target of this effect is temporary
	 *
	 * @returns {boolean}
	 */
	get isTargetTemporary() {
		return (
			(this.data.stretchTo?.attachTo || this.data.rotateTowards?.attachTo) &&
			this.targetDocument &&
			!lib.is_UUID(this.targetDocument.uuid)
		);
	}

	/**
	 * Whether the target of this effect has been destroyed
	 *
	 * @returns {boolean}
	 */
	get isTargetDestroyed() {
		return (
			this.target && this.target?.destroyed && (!this.targetDocument?.object || this.targetDocument?.object?.destroyed || this.target.constructor.name === "Crosshairs")
		);
	}

	/**
	 * The source object (or source location) of the effect
	 *
	 * @returns {boolean|object}
	 */
	get source() {
		if (!this._source && this.data.source) {
			this._source = this._getObjectByID(this.data.source);
			this._source = this._source?._object ?? this._source;
		}
		return this._source;
	}

	/**
	 * Retrieves the source document
	 *
	 * @returns {Document|PlaceableObject}
	 */
	get sourceDocument() {
		return this.source?.document ?? this.source;
	}

	/**
	 * Retrieves the PIXI object for the source object
	 *
	 * @returns {*|PIXI.Sprite|TileHUD<Application.Options>}
	 */
	get sourceMesh() {
		return this.source?.mesh ?? this.source?.template;
	}

	/**
	 * The source position with the relevant offsets calculated
	 *
	 * @returns {{x: number, y: number}}
	 */
	get sourcePosition() {
		let position = this.getSourceData().position;
		let offset = this._getOffset(this.data.source, true);

		return {
			x: position.x - offset.x,
			y: position.y - offset.y,
		};
	}

	/**
	 * The target object (or target location) of the effect
	 *
	 * @returns {boolean|object}
	 */
	get target() {
		if (!this._target && this.data.target) {
			this._target = this._getObjectByID(this.data.target);
			this._target = this._target?._object ?? this._target;
		}
		return this._target;
	}

	/**
	 * Retrieves the document of the target
	 *
	 * @returns {Document|PlaceableObject}
	 */
	get targetDocument() {
		return this.target?.document ?? this.target;
	}

	/**
	 * Retrieves the PIXI object for the target object
	 *
	 * @returns {*|PIXI.Sprite|TileHUD<Application.Options>}
	 */
	get targetMesh() {
		return this.target?.mesh ?? this.target?.template;
	}

	/**
	 * The target position with the relevant offsets calculated
	 *
	 * @returns {{x: number, y: number}}
	 */
	get targetPosition() {
		const position = this.getTargetData().position;
		const offset = this._getOffset(this.data.target);

		return {
			x: position.x - offset.x,
			y: position.y - offset.y,
		};
	}

	/**
	 * Returns this effect's world position
	 *
	 * @returns {{x: number, y: number}}
	 */
	get worldPosition() {
		const t = canvas.stage.worldTransform;
		return {
			x: (this.sprite.worldTransform.tx - t.tx) / canvas.stage.scale.x,
			y: (this.sprite.worldTransform.ty - t.ty) / canvas.stage.scale.y,
		};
	}

	/**
	 * Whether the current user is the owner of this effect
	 *
	 * @returns {boolean}
	 */
	get owner() {
		return this.data.creatorUserId === game.user.id;
	}

	get loopDelay() {
		return (this.data.loopOptions?.loopDelay ?? 0);
	}

	get loops() {
		return (this.data.loopOptions?.loops ?? 0);
	}

	/**
	 * Whether the current user can update this effect
	 *
	 * @returns {boolean}
	 */
	get userCanUpdate() {
		return (
			game.user.isGM ||
			this.owner ||
			(this.data.attachTo?.active &&
				this.sourceDocument.canUserModify(game.user, "update"))
		);
	}

	/**
	 * Whether the current user can delete this effect
	 *
	 * @returns {boolean}
	 */
	get userCanDelete() {
		return this.userCanUpdate || lib.user_can_do("permissions-effect-delete");
	}

	/**
	 * Whether this effect is on the current scene
	 *
	 * @returns {boolean}
	 */
	get onCurrentScene() {
		return this.data.sceneId === game.user.viewedScene;
	}

	/**
	 * Whether this effect should be shown as faded or not - effects created by users for other users should be shown
	 * for all
	 *
	 * @returns {boolean}
	 */
	get shouldShowFadedVersion() {
		// If the user has not set the opacity user-specific effects to 0
		// And it is not an effect that is only played for the user who created the effect
		// And if the effect is going to be played for a subset of users
		// And the users does not contain this user
		return (
			this.data.users &&
			this.data.users.length &&
			!(
				this.data.users.length === 1 &&
				this.data.users.includes(this.data.creatorUserId)
			) &&
			!this.data.users.includes(game.userId)
		);
	}

	/**
	 * Getter for the current playing video of the effect
	 *
	 * @returns {null|*}
	 */
	get video() {
		return this._video;
	}

	/**
	 * Setter for the current playing video of the effect
	 */
	set video(inVideo) {
		if (!inVideo) return;

		inVideo.playbackRate = this.data.playbackRate
			? this.data.playbackRate
			: 1.0;
		inVideo.muted = !this.data.volume;
		inVideo.volume =
			(this.data.volume ?? 0) *
			game.settings.get("core", "globalInterfaceVolume");

		if (!this._video) {
			this._video = inVideo;
			return;
		}

		const isLooping = this._video?.loop;
		const currentTime = this._video.currentTime;

		this._video = inVideo;

		this._video.currentTime = this.playNaturally
			? 0
			: Math.min(currentTime, this._video.duration);
		this._video.loop = isLooping;

		this.updateTexture();
	}

	async playMedia() {
		if (this.animatedSprite) {
			await this.sprite.play();
		} else if (this.video) {
			try {
				await this.video.play().then(() => {
					this.updateTexture();
				});
			} catch (err) {
			}
		}
		this._setupTimestampHook(this.mediaCurrentTime * 1000);
	}

	updateTexture() {
		if (this.texture.valid) {
			this.texture.update();
		}
	}

	async pauseMedia() {
		if (this.animatedSprite) {
			return this.sprite.stop();
		} else if (this.video) {
			return this.video.pause();
		}
	}

	get mediaLooping() {
		if (this.animatedSprite) {
			return this.sprite.loop;
		}
		return this.video?.loop ?? false;
	}

	set mediaLooping(looping) {
		if (this.animatedSprite) {
			this.sprite.loop = looping;
			return;
		}
		if (this.video) {
			this.video.loop = looping;
		}
	}

	get mediaIsPlaying() {
		if (this.animatedSprite) {
			return this.sprite.playing;
		}
		return this.video;
	}

	get mediaCurrentTime() {
		if (this.animatedSprite) {
			return (
				(this.sprite.currentFrame / this.sprite.totalFrames) *
				(this.sprite.totalFrames / 24)
			);
		}
		return this.video?.currentTime ?? null;
	}

	get mediaPlaybackRate() {
		if (this.animatedSprite) {
			return this.sprite.animationSpeed;
		} else if (this.video) {
			return this.video.playbackRate;
		}
	}

	set mediaPlaybackRate(inPlaybackRate) {
		if (this.animatedSprite) {
			this.sprite.animationSpeed = 0.4 * inPlaybackRate;
		} else if (this.video) {
			this.video.playbackRate = inPlaybackRate;
		}
	}

	set mediaCurrentTime(newTime) {
		if (this.animatedSprite) {
			const newFrame = Math.floor(newTime * this.sprite.totalFrames);
			const clampedFrame = Math.max(
				0,
				Math.min(newFrame, this.sprite.totalFrames)
			);
			if (this.mediaIsPlaying) {
				this.sprite.gotoAndPlay(clampedFrame);
			} else {
				this.sprite.gotoAndStop(clampedFrame);
			}
		} else if (this.video) {
			this.video.currentTime = newTime;
		}
	}

	get mediaDuration() {
		if (this.animatedSprite) {
			return (
				this.sprite.totalFrames /
				this.sprite.animationSpeed /
				PIXI.Ticker.shared.FPS
			);
		} else if (this.video) {
			return this.video?.duration / this.mediaPlaybackRate;
		}
		return 1;
	}

	get hasAnimatedMedia() {
		return !!(this.video || this.animatedSprite);
	}

	/**
	 * The template of the effect, determining the effect's internal grid size, and start/end padding
	 *
	 * @returns {object}
	 */
	get template() {
		return foundry.utils.mergeObject(
			{
				gridSize: 100,
				startPoint: 0,
				endPoint: 0,
			},
			this._template ?? {}
		);
	}

	/**
	 * The grid size difference between the internal effect's grid vs the grid on the canvas. If the effect is in screen space, we ignore this.
	 *
	 * @returns {number}
	 */
	get gridSizeDifference() {
		return canvas.grid.size / this.template.gridSize;
	}

	/**
	 * Whether the effect should be flipped on any given axis
	 *
	 * @returns {number}
	 */
	get flipX() {
		return this.data.flipX ? -1 : 1;
	}

	get flipY() {
		return this.data.flipY ? -1 : 1;
	}

	/**
	 * Whether this effect should play at all, depending on a multitude of factors
	 *
	 * @returns {boolean}
	 */
	get shouldPlay() {
		return (
			(game.user.viewedScene === this.data.sceneId ||
				this.data.creatorUserId === game.userId) &&
			(game.user.isGM ||
				!this.data.users ||
				this.data.users.length === 0 ||
				this.data.users.includes(game.userId))
		);
	}

	get shouldPlayVisible() {
		let playVisible =
			this.shouldPlay &&
			game.settings.get("sequencer", "effectsEnabled") &&
			game.user.viewedScene === this.data.sceneId;

		if (game.settings.get("core", "photosensitiveMode")) {
			playVisible = false;
			lib.throttled_custom_warning(
				this.data.moduleName,
				"Photosensitive Mode is turned on, so Sequencer's visual effects aren't being rendered"
			);
		}

		return playVisible;
	}

	/**
	 * Whether this effect should play naturally, or be constrained to a subsection of the video
	 *
	 * @returns {boolean}
	 */
	get playNaturally() {
		return (
			(!this.data.time || (this._startTime === 0 && this._endTime === this.mediaDuration)) &&
			this._animationTimes.loopStart === undefined &&
			this._animationTimes.loopEnd === undefined
		);
	}

	static make(inData) {
		return !inData.persist
			? new CanvasEffect(inData)
			: new PersistentCanvasEffect(inData);
	}

	static checkValid(effectData) {
		if (effectData.delete) {
			return false;
		}
		let sourceExists = true;
		let targetExists = true;
		if (effectData.source && lib.is_UUID(effectData.source)) {
			sourceExists = fromUuidSync(effectData.source);
		}
		if (effectData.target && lib.is_UUID(effectData.target)) {
			targetExists = fromUuidSync(effectData.target);
		}
		for (let tiedDocumentUuid of effectData?.tiedDocuments ?? []) {
			if (tiedDocumentUuid && lib.is_UUID(tiedDocumentUuid)) {
				let tiedDocumentExists = fromUuidSync(tiedDocumentUuid);
				if (!tiedDocumentExists) return false;
			}
		}
		if (
			effectData.source &&
			lib.is_UUID(effectData.source) &&
			effectData.target &&
			lib.is_UUID(effectData.target)
		) {
			const sourceScene = effectData.source.split(".")[1];
			const targetScene = effectData.target.split(".")[1];
			if (sourceScene !== targetScene || sourceScene !== effectData.sceneId)
				return false;
		}
		return sourceExists && targetExists;
	}

	/**
	 * Validates that the update contains the appropriate data
	 *
	 * @param inUpdates
	 */
	static validateUpdate(inUpdates) {
		const updateKeys = Object.keys(inUpdates);
		const protectedValues = updateKeys.filter((key) =>
			CanvasEffect.protectedValues.includes(key)
		);
		if (protectedValues.length) {
			throw lib.custom_error(
				"Sequencer",
				`CanvasEffect | update | You cannot update the following keys of an effect's data: ${protectedValues.join(
					"\n - "
				)}`
			);
		}
		if (updateKeys.includes("source")) {
			if (
				!(
					lib.is_UUID(inUpdates.source) ||
					canvaslib.is_object_canvas_data(inUpdates.source)
				)
			) {
				throw lib.custom_error(
					"Sequencer",
					`CanvasEffect | update | source must be of type document UUID or object with X and Y coordinates`
				);
			}
		}
		if (updateKeys.includes("target")) {
			if (
				!(
					lib.is_UUID(inUpdates.target) ||
					canvaslib.is_object_canvas_data(inUpdates.target)
				)
			) {
				throw lib.custom_error(
					"Sequencer",
					`CanvasEffect | update | target must be of type document UUID or object with X and Y coordinates`
				);
			}
		}
	}

	getHook(type, uuid) {
		if (!lib.is_UUID(uuid)) return false;
		const parts = uuid.split(".");
		return type + parts[parts.length - 2];
	}

	/**
	 * Gets the source hook name
	 *
	 * @param {string} type
	 * @returns {string|boolean}
	 */
	getSourceHook(type = "") {
		return this.getHook(type, this.data.source);
	}

	/**
	 * The source object's current position, or its current position
	 *
	 * @returns {boolean|object}
	 */
	getSourceData() {
		if (this.data.temporary && !this.owner) {
			return SequencerEffectManager.getPositionForUUID(this.data.source);
		}

		const position =
			this.source instanceof PlaceableObject && !this.isSourceTemporary
				? canvaslib.get_object_position(this.source)
				: this.source?.worldPosition || this.source?.center || this.source;

		const { width, height } = canvaslib.get_object_dimensions(this.source);

		if (this.isIsometricActive && this.source instanceof PlaceableObject) {
			position.x +=
				((this.sourceDocument.elevation ?? 0) / canvas.scene.grid.distance) *
				canvas.grid.size;
			position.y -=
				((this.sourceDocument.elevation ?? 0) / canvas.scene.grid.distance) *
				canvas.grid.size;
			if (
				this.data.isometric?.overlay ||
				this.target instanceof PlaceableObject
			) {
				position.x += (this.source?.height ?? height) / 2;
				position.y -= (this.source?.height ?? height) / 2;
			}
		}

		if (position !== undefined) {
			this._cachedSourceData.position = position;
		}

		if (width !== undefined && height !== undefined) {
			this._cachedSourceData.width = width;
			this._cachedSourceData.height = height;
		}

		let rotation = 0;
		if (
			this.source instanceof MeasuredTemplate &&
			this.sourceDocument?.t !== "rect"
		) {
			rotation = Math.normalizeRadians(
				Math.toRadians(this.sourceDocument?.direction)
			);
		} else if (!(this.source instanceof MeasuredTemplate)) {
			rotation = this.sourceDocument?.rotation
				? Math.normalizeRadians(Math.toRadians(this.sourceDocument?.rotation))
				: 0;
		}

		if (rotation !== undefined) {
			this._cachedSourceData.rotation = rotation;
		}

		const alpha =
			this.sourceDocument instanceof TokenDocument ||
			this.sourceDocument instanceof TileDocument
				? this.sourceDocument?.alpha ?? 1.0
				: 1.0;

		if (alpha !== undefined) {
			this._cachedSourceData.alpha = alpha;
		}

		return {
			...this._cachedSourceData,
		};
	}

	/**
	 * Gets the target hook name
	 *
	 * @param {string} type
	 * @returns {string|boolean}
	 */
	getTargetHook(type = "") {
		return this.getHook(type, this.data.target);
	}

	/**
	 * The target object's current position, or its current position
	 *
	 * @returns {boolean|object}
	 */
	getTargetData() {
		if (this.data.temporary && !this.owner) {
			return (
				SequencerEffectManager.getPositionForUUID(this.data.target) ??
				this.getSourceData()
			);
		}

		const position =
			this.target instanceof PlaceableObject && !this.isTargetTemporary
				? canvaslib.get_object_position(this.target, { measure: true })
				: this.target?.worldPosition || this.target?.center || this.target;

		const { width, height } = canvaslib.get_object_dimensions(this.target);

		if (this.isIsometricActive && this.target instanceof PlaceableObject) {
			const targetHeight = this.target?.height ?? height;
			position.x +=
				((this.targetDocument.elevation ?? 0) / canvas.scene.grid.distance) *
				canvas.grid.size +
				targetHeight;
			position.y -=
				((this.targetDocument.elevation ?? 0) / canvas.scene.grid.distance) *
				canvas.grid.size +
				targetHeight;
		}

		if (width !== undefined && height !== undefined) {
			this._cachedTargetData.width = width;
			this._cachedTargetData.height = height;
		}

		if (position !== undefined) {
			this._cachedTargetData.position = position;
		}

		let rotation = 0;
		if (
			this.target instanceof MeasuredTemplate &&
			this.targetDocument?.t !== "rect"
		) {
			rotation = Math.normalizeRadians(
				Math.toRadians(this.targetDocument?.direction)
			);
		} else if (!(this.target instanceof MeasuredTemplate)) {
			rotation = this.targetDocument?.rotation
				? Math.normalizeRadians(Math.toRadians(this.targetDocument?.rotation))
				: 0;
		}

		if (rotation !== undefined) {
			this._cachedTargetData.rotation = rotation;
		}

		const alpha =
			this.targetDocument instanceof TokenDocument ||
			this.targetDocument instanceof TileDocument
				? this.targetDocument?.alpha ?? 1.0
				: 1.0;

		if (alpha !== undefined) {
			this._cachedTargetData.alpha = alpha;
		}

		return {
			...this._cachedTargetData,
		};
	}

	/**
	 * Calculates the offset for a given offset property and name mapping
	 *
	 * @param {string} offsetMapName
	 * @param {boolean} source
	 * @returns {{x: number, y: number}|*}
	 * @private
	 */
	_getOffset(offsetMapName, source = false) {
		const key = source ? "source" : "target";

		const offset = {
			x: 0,
			y: 0,
		};

		let twister = this._twister;

		let nameOffsetMap = this._nameOffsetMap?.[this.data.name];

		if (nameOffsetMap) {
			twister = nameOffsetMap.twister;
		}

		// If the effect is missing, and it's not the source we're offsetting OR it is the source, but we don't have a target (it's playing on the spot)
		if (this.data.missed && (!source || !this.data.target)) {
			let missedOffset =
				this._offsetCache[key]?.missedOffset ||
				canvaslib.calculate_missed_position(this.source, this.target, twister);
			this._offsetCache[key].missedOffset = missedOffset;
			offset.x -= missedOffset.x;
			offset.y -= missedOffset.y;
		}

		const obj = source ? this.source : this.target;
		const multiplier = source
			? this.data.randomOffset?.source
			: this.data.randomOffset?.target;

		if (obj && multiplier) {
			let randomOffset =
				this._offsetCache[key]?.randomOffset ||
				canvaslib.get_random_offset(obj, multiplier, twister);
			this._offsetCache[key].randomOffset = randomOffset;
			offset.x -= randomOffset.x;
			offset.y -= randomOffset.y;
		}

		let extraOffset = this.data?.offset?.[key];
		if (extraOffset) {
			let newOffset = {
				x: extraOffset.x,
				y: extraOffset.y,
			};
			if (extraOffset.gridUnits) {
				newOffset.x *= canvas.grid.size;
				newOffset.y *= canvas.grid.size;
			}
			if (extraOffset.local) {
				if (
					!this._cachedSourceData?.position ||
					!this._cachedTargetData?.position
				) {
					this.getSourceData();
					this.getTargetData();
				}

				const startPos = this._cachedSourceData.position;
				const endPos = this._cachedTargetData.position;

				const angle = this.target
					? new Ray(startPos, endPos).angle
					: Ray.fromAngle(
						startPos.x,
						startPos.y,
						this._cachedSourceData.rotation,
						1
					).angle;

				newOffset = canvaslib.rotateAroundPoint(
					0,
					0,
					newOffset.x,
					newOffset.y,
					-angle
				);
			}
			offset.x -= newOffset.x;
			offset.y -= newOffset.y;
		}

		let offsetMap = this._nameOffsetMap?.[offsetMapName];

		if (!this._offsetCache[key]["nameCache"][offsetMapName]) {
			this._offsetCache[key]["nameCache"][offsetMapName] = {};
		}

		if (offsetMap) {
			if (offsetMap.missed) {
				const missedOffset =
					this._offsetCache[key]["nameCache"][offsetMapName]?.missedOffset ||
					canvaslib.calculate_missed_position(
						offsetMap.sourceObj,
						offsetMap.targetObj,
						offsetMap.twister
					);
				this._offsetCache[key]["nameCache"][offsetMapName].missedOffset =
					missedOffset;
				offset.x -= missedOffset.x;
				offset.y -= missedOffset.y;
			}

			const obj = offsetMap.targetObj || offsetMap.sourceObj;
			const multiplier =
				offsetMap.randomOffset?.source || offsetMap.randomOffset?.target;

			if (obj && multiplier) {
				let randomOffset =
					this._offsetCache[key]["nameCache"][offsetMapName]?.randomOffset ||
					canvaslib.get_random_offset(obj, multiplier, offsetMap.twister);
				this._offsetCache[key]["nameCache"][offsetMapName].randomOffset =
					randomOffset;
				offset.x -= randomOffset.x;
				offset.y -= randomOffset.y;
			}

			if (offsetMap.offset) {
				offset.x += offsetMap.offset.x;
				offset.y += offsetMap.offset.y;
			}
		}

		return offset;
	}

	/**
	 * Initializes the name offset map by establishing targets
	 *
	 * @param inOffsetMap
	 * @returns {{setup}|*}
	 * @private
	 */
	_setupOffsetMap(inOffsetMap) {
		if (!inOffsetMap.setup) {
			inOffsetMap.setup = true;
			inOffsetMap.sourceObj = inOffsetMap.source
				? this._validateObject(inOffsetMap.source)
				: false;
			inOffsetMap.targetObj = inOffsetMap.target
				? this._validateObject(inOffsetMap.target)
				: false;
			const repetition = this.data.repetition % inOffsetMap.repetitions;
			const seed = lib.get_hash(`${inOffsetMap.seed}-${repetition}`);
			inOffsetMap.twister = lib.createMersenneTwister(seed);
		}

		return inOffsetMap;
	}

	/**
	 * Plays the effect, returning two promises; one that resolves once the duration has been established, and another
	 * when the effect has finished playing
	 *
	 * @returns {Object}
	 */
	play() {
		const durationPromise = new Promise((resolve, reject) => {
			this._durationResolve = resolve;
		});

		const finishPromise = new Promise(async (resolve, reject) => {
			this._resolve = resolve;
			Hooks.callAll("createSequencerEffect", this);
			lib.debug(`Playing effect:`, this.data);
			this._initialize();
		});

		return {
			duration: durationPromise,
			promise: finishPromise,
		};
	}

	/**
	 *  Ends the effect
	 */
	endEffect() {
		if (this._ended) return;
		Hooks.callAll("endedSequencerEffect", this);
		this.destroy();
	}

	destroy(...args) {
		this._destroyDependencies();
		return super.destroy(...args);
	}

	/**
	 * Updates this effect with the given parameters
	 * @param inUpdates
	 * @returns {Promise}
	 */
	async update(inUpdates) {
		if (!this.userCanUpdate)
			throw lib.custom_error(
				"Sequencer",
				"CanvasEffect | Update | You do not have permission to update this effect"
			);
		CanvasEffect.validateUpdate(inUpdates);

		const newData = foundry.utils.deepClone(this.data);
		const updateKeys = Object.keys(inUpdates);

		updateKeys.forEach((key) => {
			foundry.utils.setProperty(newData, key, inUpdates[key]);
		});

		if (
			Object.keys(foundry.utils.diffObject(newData, this.data)).length === 0
		) {
			lib.debug(
				`Skipped updating effect with ID ${this.id} - no changes needed`
			);
			return;
		}

		if (this.data.persist) {
			const originalSourceUUID =
				lib.is_UUID(this.data.source) && this.data.attachTo
					? this.data.source
					: "Scene." + this.data.sceneId;

			const newSourceUUID =
				lib.is_UUID(newData.source) && newData.attachTo
					? newData.source
					: "Scene." + newData.sceneId;

			if (originalSourceUUID !== newSourceUUID) {
				flagManager.removeEffectFlags(originalSourceUUID, newData);
			}

			flagManager.addEffectFlags(newSourceUUID, newData);
		}

		lib.debug(`Updated effect with ID ${this.id}`);

		return sequencerSocket.executeForEveryone(
			SOCKET_HANDLERS.UPDATE_EFFECT,
			this.id,
			newData
		);
	}

	async addAnimatedProperties({ animations = [], loopingAnimation = [] } = {}) {
		const animationsToAdd = [];
		if (!Array.isArray(animations)) {
			throw lib.custom_error(
				this.data.moduleName,
				`animations must be an array of arrays`
			);
		}
		for (const animationData of animations) {
			if (!Array.isArray(animationData)) {
				throw lib.custom_error(
					this.data.moduleName,
					`each entry in animations must be an array, each with target, property name, and animation options`
				);
			}
			const result = canvaslib.validateAnimation(...animationData);
			if (typeof result === "string") {
				throw lib.custom_error(this.data.moduleName, result);
			}
			result.creationTimestamp = +new Date();
			animationsToAdd.push(result);
		}
		if (!Array.isArray(loopingAnimation)) {
			throw lib.custom_error(
				this.data.moduleName,
				`loopingAnimation must be an array of arrays`
			);
		}
		for (const animationData of loopingAnimation) {
			if (!Array.isArray(animationData)) {
				throw lib.custom_error(
					this.data.moduleName,
					`each entry in loopingAnimation must be an array, each with target, property name, and animation options`
				);
			}
			const result = canvaslib.validateLoopingAnimation(...animationData);
			if (typeof result === "string") {
				throw lib.custom_error(this.data.moduleName, result);
			}
			result.creationTimestamp = +new Date();
			animationsToAdd.push(result);
		}

		if (this.data.persist) {
			const originalSourceUUID =
				lib.is_UUID(this.data.source) && this.data.attachTo
					? this.data.source
					: "Scene." + this.data.sceneId;
			const newData = foundry.utils.deepClone(this.data);
			newData.animations = (newData.animations ?? []).concat(
				foundry.utils.deepClone(animationsToAdd)
			);
			flagManager.addEffectFlags(originalSourceUUID, newData);
		}

		return sequencerSocket.executeForEveryone(
			SOCKET_HANDLERS.ADD_EFFECT_ANIMATIONS,
			this.id,
			animationsToAdd
		);
	}

	async _addAnimations(inAnimations) {
		this._playAnimations(inAnimations);
		this.data.animations = (this.data.animations ?? []).concat(inAnimations);
	}

	/**
	 * Updates the effect
	 *
	 * @param inUpdates
	 * @returns {Promise}
	 * @private
	 */
	_update(inUpdates) {
		this.data = inUpdates;
		Hooks.callAll("updateSequencerEffect", this);
		this._destroyDependencies();
		return this._reinitialize();
	}

	/**
	 * Determines whether a position is within the bounds of this effect
	 *
	 * @param inPosition
	 * @returns {boolean}
	 */
	isPositionWithinBounds(inPosition) {
		if (!this.spriteContainer) return false;
		return canvaslib.is_position_within_bounds(
			inPosition,
			this.spriteContainer,
			this.parent
		);
	}

	/**
	 * Initializes the effect and places it on the canvas
	 *
	 * @param {boolean} play
	 * @returns {Promise}
	 * @private
	 */
	async _initialize(play = true) {
		this.ready = false;
		this._initializeVariables();
		await this._contextLostCallback();
		await this._loadTexture();
		this._addToContainer();
		this._createSprite();
		this._calculateDuration();
		this._createShapes();
		await this._setupMasks();
		await this._transformSprite();
		this._playPresetAnimations();
		this._playCustomAnimations();
		this._setEndTimeout();
		this._timeoutVisibility();
		if (play) await this._startEffect();
		this.ready = true;
	}

	/**
	 * Reinitializes the effect after it has been updated
	 *
	 * @param play
	 * @returns {Promise}
	 * @private
	 */
	async _reinitialize(play = true) {
		this.renderable = false;
		if (!this.shouldPlay) {
			return Sequencer.EffectManager._removeEffect(this);
		}
		this.actualCreationTime = +new Date();
		return this._initialize(play);
	}

	/**
	 * Initializes variables core to the function of the effect
	 * This is run as a part of the construction of the effect
	 *
	 * @private
	 */
	_initializeVariables() {
		// Responsible for rotating the sprite
		this.rotationContainer = this.addChild(new PIXI.Container());
		this.rotationContainer.id = this.id + "-rotationContainer";

		this.isometricContainer = this.rotationContainer.addChild(
			new PIXI.Container()
		);
		this.isometricContainer.id = this.id + "-isometricContainer";

		// An offset container for the sprite
		this.spriteContainer = this.isometricContainer.addChild(
			new PIXI.Container()
		);
		this.spriteContainer.id = this.id + "-spriteContainer";

		this._template = this.data.template;
		this._ended = null;
		this._maskContainer = null;
		this._maskSprite = null;
		this._file = null;
		this._loopOffset = 0;
		this.effectFilters = {};
		this._animationDuration = 0;
		this._animationTimes = {};
		this._twister = lib.createMersenneTwister(this.creationTimestamp);
		this._video = null;
		this._distanceCache = null;
		this._isRangeFind = false;
		this._customAngle = 0;
		this._currentFilePath = this.data.file;
		this._relatedSprites = {};
		this._hooks = [];

		if (this._resetTimeout) {
			clearTimeout(this._resetTimeout);
		}
		this._resetTimeout = null;

		this._source = false;
		this._target = false;
		this._offsetCache = {
			source: { nameCache: {} },
			target: { nameCache: {} },
		};

		this._nameOffsetMap = Object.fromEntries(
			Object.entries(
				foundry.utils.deepClone(this.data.nameOffsetMap ?? {})
			).map((entry) => {
				return [entry[0], this._setupOffsetMap(entry[1])];
			})
		);

		this.uuid = !lib.is_UUID(this.context.uuid)
			? this.id
			: this.context.uuid + ".data.flags.sequencer.effects." + this.id;

		this._ticker = CanvasAnimation.ticker;
		this._tickerMethods = [];
	}

	_addToTicker(func) {
		this._tickerMethods.push(func);
		this._ticker.add(func, this);
	}

	/**
	 * Destroys all dependencies to this element, such as tickers, animations, textures, and child elements
	 *
	 * @private
	 */
	_destroyDependencies() {
		if (this._ended) return;
		this._ended = true;

		this.mask = null;

		hooksManager.removeHooks(this.uuid);

		this._tickerMethods.forEach(func => this._ticker.remove(func, this));
		this._ticker = null;

		Object.values(this._relatedSprites).forEach((sprite) =>
			sprite.destroy({ children: true })
		);

		SequencerAnimationEngine.endAnimations(this.id);

		if (this._maskContainer) this._maskContainer.destroy({ children: true });
		if (this._maskSprite) {
			try {
				this._maskSprite.texture.destroy(true);
				this._maskSprite.destroy();
			} catch (err) {
			}
		}

		if (this._file instanceof SequencerFileBase) {
			this._file.destroy();
		}

		if (this.video) {
			try {
				this.video.removeAttribute("src");
				this.video.pause();
				this.video.load();
			} catch (err) {
			}
		}

		try {
			if (this.data.screenSpace) {
				SequencerAboveUILayer.removeContainerByEffect(this);
			}
		} catch (err) {
		}

		if (this.data.syncGroup) {
			SyncGroups.remove(this);
		}

		this.removeChildren().forEach((child) => child.destroy({ children: true }));
	}

	/**
	 * Plays preset animations
	 *
	 * @private
	 */
	_playPresetAnimations() {
		this._moveTowards();

		this._fadeIn();
		this._fadeInAudio();
		this._scaleIn();
		this._rotateIn();

		this._fadeOut();
		this._fadeOutAudio();
		this._scaleOut();
		this._rotateOut();
	}

	/**
	 * Gets an object based on an identifier, checking if it exists within the named offset map, whether it's a
	 * coordinate object, or if it's an UUID that needs to be fetched from the scene
	 *
	 * @param inIdentifier
	 * @returns {*}
	 * @private
	 */
	_getObjectByID(inIdentifier) {
		let source = inIdentifier;
		let offsetMap = this._nameOffsetMap?.[inIdentifier];
		if (offsetMap) {
			source = offsetMap?.targetObj || offsetMap?.sourceObj || source;
		} else {
			source = this._validateObject(source);
		}
		return source;
	}

	/**
	 * Validates the given parameter, whether it's a UUID or a coordinate object, and returns the proper one
	 *
	 * @param inObject
	 * @returns {*}
	 * @private
	 */
	_validateObject(inObject) {
		if (lib.is_UUID(inObject) || !canvaslib.is_object_canvas_data(inObject)) {
			inObject = lib.get_object_from_scene(inObject, this.data.sceneId);
			inObject = inObject?._object ?? inObject;
		}
		return inObject;
	}

	/**
	 * Adds this effect to the appropriate container on the right layer
	 *
	 * @private
	 */
	_addToContainer() {
		let layer;
		if (this.data.screenSpaceAboveUI) {
			layer = SequencerAboveUILayer;
		} else if (this.data.screenSpace) {
			layer = canvas.sequencerEffectsUILayer;
		} else if (this.data.aboveInterface) {
			layer = canvas.controls;
		} else if (this.data.aboveLighting) {
			layer = canvas.interface;
		} else {
			layer = canvas.primary;
		}

		layer.addChild(this);
		layer.sortChildren();
	}

	/**
	 * Loads the texture for this effect, handling cases where it's a simple path or a database path
	 *
	 * @private
	 */
	async _loadTexture() {
		if (this.data.file === "") {
			return;
		}

		if (this.data.customRange) {
			this._file = SequencerFileBase.make(
				this.data.file,
				Object.values(this.template),
				"temporary.range.file"
			);
		} else {
			if (!Sequencer.Database.entryExists(this.data.file)) {
				let texture = await SequencerFileCache.loadFile(this.data.file);
				this.video = this.data.file.toLowerCase().endsWith(".webm")
					? texture?.baseTexture?.resource?.source ?? false
					: false;
				this.texture = texture;
				this._file = texture;
				this._currentFilePath = this.data.file;
				return;
			}

			this._file = Sequencer.Database.getEntry(this.data.file).clone();
		}

		this._file.fileIndex = this.data.forcedIndex;
		this._file.twister = this._twister;

		this._isRangeFind = this._file?.rangeFind;

		this.spriteSheet = false;
		if (this.data.stretchTo) {
			let ray = new Ray(this.sourcePosition, this.targetPosition);
			this._rotateTowards(ray);
			ray = new Ray(this.sourcePosition, this.targetPosition);
			let { filePath, texture, sheet } = await this._getTextureForDistance(
				ray.distance
			);
			this._currentFilePath = filePath;
			this.texture = texture;
			this.spriteSheet = sheet;
		} else if (
			!this._isRangeFind ||
			(this._isRangeFind && !this.data.stretchTo)
		) {
			const { filePath, texture, sheet } = await this._file.getTexture();
			this._currentFilePath = filePath;
			this.texture = texture;
			this.spriteSheet = sheet;
		}

		if (this._isRangeFind && this.data.stretchTo && this.data.attachTo?.active) {
			let spriteType = this.data.tilingTexture ? PIXI.TilingSprite : SpriteMesh;
			this._relatedSprites[this._currentFilePath] = new spriteType(
				this.texture,
				this.data.xray ? null : VisionSamplerShader
			);
			if (this.data.tint) {
				this._relatedSprites[this._currentFilePath].tint = this.data.tint;
			}

			new Promise(async (resolve) => {
				for (let filePath of this._file.getAllFiles()) {
					if (filePath === this._currentFilePath) continue;

					let texture = await this._file._getTexture(filePath);
					let spriteType = this.data.tilingTexture
						? PIXI.TilingSprite
						: SpriteMesh;
					let sprite = new spriteType(
						texture,
						this.data.xray ? null : VisionSamplerShader
					);
					sprite.renderable = false;
					this._relatedSprites[filePath] = sprite;
				}

				resolve();
			});
		}

		this._template = this._file.template ?? this._template;
		this.video = this._currentFilePath.toLowerCase().endsWith(".webm")
			? this.texture?.baseTexture?.resource?.source
			: false;
	}

	get startTimeMs(){
		return this._startTime * 1000;
	}

	get endTimeMs(){
		return this._endTime * 1000;
	}

	/**
	 * Calculates the duration of this effect, based on animation durations, the video source duration, end/start times, etc
	 *
	 * @private
	 */
	_calculateDuration() {
		let playbackRate = this.data.playbackRate ? this.data.playbackRate : 1.0;

		this.mediaPlaybackRate = playbackRate;

		this._animationDuration = this.data.duration || this.mediaDuration * 1000;

		// If the effect moves, then infer the duration from the distance divided by the speed
		if (this.data.moveSpeed && this.data.moves) {
			let distance = canvaslib.distance_between(
				this.sourcePosition,
				this.targetPosition
			);
			let durationFromSpeed = (distance / this.data.moveSpeed) * 1000;
			this._animationDuration = Math.max(durationFromSpeed, this.data.duration);
		} else if (!this.data.duration && !this.hasAnimatedMedia) {
			// Determine static image duration
			let fadeDuration =
				(this.data.fadeIn?.duration ?? 0) + (this.data.fadeOut?.duration ?? 0);
			let scaleDuration =
				(this.data.scaleIn?.duration ?? 0) +
				(this.data.scaleOut?.duration ?? 0);
			let rotateDuration =
				(this.data.rotateIn?.duration ?? 0) +
				(this.data.rotateOut?.duration ?? 0);
			let moveDuration = 0;
			if (this.data.moves) {
				let distance = canvaslib.distance_between(
					this.sourcePosition,
					this.targetPosition
				);
				moveDuration =
					(this.data.moveSpeed
						? (distance / this.data.moveSpeed) * 1000
						: 1000) + this.data.moves.delay;
			}

			let animationDurations = this.data.animations
				? Math.max(
					...this.data.animations.map((animation) => {
						if (animation.looping) {
							if (animation.loops === 0) return 0;
							return (
								(animation?.duration ?? 0) * (animation?.loops ?? 0) +
								(animation?.delay ?? 0)
							);
						} else {
							return (animation?.duration ?? 0) + (animation?.delay ?? 0);
						}
					})
				)
				: 0;

			this._animationDuration = Math.max(
				fadeDuration,
				scaleDuration,
				rotateDuration,
				moveDuration,
				animationDurations
			);

			this._animationDuration = this._animationDuration || 1000;
		}

		// Clamp effect duration to start time and end time
		this._startTime = 0;
		if (this.data.time?.start && this.mediaCurrentTime !== null) {
			let currentTime = !this.data.time.start.isPerc
				? this.data.time.start.value ?? 0
				: this._animationDuration * this.data.time.start.value;
			this.mediaCurrentTime = currentTime / 1000;
			this._startTime = currentTime / 1000;
		}

		this._endTime = this._animationDuration;
		if (this.data.time?.end) {
			if (this.data.time.end.isPerc) {
				this._endTime = this._animationDuration * this.data.time.end.value;
			} else {
				this._endTime = this.data.time.isRange
					? this.data.time.end.value
					: this._animationDuration - this.data.time.end.value;
			}
		}
		this._endTime /= 1000;

		this._animationDuration = lib.clamp(this.endTimeMs - this.startTimeMs, 0, this._animationDuration);

		if (
			this._file?.markers &&
			this._startTime === 0 &&
			this._endTime === this.mediaDuration
		) {
			this._animationTimes.loopStart =
				this._file.markers.loop.start / playbackRate / 1000;
			this._animationTimes.loopEnd =
				this._file.markers.loop.end / playbackRate / 1000;
			this._animationTimes.forcedEnd =
				this._file.markers.forcedEnd / playbackRate / 1000;
		}

		this._totalDuration = this.loops
			? (this._animationDuration * this.loops) + (this.loopDelay * (this.loops - 1))
			: this._animationDuration;

		// Resolve duration promise so that owner of effect may know when it is finished
		this._durationResolve(this._totalDuration);

	}

	/**
	 * If this effect is animatable, hold off on rendering it for a bit so that the animations have time to initialize to
	 * prevent it from spawning and then jumping to the right place
	 *
	 * @private
	 */
	_timeoutVisibility() {
		setTimeout(
			() => {
				this._setupHooks();
			},
			this.data.animations ? 50 : 0
		);
	}

	/**
	 * If this effect is attached to an object, check whether the object has been destroyed, if so, end the effect
	 *
	 * @private
	 */
	_contextLostCallback() {
		if (this.isSourceTemporary) {
			this._addToTicker(this._checkSourceDestroyed);
		}
		if (this.isTargetTemporary) {
			this._addToTicker(this._checkTargetDestroyed);
		}
	}

	_checkSourceDestroyed() {
		if (this.isSourceDestroyed) {
			this._source = this.sourcePosition;
			SequencerEffectManager.endEffects({ effects: this });
		}
	}

	_checkTargetDestroyed() {
		if (this.isTargetDestroyed) {
			this._source = this.targetPosition;
			SequencerEffectManager.endEffects({ effects: this });
		}
	}


	/**
	 * Creates the sprite, and the relevant containers that manage the position and offsets of the overall visual look of the sprite
	 *
	 * @private
	 */
	_createSprite() {
		this.renderable = false;

		const args = [this.spriteSheet ? this.spriteSheet : PIXI.Texture.EMPTY];
		if (
			!this.data.xray &&
			!this.spriteSheet &&
			!this.data.screenSpace &&
			!this.data.screenSpaceAboveUI
		) {
			args.push(VisionSamplerShader);
		}

		const spriteType = this.spriteSheet ? PIXI.AnimatedSprite : SpriteMesh;
		const sprite = new spriteType(...args);
		this.sprite = this.spriteContainer.addChild(sprite);
		this.sprite.id = this.id + "-sprite";

		Object.values(this._relatedSprites).forEach((sprite) => {
			if (this.data.tint) {
				sprite.tint = this.data.tint;
			}
			this.sprite.addChild(sprite);
		});

		this.animatedSprite = false;
		if (this.spriteSheet) {
			this.animatedSprite = true;
			this.sprite.animationSpeed = 0.4;
			this.sprite.loop = false;
		}

		let textSprite;

		if (this.data.text) {
			const text = this.data.text.text;
			const fontSettings = foundry.utils.deepClone(this.data.text);
			fontSettings.fontSize =
				(fontSettings?.fontSize ?? 26) * (150 / canvas.grid.size);

			textSprite = new PIXI.Text(text, fontSettings);
			textSprite.resolution = 5;
			textSprite.zIndex = 1;

			textSprite.anchor.set(
				this.data.text?.anchor?.x ?? 0.5,
				this.data.text?.anchor?.y ?? 0.5
			);
		}

		this.sprite.filters = [];

		if (this.data.filters) {
			for (let index = 0; index < this.data.filters.length; index++) {
				const filterData = this.data.filters[index];
				const filter = new filters[filterData.className](filterData.data);
				filter.id =
					this.id + "-" + filterData.className + "-" + index.toString();
				this.sprite.filters.push(filter);
				const filterKeyName = filterData.name || filterData.className;
				this.effectFilters[filterKeyName] = filter;
			}
		}

		this.alphaFilter = new PIXI.filters.AlphaFilter(this.data.opacity);
		this.alphaFilter.id = this.id + "-alphaFilter";
		this.sprite.filters.push(this.alphaFilter);

		let spriteOffsetX = this.data.spriteOffset?.x ?? 0;
		let spriteOffsetY = this.data.spriteOffset?.y ?? 0;
		if (this.data.spriteOffset?.gridUnits) {
			spriteOffsetX *= canvas.grid.size;
			spriteOffsetY *= canvas.grid.size;
		}

		this.sprite.position.set(spriteOffsetX, spriteOffsetY);

		this.sprite.anchor.set(
			this.data.spriteAnchor?.x ?? 0.5,
			this.data.spriteAnchor?.y ?? 0.5
		);

		let spriteRotation = this.data.spriteRotation ?? 0;
		if (this.data.randomSpriteRotation) {
			spriteRotation += lib.random_float_between(-360, 360, this._twister);
		}

		this.sprite.rotation = Math.normalizeRadians(
			Math.toRadians(spriteRotation)
		);

		this._customAngle = this.data.angle ?? 0;
		if (this.data.randomRotation) {
			this._customAngle += lib.random_float_between(-360, 360, this._twister);
		}

		this.spriteContainer.rotation = -Math.normalizeRadians(
			Math.toRadians(this._customAngle)
		);

		if (CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE) {
			this.isometricContainer.rotation = Math.PI / 4;
		}

		if (this.data.tint) {
			this.sprite.tint = this.data.tint;
		}

		if (textSprite) {
			if (this.data.tint) {
				textSprite.tint = this.data.tint;
			}
			this.sprite.addChild(textSprite);
		}

		this.filters = [
			new PIXI.filters.ColorMatrixFilter({
				saturation: this.shouldShowFadedVersion ? -1 : 1,
			}),
			new PIXI.filters.AlphaFilter(
				this.shouldShowFadedVersion
					? game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") /
					100
					: 1
			),
		];

		this.updateElevation();
	}

	_createShapes() {
		const nonMaskShapes = (this.data?.shapes ?? []).filter(
			(shape) => !shape.isMask
		);
		this.shapes = {};
		for (const shape of nonMaskShapes) {
			const graphic = canvaslib.createShape(shape);
			graphic.filters = this.sprite.filters;
			this.spriteContainer.addChild(graphic);
			this.shapes[shape?.name ?? "shape-" + foundry.utils.randomID()] = graphic;
		}
	}

	updateElevation() {
		let targetElevation = Math.max(
				canvaslib.get_object_elevation(this.source ?? {}),
				canvaslib.get_object_elevation(this.target ?? {})
			);
		if(!CONSTANTS.IS_V12) targetElevation += 1;
		let effectElevation = this.data.elevation?.elevation ?? 0;
		if (!this.data.elevation?.absolute) {
			effectElevation += targetElevation;
		}
		const isIsometric = foundry.utils.getProperty(
			game.scenes.get(this.data.sceneId),
			CONSTANTS.INTEGRATIONS.ISOMETRIC.SCENE_ENABLED
		);
		if (CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE && isIsometric) {
			const sourceSort = this.source
				? (this.sourceMesh?.sort ?? 0) + (this.data.isometric?.overlay ? 1 : -1)
				: 0;
			const targetSort = this.target
				? (this.targetMesh?.sort ?? 0) + (this.data.isometric?.overlay ? 1 : -1)
				: 0;
			this.sort = Math.max(sourceSort, targetSort);
		} else {
			this.sort = !lib.is_real_number(this.data.zIndex)
				? this.data.index + (this?.parent?.children?.length ?? 0)
				: 100000 + this.data.zIndex;
		}
		this.elevation = effectElevation;
		this.zIndex = this.sort;
		this.sort += 100;
		this.sortLayer = this.data.sortLayer
		if (this.parent) {
			this.parent.sortChildren();
		}
	}

	updateTransform() {
		super.updateTransform();
		if (this.data.screenSpace || this.data.screenSpaceAboveUI) {
			const [screenWidth, screenHeight] = canvas.screenDimensions;

			this.position.set(
				(this.data.screenSpacePosition?.x ?? 0) +
				screenWidth *
				(this.data.screenSpaceAnchor?.x ?? this.data.anchor?.x ?? 0.5),
				(this.data.screenSpacePosition?.y ?? 0) +
				screenHeight *
				(this.data.screenSpaceAnchor?.y ?? this.data.anchor?.y ?? 0.5)
			);

			if (this.data.screenSpaceScale) {
				const scaleData = this.data.screenSpaceScale ?? { x: 1, y: 1 };

				let scaleX = scaleData.x;
				let scaleY = scaleData.y;

				if (scaleData.fitX) {
					scaleX = scaleX * (screenWidth / this.sprite.width);
				}

				if (scaleData.fitY) {
					scaleY = scaleY * (screenHeight / this.sprite.height);
				}

				scaleX = scaleData.ratioX ? scaleY : scaleX;
				scaleY = scaleData.ratioY ? scaleX : scaleY;

				this.scale.set(scaleX, scaleY);
			}
		}
	}

	async _setupMasks() {
		const maskShapes = this.data.shapes.filter((shape) => shape.isMask);

		if (!this.data?.masks?.length && !maskShapes.length) return;

		const maskFilter = MaskFilter.create();

		for (const uuid of this.data.masks) {
			const documentObj = fromUuidSync(uuid);

			if (!documentObj || documentObj.parent.id !== this.data.sceneId) continue;

			const obj = documentObj.object;

			let shape = obj?.mesh;
			let shapeToAdd = shape;

			if (obj instanceof MeasuredTemplate || obj instanceof Drawing) {
				shape = obj?.shape?.geometry?.graphicsData?.[0]?.shape ?? obj?.shape;

				if (
					game.modules.get("walledtemplates")?.active &&
					obj.walledtemplates?.walledTemplate
				) {
					let wt = obj.walledtemplates.walledTemplate;
					wt.options.padding = 3 * canvas.dimensions.distancePixels;
					shape = wt.computeShape();
					wt.options.padding = 0;
				}

				shapeToAdd = new PIXI.LegacyGraphics()
					.beginFill()
					.drawShape(shape)
					.endFill();

				if (obj instanceof MeasuredTemplate) {
					shapeToAdd.position.set(documentObj.x, documentObj.y);
				} else {
					const {
						x,
						y,
						shape: { width, height },
						rotation,
					} = documentObj;
					shapeToAdd.pivot.set(width / 2, height / 2);
					shapeToAdd.position.set(x + width / 2, y + height / 2);
					shapeToAdd.angle = rotation;
				}
				shapeToAdd.cullable = true;
				shapeToAdd.custom = true;
				shapeToAdd.renderable = false;
				shapeToAdd.uuid = uuid;
				canvas.stage.addChild(shapeToAdd);
			}
			shapeToAdd.obj = obj;

			const updateMethod = (doc) => {
				if (doc !== documentObj) return;
				const mask = maskFilter.masks.find((shape) => shape.uuid === uuid);
				if (!mask) return;
				if (!mask.custom) return;
				mask.clear();
				if (obj instanceof MeasuredTemplate) {
					mask.position.set(documentObj.x, documentObj.y);
					let maskObj = documentObj.object;
					shape = obj?.shape?.geometry?.graphicsData?.[0]?.shape ?? obj?.shape;
					if (
						game.modules.get("walledtemplates")?.active &&
						maskObj.walledtemplates?.walledTemplate
					) {
						let wt = maskObj.walledtemplates.walledTemplate;
						wt.options.padding = 3 * canvas.dimensions.distancePixels;
						shape = wt.computeShape();
						wt.options.padding = 0;
					}
				} else {
					const {
						x,
						y,
						shape: { width, height },
						rotation,
					} = documentObj;
					mask.pivot.set(width / 2, height / 2);
					mask.position.set(x + width / 2, y + height / 2);
					mask.angle = rotation;
				}
				mask.beginFill().drawShape(shape).endFill();
			};

			if (game.modules.get("walledtemplates")?.active) {
				hooksManager.addHook(this.uuid, "createWall", () => {
					setTimeout(() => {
						updateMethod(documentObj);
					}, 100);
				});

				hooksManager.addHook(this.uuid, "updateWall", () => {
					setTimeout(() => {
						updateMethod(documentObj);
					}, 100);
				});

				hooksManager.addHook(this.uuid, "deleteWall", () => {
					setTimeout(() => {
						updateMethod(documentObj);
					}, 100);
				});
			}

			hooksManager.addHook(this.uuid, this.getHook("update", uuid), (doc) => {
				setTimeout(() => {
					updateMethod(doc);
				}, 100);
			});

			maskFilter.masks.push(shapeToAdd);
		}

		for (const shapeData of maskShapes) {
			const shape = canvaslib.createShape(shapeData);
			shape.cullable = true;
			shape.custom = true;
			shape.renderable = false;
			this.spriteContainer.addChild(shape);
			this.shapes[shapeData?.name ?? "shape-" + foundry.utils.randomID()] = shape;
			maskFilter.masks.push(shape);
		}

		this.sprite.filters.push(maskFilter);
	}

	/**
	 * Sets up the hooks relating to this effect's source and target
	 *
	 * @private
	 */
	_setupHooks() {
		const attachedToSource =
			this.data.attachTo?.active && lib.is_UUID(this.data.source);
		const attachedToTarget =
			(this.data.stretchTo?.attachTo || this.data.rotateTowards?.attachTo) &&
			lib.is_UUID(this.data.target);

		const baseRenderable = this.shouldPlayVisible;
		let renderable = baseRenderable;
		let alpha = null;

		if (attachedToSource) {
			hooksManager.addHook(this.uuid, this.getSourceHook("delete"), (doc) => {
				const uuid = doc.uuid;
				if (doc !== this.sourceDocument) return;
				this._source = this._cachedSourceData.position;
				SequencerEffectManager.objectDeleted(uuid);
			});

			if (this.data.attachTo?.bindVisibility) {
				hooksManager.addHook(
					this.uuid,
					"sightRefresh",
					() => {
						const sourceVisible =
							this.source && (!this.sourceMesh?.occluded);
						const sourceHidden =
							this.sourceDocument && (this.sourceDocument?.hidden ?? false);
						const targetVisible =
							this.target &&
							(!attachedToTarget || (this.targetMesh?.occluded ?? true));
						this.renderable =
							baseRenderable &&
							(sourceVisible || targetVisible) &&
							this._checkWallCollisions();
						this.alpha = sourceVisible && sourceHidden ? 0.5 : 1.0;
						renderable = baseRenderable && this.renderable;
					},
					true
				);
			}

			if (this.data.attachTo?.bindAlpha || this.data.attachTo?.bindElevation) {
				hooksManager.addHook(this.uuid, this.getSourceHook("update"), (doc) => {
					if (doc !== this.sourceDocument) return;
					if (this.data.attachTo?.bindAlpha) {
						this.spriteContainer.alpha = this.getSourceData().alpha;
					}
					if (this.data.attachTo?.bindElevation) {
						this.updateElevation();
					}
				});
			}

			if (this.data.attachTo?.bindAlpha) {
				alpha = this.getSourceData().alpha;
			}
		}

		if (attachedToTarget) {
			hooksManager.addHook(this.uuid, this.getTargetHook("delete"), (doc) => {
				if (doc !== this.target) return;
				this._target = this._cachedTargetData.position;
				const uuid = doc.uuid;
				SequencerEffectManager.objectDeleted(uuid);
			});
			hooksManager.addHook(this.uuid, this.getTargetHook("update"), (doc) => {
				if (doc !== this.target) return;
				this.updateElevation();
			});
		}

		for (let uuid of this.data?.tiedDocuments ?? []) {
			const tiedDocument = fromUuidSync(uuid);
			if (tiedDocument) {
				hooksManager.addHook(
					this.uuid,
					this.getHook("delete", tiedDocument.uuid),
					(doc) => {
						if (tiedDocument !== doc) return;
						SequencerEffectManager.objectDeleted(doc.uuid);
					}
				);
			}
		}

		setTimeout(() => {
			this.renderable = renderable;
			this.spriteContainer.alpha = alpha ?? 1.0;
		}, 25);
	}

	/**
	 * Calculates the padding and scale to stretch an effect across the given distance
	 *
	 * If the file is a SequencerFileBase instance, it will also pick the appropriate file for the right distance
	 *
	 * @param distance
	 * @returns {Object}
	 * @private
	 */
	async _getTextureForDistance(distance) {
		if (!this._distanceCache || this._distanceCache?.distance !== distance) {
			let scaleX = 1.0;
			let scaleY = 1.0;
			let texture;
			let filePath;
			let spriteAnchor = this.data.anchor?.x ?? 1.0;

			if (this._file instanceof SequencerFileBase) {
				const scaledDistance = distance / (this.data.scale.x ?? 1.0);
				const result = await this._file.getTexture(scaledDistance);

				filePath = result.filePath;

				texture = result.texture;

				spriteAnchor = result.spriteAnchor ?? this.data.anchor?.x ?? 0.0;

				scaleX = result.spriteScale;

				if (this.data.stretchTo?.onlyX) {
					const widthWithPadding =
						texture.width - (this.template.startPoint + this.template.endPoint);
					scaleY = widthWithPadding / texture.width;
				} else {
					scaleY = result.spriteScale;
				}
			} else if (this._file instanceof PIXI.Texture) {
				filePath = this.data.file;

				texture = this._file;

				spriteAnchor = this.template.startPoint / texture.width;

				const widthWithPadding =
					texture.width - (this.template.startPoint + this.template.endPoint);
				let spriteScale = distance / widthWithPadding;

				scaleX = spriteScale;

				if (this.data.stretchTo?.onlyX) {
					scaleY = widthWithPadding / texture.width;
				} else {
					scaleY = spriteScale;
				}
			}

			this._distanceCache = {
				filePath,
				texture,
				spriteAnchor,
				scaleX,
				scaleY,
				distance,
			};
		}

		return this._distanceCache;
	}

	/**
	 * Applies the distance scaling to the sprite based on the previous method
	 *
	 * @returns {Promise<void>}
	 * @private
	 */
	async _applyDistanceScaling() {
		const ray = new Ray(this.sourcePosition, this.targetPosition);

		this._rotateTowards(ray);

		let { filePath, texture, spriteAnchor, scaleX, scaleY, distance } =
			await this._getTextureForDistance(ray.distance);

		if (
			this._currentFilePath !== filePath ||
			this._relatedSprites[filePath] === undefined
		) {
			this.texture = texture;
			this.video = filePath.toLowerCase().endsWith(".webm")
				? texture?.baseTexture?.resource?.source ?? false
				: false;

			Object.values(this._relatedSprites).forEach((subsprite) => {
				subsprite.renderable = false;
			});

			this._currentFilePath = filePath;

			if (this._relatedSprites[filePath]) {
				this._relatedSprites[filePath].renderable = true;
			} else {
				let sprite;
				let spriteType = this.data.tilingTexture
					? PIXI.TilingSprite
					: SpriteMesh;
				if (this.data.xray) {
					sprite = new spriteType(texture);
				} else {
					sprite = new spriteType(texture, VisionSamplerShader);
				}
				this._relatedSprites[filePath] = sprite;
				if (this.data.tint) {
					sprite.tint = this.data.tint;
				}

				this.sprite.addChild(sprite);
			}

			if (this._endTime) {
				if (this._endTime !== this.mediaCurrentTime) {
					this.playMedia();
					setTimeout(() => {
						this.pauseMedia()
					}, (this._endTime - this.mediaCurrentTime) * 1000);
				} else {
					this.mediaCurrentTime = this._endTime;
					this.pauseMedia();
					this.updateTexture();
				}
			} else {
				this.playMedia();
			}
		}

		if (this._relatedSprites[filePath]) {
			if (this.data.attachTo?.active) {
				this._applyAttachmentOffset();
			}

			const sprite = this._relatedSprites[filePath];

			if (!sprite.parent) {
				this.sprite.addChild(sprite);
			}

			if (this.data.tilingTexture) {
				const scaleX = (this.data.scale.x ?? 1.0) * this.gridSizeDifference;
				const scaleY = (this.data.scale.y ?? 1.0) * this.gridSizeDifference;
				sprite.width = distance / scaleX;
				sprite.height = texture.height;
				sprite.scale.set(scaleX * this.flipX, scaleY * this.flipY);

				sprite.tileScale.x = this.data.tilingTexture.scale.x;
				sprite.tileScale.y = this.data.tilingTexture.scale.y;

				sprite.tilePosition = this.data.tilingTexture.position;
			} else {
				sprite.scale.set(
					scaleX * (this.data.scale.x ?? 1.0) * this.flipX,
					scaleY * (this.data.scale.y ?? 1.0) * this.flipY
				);
			}

			sprite.anchor.set(
				this.flipX === 1 ? spriteAnchor : 1 - spriteAnchor,
				this.data.anchor?.y ?? 0.5
			);
		}
	}

	_checkWallCollisions() {
		if (
			!this.data.stretchTo?.attachTo ||
			!this.data.stretchTo?.requiresLineOfSight
		)
			return true;

		const ray = new Ray(this.sourcePosition, this.targetPosition);

		const blockingObjects = canvas.walls.checkCollision(ray, { type: "sight" });

		if (!blockingObjects.length && !this.data.stretchTo?.hideLineOfSight) {
			SequencerEffectManager.endEffects({ effects: this });
		}

		return !blockingObjects.length;
	}

	/**
	 * Rotates the effect towards the target
	 *
	 * @param ray
	 * @private
	 */
	_rotateTowards(ray) {
		if (!ray) {
			const sourcePosition =
				this.flipX === 1 ? this.sourcePosition : this.targetPosition;
			const targetPosition =
				this.flipX === 1 ? this.targetPosition : this.sourcePosition;
			ray = new Ray(sourcePosition, targetPosition);
		}

		this.rotationContainer.rotation = Math.normalizeRadians(
			ray.angle + Math.toRadians(this.data.rotateTowards?.rotationOffset ?? 0)
		);
		this._tweakRotationForIsometric();
	}

	_tweakRotationForIsometric() {
		if (!CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE) return;

		if (this.data.stretchTo) {
			let skew = Math.normalizeRadians(
				this.rotationContainer.rotation - Math.PI / 4
			);

			if (
				Math.abs(skew) >= Math.PI / 2 - 0.5 &&
				Math.abs(skew) <= Math.PI / 2 + 0.5
			) {
				skew -= Math.PI / 2;
			}

			this.isometricContainer.skew.set(Math.normalizeRadians(skew), 0);
			this.isometricContainer.rotation = 0;
		} else if (this.data?.isometric?.overlay) {
			this.rotationContainer.rotation = 0;
			let skew = Math.PI / 4 + this.rotationContainer.rotation;
			this.isometricContainer.skew.set(
				Math.normalizeRadians(skew - Math.PI / 4),
				0
			);
			this.isometricContainer.scale.set(
				1.0,
				window.scale ?? CONSTANTS.INTEGRATIONS.ISOMETRIC.ISOMETRIC_CONVERSION
			);
		} else {
			this.isometricContainer.rotation = 0;
		}
	}

	/**
	 * Transforms the sprite, rotating it, stretching it, scaling it, sizing it according its data
	 *
	 * @private
	 */
	async _transformSprite() {
		if (this.data.stretchTo) {
			if (this.data.stretchTo?.attachTo) {
				this._addToTicker(this._transformStretchToAttachedSprite);
			}
			await this._applyDistanceScaling();
		} else {
			if (!this.sprite?.texture?.valid && this.texture?.valid) {
				this.sprite.texture = this.texture;
			}
		}

		if (
			this.video &&
			(this._startTime || this._loopOffset > 0) &&
			this.video?.currentTime !== undefined
		) {
			await lib.wait(20);
			this.updateTexture();
		}

		if (!this.data.stretchTo) {
			this._transformNoStretchSprite();
		}

		if (this.data.attachTo?.active && !this.data.stretchTo?.attachTo) {
			this._addToTicker(this._transformAttachedNoStretchSprite);
		} else {
			if (!this.data.screenSpace) {
				this.position.set(this.sourcePosition.x, this.sourcePosition.y);
			}
		}

		if (this.data.rotateTowards) {
			this._rotateTowards();

			if (this.data.rotateTowards?.attachTo) {
				this._addToTicker(this._transformRotateTowardsAttachedSprite);
			}
		}

		this._tweakRotationForIsometric();

		const spriteToConsider = this.sprite.children.length
			? this.sprite.children.find(child => child.renderable)
			: this.sprite;

		if (!this.data.anchor && this.data.rotateTowards) {
			const textureWidth = (this.texture?.width ?? spriteToConsider.width) / 2;
			const startPointRatio = this.template.startPoint / textureWidth;
			this.spriteContainer.pivot.set(
				spriteToConsider.width * (-0.5 + startPointRatio),
				0
			);
		} else {
			this.spriteContainer.pivot.set(
				lib.interpolate(
					spriteToConsider.width * -0.5,
					spriteToConsider.width * 0.5,
					this.data.anchor?.x ?? 0.5
				),
				lib.interpolate(
					spriteToConsider.height * -0.5,
					spriteToConsider.height * 0.5,
					this.data.anchor?.y ?? 0.5
				)
			);
		}
	}

	set texture(inTexture) {
		if (this.data?.fileOptions?.antialiasing !== null) {
			inTexture.baseTexture.setStyle(0, this.data?.fileOptions?.antialiasing)
		}
		this._texture = inTexture;
	}

	get texture() {
		return this._texture;
	}

	async _transformStretchToAttachedSprite() {
		try {
			await this._applyDistanceScaling();
		} catch (err) {
			//lib.debug_error(err);
		}
	}

	_transformNoStretchSprite() {
		if (this.data.tilingTexture) {
			this.sprite.tileScale = {
				x: this.data.tilingTexture.scale.x * this.gridSizeDifference,
				y: this.data.tilingTexture.scale.y * this.gridSizeDifference,
			};

			this.sprite.tilePosition = this.data.tilingTexture.position;
		}

		const heightWidthRatio = this.sprite.height / this.sprite.width;
		const widthHeightRatio = this.sprite.width / this.sprite.height;

		const baseScaleX =
			(this.data.scale?.x ?? 1.0) *
			(this.data.spriteScale?.x ?? 1.0) *
			this.flipX;
		const baseScaleY =
			(this.data.scale?.y ?? 1.0) *
			(this.data.spriteScale?.y ?? 1.0) *
			this.flipY;

		if (this.data.scaleToObject) {

			if (this.data?.attachTo?.active && this.data?.attachTo?.bindScale) {
				this._addToTicker(() => {
					this._applyScaleToObject(heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY);
				});
			}
			this._applyScaleToObject(heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY);

		} else if (this.data.size) {

			let { height, width } = this.data.size;

			if (this.data.size.width === "auto" || this.data.size.height === "auto") {
				height = this.sprite.height;
				width = this.sprite.width;

				if (this.data.size.width === "auto") {
					height = this.data.size.height;
					if (this.data.size.gridUnits) {
						height *= canvas.grid.size;
					}
					width = height * widthHeightRatio;
				} else if (this.data.size.height === "auto") {
					width = this.data.size.width;
					if (this.data.size.gridUnits) {
						width *= canvas.grid.size;
					}
					height = width * heightWidthRatio;
				}
			} else if (this.data.size.gridUnits) {
				height *= canvas.grid.size;
				width *= canvas.grid.size;
			}

			this.sprite.width = width * baseScaleX;
			this.sprite.height = height * baseScaleY;
		} else {
			this.sprite.scale.set(
				baseScaleX * this.gridSizeDifference,
				baseScaleY * this.gridSizeDifference
			);
		}
	}

	_applyScaleToObject(heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY) {

		try {
			let { width, height } = this.getSourceData();

			if (this.sourceDocument instanceof TokenDocument) {
				width *= this.data.scaleToObject?.considerTokenScale
					? this.sourceDocument.texture.scaleX
					: 1.0;
				height *= this.data.scaleToObject?.considerTokenScale
					? this.sourceDocument.texture.scaleY
					: 1.0;
			}

			if (width === this._lastDimensions.width && height === this._lastDimensions.height) return;

			this._lastDimensions = { width, height };

			const ratioToUse = heightWidthRatio > widthHeightRatio;

			if (this.data.scaleToObject?.uniform) {
				let newWidth = Math.max(width, height);
				height = Math.max(width, height);
				width = newWidth;
			} else {
				width = width * (ratioToUse ? widthHeightRatio : 1.0);
				height = height * (!ratioToUse ? heightWidthRatio : 1.0);
			}

			this.sprite.width = width * (this.data.scaleToObject?.scale ?? 1.0) * baseScaleX;
			this.sprite.height = height * (this.data.scaleToObject?.scale ?? 1.0) * baseScaleY;

			SequencerAnimationEngine.updateStartValues(this.sprite, "width");
			SequencerAnimationEngine.updateStartValues(this.sprite, "height");
			SequencerAnimationEngine.updateStartValues(this.sprite, "scale.x");
			SequencerAnimationEngine.updateStartValues(this.sprite, "scale.y");

		} catch (err) {

		}

	}

	async _transformAttachedNoStretchSprite() {

		if (this.isDestroyed) return;

		const applyRotation =
			this.data.attachTo?.bindRotation &&
			!(
				this.sourceDocument instanceof TokenDocument &&
				this.sourceDocument.lockRotation
			) &&
			(this.sourceDocument?.rotation !== undefined ||
				this.sourceDocument?.direction !== undefined) &&
			!this.data.rotateTowards &&
			!this.data.stretchTo;

		if (applyRotation) {
			this.rotationContainer.rotation = this.getSourceData().rotation;
		}

		this._tweakRotationForIsometric();

		try {
			this._applyAttachmentOffset();
		} catch (err) {
			lib.debug_error(err);
		}
	}

	_applyAttachmentOffset() {
		let offset = { x: 0, y: 0 };

		if (this.data.attachTo?.align && this.data.attachTo?.align !== "center") {
			offset = canvaslib.align({
				context: this.source,
				spriteWidth: this.sprite.width,
				spriteHeight: this.sprite.height,
				align: this.data.attachTo?.align,
				edge: this.data.attachTo?.edge,
			});
		}

		this.position.set(
			this.sourcePosition.x - offset.x,
			this.sourcePosition.y - offset.y
		);
	}

	async _transformRotateTowardsAttachedSprite() {
		if (this.isDestroyed) return;
		try {
			this._rotateTowards();
		} catch (err) {
			lib.debug_error(err);
		}
	}

	/**
	 * Provided an animation targeting the rotation of the sprite's primary container, this method will counter-rotate
	 * the sprite in an equal fashion so that the sprite's rotation remains static relative to this animation
	 *
	 * @param animation
	 * @returns {*[]}
	 * @private
	 */
	_counterAnimateRotation(animation) {
		if (
			animation.target === this.spriteContainer &&
			this.data.zeroSpriteRotation
		) {
			delete animation.target;
			let counterAnimation = foundry.utils.deepClone(animation);
			animation.target = this.spriteContainer;
			counterAnimation.target = this.sprite;
			if (counterAnimation.values) {
				counterAnimation.values = counterAnimation.values.map(
					(value) => value * -1
				);
			} else {
				counterAnimation.from *= -1;
				counterAnimation.to *= -1;
			}
			if (!Array.isArray(animation)) {
				animation = [animation, counterAnimation];
			} else {
				animation.push(counterAnimation);
			}
		}

		return animation;
	}

	/**
	 * Plays the custom animations of this effect
	 *
	 * @returns {number}
	 * @private
	 */
	_playCustomAnimations() {
		if (!this.data.animations) return 0;

		this._playAnimations(
			foundry.utils.deepClone(this.data.animations) ?? [],
			this.actualCreationTime - this.creationTimestamp
		);
	}

	_playAnimations(animations, timeDifference = 0) {
		let animationsToSend = [];

		const oneShotAnimations = animations.filter(
			(animation) => !animation.looping && !animation.fromEnd
		);

		for (let animation of oneShotAnimations) {
			animation.target = foundry.utils.getProperty(this, animation.target);

			if (!animation.target) continue;

			if (animation.propertyName.indexOf("rotation") > -1) {
				animation.from = animation.from * (Math.PI / 180);
				animation.to = animation.to * (Math.PI / 180);
			}

			if (
				["position.x", "position.y", "height", "width"].includes(
					animation.propertyName
				) &&
				animation.gridUnits
			) {
				animation.from *= canvas.grid.size;
				animation.to *= canvas.grid.size;
			}

			if (["hue"].includes(animation.propertyName)) {
				animation.getPropertyName = "values." + animation.propertyName;
			}

			animationsToSend = animationsToSend.concat(
				this._counterAnimateRotation(animation)
			);
		}

		const loopingAnimations = animations.filter(
			(animation) => animation.looping
		);

		for (let animation of loopingAnimations) {
			animation.target = foundry.utils.getProperty(this, animation.target);

			if (!animation.target) continue;

			if (animation.propertyName.indexOf("rotation") > -1) {
				animation.values = animation.values.map((angle) => {
					return angle * (Math.PI / 180);
				});
			}

			if (
				["position.x", "position.y", "height", "width"].includes(
					animation.propertyName
				) &&
				animation.gridUnits
			) {
				animation.values = animation.values.map((value) => {
					return value * canvas.grid.size;
				});
			}

			if (["hue"].includes(animation.propertyName)) {
				animation.getPropertyName = "values." + animation.propertyName;
			}

			animationsToSend = animationsToSend.concat(
				this._counterAnimateRotation(animation)
			);
		}

		if (!(this instanceof PersistentCanvasEffect)) {
			animationsToSend = animationsToSend.concat(
				this._getFromEndCustomAnimations()
			);
		}

		setTimeout(() => {
			SequencerAnimationEngine.addAnimation(
				this.id,
				animationsToSend,
				timeDifference
			);
		}, 20);
	}

	_getFromEndCustomAnimations(immediate = false) {
		let fromEndAnimations = [];

		const animations = foundry.utils.deepClone(this.data.animations) ?? [];

		const oneShotEndingAnimations = animations.filter(
			(animation) => !animation.looping && animation.fromEnd
		);

		for (let animation of oneShotEndingAnimations) {
			animation.target = foundry.utils.getProperty(this, animation.target);

			if (!animation.target) continue;

			animation.delay = lib.is_real_number(immediate)
				? Math.max(immediate - animation.duration + animation.delay, 0)
				: Math.max(
					this._totalDuration - animation.duration + animation.delay,
					0
				);

			if (animation.propertyName.indexOf("rotation") > -1) {
				animation.from = animation.from * (Math.PI / 180);
				animation.to = animation.to * (Math.PI / 180);
			}

			if (
				["position.x", "position.y", "height", "width"].includes(
					animation.propertyName
				) &&
				animation.gridUnits
			) {
				animation.from *= canvas.grid.size;
				animation.to *= canvas.grid.size;
			}

			fromEndAnimations = fromEndAnimations.concat(
				this._counterAnimateRotation(animation)
			);
		}

		return fromEndAnimations;
	}

	/**
	 * Fades in the effect at the start of the effect
	 *
	 * @returns {number|*}
	 * @private
	 */
	_fadeIn() {
		if (!this.data.fadeIn || !this.sprite) return 0;

		let fadeIn = this.data.fadeIn;

		if (
			this.actualCreationTime -
			(this.creationTimestamp + fadeIn.duration + fadeIn.delay) >
			0
		) {
			return;
		}

		this.alphaFilter.alpha = 0.0;

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this.alphaFilter,
			propertyName: "alpha",
			to: this.data.opacity,
			duration: fadeIn.duration,
			ease: fadeIn.ease,
			delay: fadeIn.delay,
			absolute: true,
		});

		return fadeIn.duration + fadeIn.delay;
	}

	/**
	 * Fades in the effect's audio at the start of the effect
	 *
	 * @returns {number|*}
	 * @private
	 */
	_fadeInAudio() {
		if (!this.data.fadeInAudio || !this.sprite || !this.video) return 0;

		let fadeInAudio = this.data.fadeInAudio;

		if (
			this.actualCreationTime -
			(this.creationTimestamp +
				fadeInAudio.duration +
				fadeInAudio.delay) >
			0
		)
			return;

		this.video.volume = 0.0;

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this,
			propertyName: "video.volume",
			to:
				(this.data.volume ?? 0) *
				game.settings.get("core", "globalInterfaceVolume"),
			duration: fadeInAudio.duration,
			ease: fadeInAudio.ease,
			delay: fadeInAudio.delay,
			absolute: true,
		});

		return fadeInAudio.duration + fadeInAudio.delay;
	}

	/**
	 * Fades out the effect at the end of the effect's duration
	 *
	 * @returns {number|*}
	 * @private
	 */
	_fadeOut(immediate = false) {
		if (!this.data.fadeOut || !this.sprite) return 0;

		let fadeOut = this.data.fadeOut;

		fadeOut.delay = lib.is_real_number(immediate)
			? Math.max(immediate - fadeOut.duration + fadeOut.delay, 0)
			: Math.max(this._totalDuration - fadeOut.duration + fadeOut.delay, 0);

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this.alphaFilter,
			propertyName: "alpha",
			to: 0.0,
			duration: fadeOut.duration,
			ease: fadeOut.ease,
			delay: fadeOut.delay,
			absolute: true,
		});

		return fadeOut.duration + fadeOut.delay;
	}

	/**
	 * Fades out the effect at the end of the effect's duration
	 *
	 * @returns {number|*}
	 * @private
	 */
	_fadeOutAudio(immediate = false) {
		if (!this.data.fadeOutAudio || !this.sprite || !this.video) return 0;

		let fadeOutAudio = this.data.fadeOutAudio;

		fadeOutAudio.delay = lib.is_real_number(immediate)
			? Math.max(immediate - fadeOutAudio.duration + fadeOutAudio.delay, 0)
			: Math.max(
				this._totalDuration - fadeOutAudio.duration + fadeOutAudio.delay,
				0
			);

		setTimeout(() => {
			SequencerAnimationEngine.addAnimation(this.id, {
				target: this,
				propertyName: "video.volume",
				to: 0.0,
				duration: fadeOutAudio.duration,
				ease: fadeOutAudio.ease,
				delay: fadeOutAudio.delay,
				absolute: true,
			});
		});

		return fadeOutAudio.duration + fadeOutAudio.delay;
	}

	/**
	 * Determines the scale to animate from or to
	 * @param property
	 * @returns {{x: number, y: number}}
	 * @private
	 */
	_determineScale(property) {
		let scale = {
			x: this.sprite.scale.x,
			y: this.sprite.scale.y,
		};

		if (lib.is_real_number(property.value)) {
			scale.x *= property.value * this.gridSizeDifference * this.flipX;
			scale.y *= property.value * this.gridSizeDifference * this.flipY;
		} else {
			scale.x *= property.value.x * this.gridSizeDifference * this.flipX;
			scale.y *= property.value.y * this.gridSizeDifference * this.flipY;
		}

		return scale;
	}

	/**
	 * Scales the effect in at the start of the effect
	 *
	 * @returns {number|*}
	 * @private
	 */
	_scaleIn() {
		if (!this.data.scaleIn || !this.sprite) return 0;

		let scaleIn = this.data.scaleIn;
		let fromScale = this._determineScale(scaleIn);

		if (
			this.actualCreationTime -
			(this.creationTimestamp + scaleIn.duration + scaleIn.delay) >
			0
		)
			return;

		let toScale = {
			x: this.sprite.scale.x,
			y: this.sprite.scale.y,
		};

		this.sprite.scale.set(fromScale.x, fromScale.y);

		SequencerAnimationEngine.addAnimation(this.id, [
			{
				target: this.sprite,
				propertyName: "scale.x",
				from: fromScale.x,
				to: toScale.x,
				duration: scaleIn.duration,
				ease: scaleIn.ease,
				delay: scaleIn.delay,
				absolute: true,
			},
			{
				target: this.sprite,
				propertyName: "scale.y",
				from: fromScale.y,
				to: toScale.y,
				duration: scaleIn.duration,
				ease: scaleIn.ease,
				delay: scaleIn.delay,
				absolute: true,
			},
		]);

		return scaleIn.duration + scaleIn.delay;
	}

	/**
	 * Scales the effect out at the end of the effect's duration
	 *
	 * @returns {number|*}
	 * @private
	 */
	_scaleOut(immediate = false) {
		if (!this.data.scaleOut || !this.sprite) return 0;

		let scaleOut = this.data.scaleOut;
		let scale = this._determineScale(scaleOut);

		scaleOut.delay = lib.is_real_number(immediate)
			? Math.max(immediate - scaleOut.duration + scaleOut.delay, 0)
			: Math.max(
				this._totalDuration - scaleOut.duration + scaleOut.delay,
				0
			);

		SequencerAnimationEngine.addAnimation(this.id, [
			{
				target: this.sprite,
				propertyName: "scale.x",
				to: scale.x,
				duration: scaleOut.duration,
				ease: scaleOut.ease,
				delay: scaleOut.delay,
				absolute: true,
			},
			{
				target: this.sprite,
				propertyName: "scale.y",
				to: scale.y,
				duration: scaleOut.duration,
				ease: scaleOut.ease,
				delay: scaleOut.delay,
				absolute: true,
			},
		]);

		return scaleOut.duration + scaleOut.delay;
	}

	/**
	 * Rotates the effect in at the start of the effect
	 *
	 * @returns {number|*}
	 * @private
	 */
	_rotateIn() {
		if (!this.data.rotateIn || !this.sprite) return 0;

		let rotateIn = this.data.rotateIn;

		if (
			this.actualCreationTime -
			(this.creationTimestamp + rotateIn.duration + rotateIn.delay) >
			0
		)
			return;

		let original_radians = this.spriteContainer.rotation;
		this.spriteContainer.rotation = rotateIn.value * (Math.PI / 180);

		SequencerAnimationEngine.addAnimation(
			this.id,
			this._counterAnimateRotation({
				target: this.spriteContainer,
				propertyName: "rotation",
				to: original_radians,
				duration: rotateIn.duration,
				ease: rotateIn.ease,
				delay: rotateIn.delay,
				absolute: true,
			})
		);

		return rotateIn.duration + rotateIn.delay;
	}

	/**
	 * Rotates the effect out at the end of the effect's duration
	 *
	 * @returns {number|*}
	 * @private
	 */
	_rotateOut(immediate = false) {
		if (!this.data.rotateOut || !this.sprite) return 0;

		let rotateOut = this.data.rotateOut;

		rotateOut.delay = lib.is_real_number(immediate)
			? Math.max(immediate - rotateOut.duration + rotateOut.delay, 0)
			: Math.max(
				this._totalDuration - rotateOut.duration + rotateOut.delay,
				0
			);

		SequencerAnimationEngine.addAnimation(
			this.id,
			this._counterAnimateRotation({
				target: this.spriteContainer,
				propertyName: "rotation",
				to: rotateOut.value * (Math.PI / 180),
				duration: rotateOut.duration,
				ease: rotateOut.ease,
				delay: rotateOut.delay,
				absolute: true,
			})
		);

		return rotateOut.duration + rotateOut.delay;
	}

	/**
	 * Causes the effect to move towards the given location
	 *
	 * @returns {number|*}
	 * @private
	 */
	_moveTowards() {
		if (!this.data.moves || !this.sprite) return 0;

		let moves = this.data.moves;

		let movementDuration = this._totalDuration;
		if (this.data.moveSpeed) {
			const distance = canvaslib.distance_between(
				this.sourcePosition,
				this.targetPosition
			);
			movementDuration = (distance / this.data.moveSpeed) * 1000;
		}

		if (this.data.moves.rotate) this._rotateTowards();

		const duration = movementDuration - moves.delay;

		if (
			this.actualCreationTime -
			(this.creationTimestamp + duration + moves.delay) >
			0
		)
			return;

		SequencerAnimationEngine.addAnimation(this.id, [
			{
				target: this,
				propertyName: "position.x",
				to: this.targetPosition.x,
				duration: duration,
				ease: moves.ease,
				delay: moves.delay,
				absolute: true
			},
			{
				target: this,
				propertyName: "position.y",
				to: this.targetPosition.y,
				duration: duration,
				ease: moves.ease,
				delay: moves.delay,
				absolute: true
			},
		]);

		return duration + moves.delay;
	}

	/**
	 * If this effect is temporary, this sets the timeout for when the effect should resolve and get removed;
	 *
	 * @private
	 */
	_setEndTimeout() {
		setTimeout(() => {
			this._resolve(this.data);
			this.endEffect();
		}, this._totalDuration);
	}

	_setupTimestampHook(offset) {
		if (!this._file?.originalMetadata?.timestamps || this._ended) return;
		const timestamps = this._file.getTimestamps();
		const timestampArray = Array.isArray(timestamps)
			? timestamps
			: [timestamps];
		for (const timestamp of timestampArray) {
			if (!lib.is_real_number(timestamp)) continue;
			let realTimestamp = timestamp - offset / this.mediaPlaybackRate;
			if (realTimestamp < 0) {
				realTimestamp += this._endTime;
			}
			setTimeout(() => {
				if (this._ended) return;
				Hooks.callAll("sequencerEffectTimestamp", this, this._file);
				if (this.mediaLooping) {
					const offsets = (this._endTime - this.mediaCurrentTime) * -1000;
					this._setupTimestampHook(offsets);
				}
			}, realTimestamp);
		}
	}

	/**
	 * Starts the loop of this effect, calculating the difference between the effect's creation time, and the actual
	 * creation time on the client
	 *
	 * @returns {Promise<void>}
	 * @private
	 */
	async _startEffect() {

		if (!this.hasAnimatedMedia) return;

		this.mediaLooping = this.playNaturally && !this.loops && !this.loopDelay;

		let creationTimeDifference = this.data.persist ? this.actualCreationTime - this.creationTimestamp : 0;

		this._currentLoops = Math.floor(creationTimeDifference / this._totalDuration);

		if (this.loops && this._currentLoops >= this.loops) {
			if(this.data.loopOptions?.endOnLastLoop || !this.data.persist) {
				return this.endEffect();
			}
			await this.pauseMedia();
			this.mediaCurrentTime = this._endTime;
			if (this.sprite.texture && this.video) {
				const oldRenderable = this.renderable;
				this.renderable = false;
				setTimeout(() => {
					this.updateTexture();
					setTimeout(() => {
						this.renderable = oldRenderable;
					}, 150)
				}, 150);
			}
			return;
		}

		return this._startLoop(creationTimeDifference);
	}

	/**
	 * Kicks off the loop, or just sets the video to loop
	 *
	 * @param creationTimeDifference
	 * @returns {Promise<void>}
	 * @private
	 */
	async _startLoop(creationTimeDifference) {

		if (!this._animationTimes.loopStart) {
			this._loopOffset =
				(creationTimeDifference % this._animationDuration) / 1000;
		} else if (creationTimeDifference / 1000 > this._animationTimes.loopStart) {
			const loopDuration =
				this._animationTimes.loopEnd - this._animationTimes.loopStart;
			this._loopOffset =
				(creationTimeDifference % (loopDuration * 1000)) / 1000;
		}

		return this._resetLoop();
	}

	/**
	 * Continuously reset the video to the right time so that the start and end time can be preserved
	 *
	 * @returns {Promise<void>}
	 * @private
	 */
	async _resetLoop(firstLoop = true) {
		if (this._ended) return;

		let loopWaitTime = 0;
		if (this._animationTimes.loopStart) {
			if (this._isEnding) return;
			this.mediaCurrentTime = (firstLoop ? 0 : this._animationTimes.loopStart) + (this._loopOffset > 0 ? this._loopOffset : 0);
			loopWaitTime = (this._animationTimes.loopEnd - this.mediaCurrentTime) * 1000;
		} else {
			this.mediaCurrentTime = this._startTime + this._loopOffset;
			loopWaitTime = this._animationDuration - this._loopOffset * 1000;
		}

		await this.playMedia();

		if (this.mediaLooping) {
			return;
		}

		this._resetTimeout = setTimeout(() => {
			if (this._ended) return;
			this._loopOffset = 0;
			this._currentLoops++;
			if (this.loops && this._currentLoops >= this.loops) {
				if(!this.data.persist || (this.data.persist && this.data.loopOptions?.endOnLastLoop)) {
					this.endEffect();
				}
				return;
			}
			this._resetLoop(false);
		}, loopWaitTime + this.loopDelay);
	}
}

class PersistentCanvasEffect extends CanvasEffect {

	/**
	 * @OVERRIDE
	 * @returns {Promise<void>}
	 * @private
	 */
	async _reinitialize() {
		await super._reinitialize(false);
	}

	/** @OVERRIDE */
	_playPresetAnimations() {
		this._moveTowards();
		this._fadeIn();
		this._scaleIn();
		this._rotateIn();
	}

	/** @OVERRIDE */
	_timeoutVisibility() {
		let creationTimeDifference = this.actualCreationTime - this.creationTimestamp;
		let timeout =
			creationTimeDifference === 0 && !this.data.animations ? 0 : 50;
		setTimeout(() => {
			this._setupHooks();
		}, timeout);
	}

	/** @OVERRIDE */
	_setEndTimeout() {
		let creationTimeDifference = this.actualCreationTime - this.creationTimestamp;
		if(this.loops && creationTimeDifference >= this._totalDuration && this.hasAnimatedMedia){
			setTimeout(() => {
				this.pauseMedia();
			}, this._totalDuration);
		}
	}

	/** @OVERRIDE */
	async endEffect() {
		if (this._isEnding) return;
		this._isEnding = true;
		let fullWaitDuration = 0;
		let extraEndDuration = this.data.extraEndDuration ?? 0;
		if (this._animationTimes?.forcedEnd) {
			this.mediaCurrentTime = this._animationTimes.forcedEnd;
			fullWaitDuration =
				(this.mediaDuration - (this._animationTimes?.forcedEnd ?? 0)) * 1000;
		} else if (this._animationTimes?.loopEnd) {
			fullWaitDuration = (this.mediaDuration - this.mediaCurrentTime) * 1000;
			this.mediaLooping = false;
			extraEndDuration = Math.max(extraEndDuration, fullWaitDuration);
		}
		const fromEndCustomAnimations =
			this._getFromEndCustomAnimations(extraEndDuration);
		const durations = [
			this._fadeOut(extraEndDuration),
			this._fadeOutAudio(extraEndDuration),
			this._scaleOut(extraEndDuration),
			this._rotateOut(extraEndDuration),
			this.data.extraEndDuration,
			fullWaitDuration,
			...fromEndCustomAnimations.map(
				(animation) => animation.duration + animation.delay
			),
		].filter(Boolean);
		SequencerAnimationEngine.addAnimation(this.id, fromEndCustomAnimations);
		const waitDuration = Math.max(...durations, 0);
		this._resolve(waitDuration);
		return new Promise((resolve) =>
			setTimeout(() => {
				super.endEffect();
				resolve(this.data);
			}, waitDuration)
		);
	}
}
