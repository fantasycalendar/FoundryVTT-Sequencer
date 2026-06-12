import CONSTANTS from "../constants.js";
import * as canvaslib from "../lib/canvas-lib.js";
import filters from "../lib/filters.js";
import MaskFilter from "../lib/filters/mask-filter.js";
import * as lib from "../lib/lib.js";
import SequencerAnimationEngine from "../modules/sequencer-animation-engine.js";
import SequencerEffectManager from "../modules/sequencer-effect-manager.js";
import { SequencerFileBase } from "../modules/sequencer-file.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import flagManager from "../utils/flag-manager.js";
import { SequencerAboveUILayer } from "./effects-layer.js";
import { SequencerSpriteManager } from "./sequencer-sprite-manager.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";
import PluginsManager from "../utils/plugins-manager.js";

const hooksManager = {
	_byHook: new Map(),
	_hooksRegistered: new Set(),

	addHook(effectUuid, hookName, callable, { effect = null, callNow = false } = {}) {
		if (!this._hooksRegistered.has(hookName)) {
			lib.debug("registering hook for: " + hookName);
			this._hooksRegistered.add(hookName);
			Hooks.on(hookName, (...args) => {
				this._hookCalled(hookName, ...args);
			});
		}

		let perHook = this._byHook.get(hookName);
		if (!perHook) {
			perHook = new Map();
			this._byHook.set(hookName, perHook);
		}
		let callbacks = perHook.get(effectUuid);
		if (!callbacks) {
			callbacks = [];
			perHook.set(effectUuid, callbacks);
		}
		callbacks.push(callable);

		if (callNow) {
			if (effect?._setTimeout) effect._setTimeout(callable, 20);
			else setTimeout(callable, 20);
		}
	},

	_hookCalled(hookName, ...args) {
		const perHook = this._byHook.get(hookName);
		if (!perHook) return;
		for (const callbacks of perHook.values()) {
			for (let i = 0; i < callbacks.length; i++) {
				try {
					callbacks[i](...args);
				} catch (err) {
					console.error(`Sequencer | hook handler for "${hookName}" threw:`, err);
				}
			}
		}
	},

	removeHooks(effectUuid) {
		for (const perHook of this._byHook.values()) {
			perHook.delete(effectUuid);
		}
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

/**
 * Whether the document shows on the viewed level, including via
 * cross-visibility. Foundry's `Token.includedInLevel` already follows
 * cross-visibility, but the generic `CanvasDocument.includedInLevel`
 * used by Region, Tile, Drawing, etc. does not, so we walk the viewed
 * level's `visibility.levels` against the document's level set ourselves.
 *
 * @param {foundry.abstract.Document|null|undefined} doc
 * @param {foundry.documents.Level|null|undefined} viewedLevel
 * @returns {boolean}
 */
function isDocOnViewedLevel(doc, viewedLevel) {
	if (!doc || !viewedLevel) return false;
	if (doc.includedInLevel?.(viewedLevel.id) === true) return true;
	const cross = viewedLevel.visibility?.levels;
	if (!cross?.size) return false;
	if (doc.levels?.size) {
		for (const id of doc.levels) {
			if (cross.has(id)) return true;
		}
	} else if (typeof doc.level === "string") {
		if (cross.has(doc.level)) return true;
	}
	return false;
}

/**
 * Whether an attached effect's source/target placeable should let the
 * effect render. Only Tokens are gated on visibility, since their
 * `isVisible` reflects per-perception culling and line of sight; other
 * placeables (Region, Tile, Drawing, Note) have `isVisible` getters
 * that return false for permission and layer-state reasons unrelated
 * to whether the placeable is rendered.
 *
 * @param {foundry.canvas.placeables.PlaceableObject|null|undefined} placeable
 * @returns {boolean}
 */
function isAttachedPlaceableVisible(placeable) {
	if (!placeable) return false;
	const Token = foundry.canvas.placeables.Token;
	if (!(placeable instanceof Token)) return true;
	return placeable.isVisible !== false;
}

/**
 * Whether the given scene position is hidden from the viewed level by a
 * `defineSurface` Region with `culling: true`. Mirrors what Foundry's
 * `Token#testCulled` does, generalised to an arbitrary `(x, y)` and
 * elevation range.
 *
 * @param {foundry.documents.Scene} scene
 * @param {foundry.documents.Level} viewedLevel
 * @param {number} x
 * @param {number} y
 * @param {number} zMin
 * @param {number} zMax
 * @returns {boolean}
 */
function isPositionCulled(scene, viewedLevel, x, y, zMin, zMax) {
	const { bottom, top } = viewedLevel.elevation;
	let lo, hi;
	if (zMax < bottom) {
		lo = Math.nextUp(zMax);
		hi = bottom;
	} else if (zMin >= top) {
		lo = top;
		hi = zMin;
	} else {
		return false;
	}
	const probe = { x, y };
	for (const surface of scene.getSurfaces({ culling: true, level: viewedLevel })) {
		if (surface.elevation > hi) break;
		if (surface.elevation < lo) continue;
		if (surface.region.polygonTree.testPoint(probe)) return true;
	}
	return false;
}

/**
 * Does an effect's vertical extent `[a0, a1]` overlap a Level's
 * elevation range `[b0, b1]`? Bottoms always count as part of their
 * interval. The effect's top counts when `aTopInclusive` is set,
 * matching Foundry Region `elevation.topInclusive`. The level's top is
 * never inclusive: adjacent levels share that boundary, and it belongs
 * to the upper level.
 *
 * @returns {boolean}
 */
function intervalsOverlap(a0, a1, b0, b1, aTopInclusive = false) {
	const aIsRange = a0 < a1;
	const bIsRange = b0 < b1;
	const lo = Math.max(a0, b0);
	const hi = Math.min(a1, b1);
	if (lo > hi) return false;
	if (lo < hi) return true;
	if (bIsRange && (hi === b1)) return false;
	if (aIsRange && (hi === a1)) return aTopInclusive;
	return true;
}

export default class CanvasEffect extends PIXI.Container {
	#elevation = 0;
	#sort = 0;
	#sortLayer = 800

	constructor(inData) {
		super();

		this.sortableChildren = true;
		this.interactiveChildren = false;

		// Set default values
		this.actualCreationTime = +new Date();
		this.data = inData;

		this._resolve = null;
		this._durationResolve = null;

		this.ready = false;
		this._ended = false;
		this._isEnding = false;

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
			const getDifferentTarget = this.data.source === this.data.target;
			this._source = this._getObjectByID(this.data.source?.uuid ?? this.data.source, getDifferentTarget, true) ?? this.data.source;
			this._source = this._source?._object ?? this._source;
		}
		return this._source;
	}

	/**
	 * Retrieves the source document
	 *
	 * @returns {Document|foundry.canvas.placeables.PlaceableObject}
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
		return this._resolveSourcePosition(this.getSourceData());
	}

	_resolveSourcePosition(sourceData) {
		const position = sourceData.position;
		const offset = this._getOffset(this.data.source, true);

		if (this.data.attachTo?.active && this.data.attachTo?.align && this.data.attachTo?.align !== "center") {
			const additionalOffset = canvaslib.align({
				context: this.source,
				spriteWidth: this.sprite.width,
				spriteHeight: this.sprite.height,
				align: this.data.attachTo?.align,
				edge: this.data.attachTo?.edge,
			});

			offset.x += additionalOffset.x;
			offset.y += additionalOffset.y;
		}

		return {
			x: (position.x - offset.x),
			y: (position.y - offset.y),
		};
	}

	/**
	 * The target object (or target location) of the effect
	 *
	 * @returns {boolean|object}
	 */
	get target() {
		if (!this._target && this.data.target) {
			const getDifferentTarget = this.data.source === this.data.target;
			this._target = this._getObjectByID(this.data.target?.uuid ?? this.data.target, getDifferentTarget, false) ?? this.data.target;
			this._target = this._target?._object ?? this._target;
		}
		return this._target;
	}

	/**
	 * Retrieves the document of the target
	 *
	 * @returns {Document|foundry.canvas.placeables.PlaceableObject}
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
			x: (position.x - offset.x),
			y: (position.y - offset.y),
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
				!!this.sourceDocument?.canUserModify?.(game.user, "update"))
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

	set effectAlpha(value) {
		if (this.sprite) {
			this.sprite.alpha = value
		}
		if (this.shapes) {
			Object.values(this.shapes).forEach(shape => {
				shape.alpha = value
			})
		}
	}

	get effectAlpha() {
		return this.sprite?.alpha
	}

	async playMedia() {
		if (this.destroyed || this._ended || this._isEnding || !this.sprite) {
			return
		}
		await this.sprite.play()
		this._setupTimestampHook(this.mediaCurrentTime * 1000);
	}

	updateTexture() {
		this.sprite?.updateVideoTextures()
	}

	async pauseMedia() {
		this.sprite?.stop()
	}

	get mediaLooping() {
		return !!this.sprite?.loop
	}

	set mediaLooping(looping) {
		if (!this.sprite) return;
		this.sprite.loop = looping;
	}

	get mediaIsPlaying() {
		return !!this.sprite?.playing
	}

	get mediaCurrentTime() {
		return this.sprite?.currentTime ?? 0
	}

	get mediaPlaybackRate() {
		return this.sprite?.playbackRate ?? 1
	}

	set mediaPlaybackRate(inPlaybackRate) {
		if (!this.sprite) return;
		// Playbackrate for spritesheets is now handled by timing info in the animation sequence
		this.sprite.playbackRate = inPlaybackRate;
	}

	set mediaCurrentTime(newTime) {
		if (!this.sprite) return;
		this.sprite.currentTime = newTime;
	}

	get mediaDuration() {
		return this.sprite?.duration ?? 0
	}

	get mediaDurationMs() {
		return this.mediaDuration * 1000
	}

	get hasAnimatedMedia() {
		return !!this.sprite?.hasAnimatedMedia
	}

	/**
	 * The template of the effect, determining the effect's internal grid size, and start/end padding
	 *
	 * @returns {object}
	 */
	get template() {
		return this._template
	}

	/**
	 * The grid size difference between the internal effect's grid vs the grid on the canvas. If the effect is in screen space, we ignore this.
	 *
	 * @returns {number}
	 */
	get gridSizeDifference() {
		return canvas.grid.size / (this.template?.gridSize ?? this.defaultGridSize);
	}

	get defaultGridSize() {
		return 100
	}

	/**
	 * Whether the effect should be flipped on any given axis
	 *
	 * @returns {number}
	 */
	get flipX() {
		const offsetMap = this._nameOffsetMap?.[this.data.source];
		let flip = this.data.flipX ? -1 : 1
		if (offsetMap && offsetMap.mirrorX !== undefined) {
			flip *= offsetMap.mirrorX ? -1 : 1;
		}
		return flip;
	}

	get flipY() {
		const offsetMap = this._nameOffsetMap?.[this.data.source];
		let flip = this.data.flipY ? -1 : 1
		if (offsetMap && offsetMap.mirrorY !== undefined) {
			flip *= offsetMap.mirrorY ? -1 : 1;
		}
		return flip;
	}

	/**
	 * Whether this effect should play at all, depending on a multitude of factors
	 *
	 * @returns {boolean}
	 */
	get shouldPlay() {
		return (
			(game.user.viewedScene === this.data.sceneId || this.data.creatorUserId === game.userId)
			&&
			(game.user.isGM || !this.data.users || this.data.users.length === 0 || this.data.users.includes(game.userId))
			&&
			(!this.data.local || this.data.creatorUserId === game.user.id)
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

	static make(inData) {
		return !inData.persist
			? new CanvasEffect(inData)
			: new PersistentCanvasEffect(inData);
	}

	static checkShouldPlay(effectData) {
		return !effectData.local || effectData.creatorUserId === game.user.id;
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

		if (this.source instanceof foundry.canvas.placeables.PlaceableObject && this.isSourceDestroyed) {
			return {
				...this._cachedSourceData,
			};
		}

		let crosshairPos = this.source instanceof CrosshairsPlaceable ? this.sourceDocument.getOrientation() : false;
		crosshairPos = crosshairPos?.source;

		// Fall back to the document when the placeable isn't on this canvas.
		const positionSource =
			this.source instanceof foundry.canvas.placeables.PlaceableObject && !this.isSourceTemporary
				? this.source
				: (this.sourceDocument ?? this.source);

		let position =
			crosshairPos
			|| (positionSource ? canvaslib.get_object_position(positionSource) : null)
			|| this.source?.worldPosition
			|| this.source?.center
			|| this.source;

		const { width, height } = crosshairPos || canvaslib.get_object_dimensions(positionSource);

		position = PluginsManager.sourcePosition({ effect: this, position, height });

		if (position !== undefined) {
			this._cachedSourceData.position = position;
		}

		if (width !== undefined && height !== undefined) {
			this._cachedSourceData.width = width;
			this._cachedSourceData.height = height;
		}

		let rotation = 0;
		if (this.source instanceof foundry.canvas.placeables.MeasuredTemplate && this.sourceDocument?.t !== "rect") {
			rotation = Math.normalizeRadians(
				Math.toRadians(this.sourceDocument?.direction)
			);
		} else if (!(this.source instanceof foundry.canvas.placeables.MeasuredTemplate)) {
			rotation = this.sourceDocument?.rotation
				? Math.normalizeRadians(Math.toRadians(this.sourceDocument?.rotation))
				: 0;
		}

		if (rotation !== undefined) {
			this._cachedSourceData.rotation = rotation;
		}

		const alpha =
			this.sourceDocument instanceof TokenDocument || this.sourceDocument instanceof TileDocument
				? this.sourceDocument?._source?.alpha ?? 1.0
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

		if (this.target instanceof foundry.canvas.placeables.PlaceableObject && this.isTargetDestroyed) {
			return {
				...this._cachedTargetData,
			};
		}

		let crosshairPos = this.target instanceof CrosshairsPlaceable ? this.targetDocument.getOrientation() : false;
		crosshairPos = crosshairPos?.target ?? crosshairPos?.source;

		// Fall back to the document when the placeable isn't on this canvas.
		const positionTarget =
			this.target instanceof foundry.canvas.placeables.PlaceableObject && !this.isTargetTemporary && !this.isTargetDestroyed
				? this.target
				: (this.targetDocument ?? this.target);

		let position =
			crosshairPos
			|| (positionTarget ? canvaslib.get_object_position(positionTarget, { measure: true }) : null)
			|| this.target?.worldPosition
			|| this.target?.center
			|| this.target;

		const { width, height } = crosshairPos || canvaslib.get_object_dimensions(positionTarget);

		position = PluginsManager.targetPosition({ effect: this, position, height });

		if (width !== undefined && height !== undefined) {
			this._cachedTargetData.width = width;
			this._cachedTargetData.height = height;
		}

		if (position !== undefined) {
			this._cachedTargetData.position = position;
		}

		let rotation = 0;
		if (
			this.target instanceof foundry.canvas.placeables.MeasuredTemplate &&
			this.targetDocument?.t !== "rect"
		) {
			rotation = Math.normalizeRadians(
				Math.toRadians(this.targetDocument?.direction)
			);
		} else if (!(this.target instanceof foundry.canvas.placeables.MeasuredTemplate)) {
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
					? new foundry.canvas.geometry.Ray(startPos, endPos).angle
					: foundry.canvas.geometry.Ray.fromAngle(
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
		this._durationResolve?.(0);
		this._durationResolve = null;
		this._resolve?.(this.data);
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
				flagManager.removeFlags(originalSourceUUID, { effects: newData });
			}

			flagManager.addFlags(newSourceUUID, { effects: newData });
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
			flagManager.addFlags(originalSourceUUID, { effects: newData });
		}

		return sequencerSocket.executeForEveryone(
			SOCKET_HANDLERS.ADD_EFFECT_ANIMATIONS,
			this.id,
			animationsToAdd
		);
	}

	async _addAnimations(inAnimations) {
		this._playAnimations(foundry.utils.deepClone(inAnimations));
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
	 * @returns {Promise}
	 * @private
	 */
	async _initialize() {
		try {
			this.ready = false;
			this._initializeVariables();
			this._addToContainer();
			await this._createFile()
			this._updateCurrentFilePath(false, true)
			await this._createSprite();
			this._calculateDuration();
			this._createShapes();
			await this._setupMasks();
			await this._transformSprite();
			this._playPresetAnimations();
			this._playCustomAnimations();
			this._setEndTimeout();
			this._registerTickers()
			this._timeoutVisibility();
			await this._startEffect();
			this.ready = true;
		} catch (err) {
			this._durationResolve?.(0);
			this._durationResolve = null;
			this._resolve?.(this.data);
			this._resolve = null;
			throw err;
		}
	}

	/**
	 * Reinitializes the effect after it has been updated
	 *
	 * @param play
	 * @returns {Promise}
	 * @private
	 */
	async _reinitialize() {
		this._initializing = true;
		this._recomputeRenderable();
		if (!this.shouldPlay) {
			return Sequencer.EffectManager._removeEffect(this);
		}
		this.actualCreationTime = +new Date();
		return this._initialize();
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

		this.pluginContainer = PluginsManager.createSpriteContainers({ effect: this, container: this.rotationContainer });

		// An offset container for the sprite
		this.spriteContainer = this.pluginContainer.addChild(
			new PIXI.Container()
		);
		this.spriteContainer.id = this.id + "-spriteContainer";

		this._template = this.data.template;
		this._ended = null;
		this._maskContainer = null;
		this._maskSprite = null;
		this._stageMasks = [];
		this._wallMaskGraphics = null;
		this._wallMaskDirty = false;
		this._verticalExtent = [0, 0, false];
		this._timeouts = new Set();
		this._file = null;
		this._loopOffset = 0;
		this.effectFilters = {};
		this._animationDuration = 0;
		this._animationTimes = {};
		this._twister = lib.createMersenneTwister(this.creationTimestamp);
		this._distanceCache = null;
		this._isRangeFind = false;
		this._customAngle = 0;
		this._currentFilePath = this.data.file;
		this._hooks = [];
		this._lastDimensions = {};
		this._lastScreenDimensions = {};
		this._renderTexture = null;

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

		this._ticker = foundry.canvas.animation.CanvasAnimation.ticker;
		this._tickerMethods = [];
	}

	_addToTicker(func) {
		this._tickerMethods.push(func);
		this._ticker.add(func, this);
	}

	_setTimeout(fn, ms) {
		const id = setTimeout(() => {
			this._timeouts?.delete(id);
			fn();
		}, ms);
		this._timeouts.add(id);
		return id;
	}

	/**
	 * Destroys all dependencies to this element, such as tickers, animations, textures, and child elements
	 *
	 * @private
	 */
	_destroyDependencies() {
		if (this._ended) return;
		this._ended = true;

		this._durationResolve?.(0);
		this._durationResolve = null;

		this.mask = null;

		// Tear down the region punch-through proxy first so it cannot
		// dereference this.sprite / children while we destroy them.
		this._teardownVoidProxy();

		if (this._timeouts?.size) {
			for (const id of this._timeouts) clearTimeout(id);
			this._timeouts.clear();
		}
		this.restartLoopHandler = null;

		hooksManager.removeHooks(this.uuid);

		this._tickerMethods.forEach(func => this._ticker.remove(func, this));
		this._ticker = null;
		this._perEffectTickHandlers = null;

		SequencerAnimationEngine.endAnimations(this.id);

		if (this._maskContainer) this._maskContainer.destroy({ children: true });
		this._maskContainer = null;
		if (this._maskSprite) {
			try {
				this._maskSprite.texture.destroy(true);
				this._maskSprite.destroy();
			} catch (err) {
			}
			this._maskSprite = null;
		}

		if (this._stageMasks?.length) {
			for (const shape of this._stageMasks) {
				try {
					if (shape?.parent) shape.parent.removeChild(shape);
					shape?.destroy?.({ children: true });
				} catch (err) {
				}
			}
			this._stageMasks.length = 0;
		}
		this._wallMaskGraphics = null;

		this.sprite?.destroy();
		this.sprite = null;

		if (this.data.screenSpaceAboveUI) {
			SequencerAboveUILayer.removeContainerByEffect(this);
		}

		if (this.data.syncGroup) {
			SyncGroups.remove(this);
		}
		this.removeChildren().forEach((child) => child.destroy({ children: true }));

		this.rotationContainer = null;
		this.pluginContainer = null;
		this.spriteContainer = null;
	}

	/**
	 * Plays preset animations
	 *
	 * @private
	 */
	_playPresetAnimations() {
		this._moveTowards();

		this._fadeOut();
		this._fadeIn();

		this._rotateOut();
		this._rotateIn();

		this._scaleOut();
		this._scaleIn();

		this._fadeOutAudio();
		this._fadeInAudio();
	}

	/**
	 * Gets an object based on an identifier, checking if it exists within the named offset map, whether it's a
	 * coordinate object, or if it's an UUID that needs to be fetched from the scene
	 *
	 * @param inIdentifier
	 * @param specific
	 * @param returnSource
	 * @returns {*}
	 * @private
	 */
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
		let registerVoidProxy = false;
		if (this.data.screenSpaceAboveUI) {
			layer = SequencerAboveUILayer;
		} else if (this.data.screenSpace) {
			layer = canvas.sequencerEffectsUILayer;
		} else if (this.data.aboveInterface) {
			layer = canvas.controls;
		} else if (this.data.aboveLighting) {
			layer = canvas.interface;
		} else {
			// Render inside the primary canvas group so that effects
			// participate in elevation/sortLayer/sort ordering with tokens,
			// tiles, drawings, and weather.
			layer = canvas.primary;
			registerVoidProxy = true;
		}

		if (!layer || typeof layer.addChild !== "function") return;

		layer.addChild(this);
		layer.sortChildren?.();

		// For default-routed effects, register an ERASE-blend proxy in the
		// interface group so the effect visually "punches through" any
		// region highlights drawn above the primary group. Matches Foundry's
		// Token#voidMesh mechanism (isolated by InterfaceCanvasGroup's
		// VoidFilter so the erase does not leak into non-interface pixels).
		if (registerVoidProxy) this._registerVoidProxy();
	}

	/* -------------------------------------------------------------- */
	/*  Region "punch-through" (voidMesh proxy)                       */
	/* -------------------------------------------------------------- */

	/**
	 * Register an ERASE-blend proxy container in the interface group so
	 * this effect visually punches through region highlights that draw
	 * above the primary canvas group.
	 *
	 * The proxy itself has no geometry. Its `render` callback reaches back
	 * into this effect's sub-tree and re-renders every visible mesh/graphic/
	 * text element with BLEND_MODES.ERASE. InterfaceCanvasGroup has a
	 * VoidFilter that isolates its framebuffer, so the erase is constrained
	 * to interface-group pixels only.
	 *
	 * @private
	 */
	_registerVoidProxy() {
		if (this._voidProxy || !canvas?.interface) return;
		const proxy = new PIXI.Container();
		// No local geometry; skip transform work.
		proxy.updateTransform = () => {};
		// Render last within the interface group, above RegionLayer.
		proxy.zIndex = 1000;
		proxy.__sequencerOwner = this;
		proxy.render = (renderer) => this._renderAsVoid(renderer);
		canvas.interface.addChild(proxy);
		this._voidProxy = proxy;
	}

	/**
	 * Root render hook for the voidMesh proxy. Guards and dispatches
	 * to the subtree-walking renderer. Silent failure on error (the
	 * effect still renders in its primary layer).
	 *
	 * @param {PIXI.Renderer} renderer
	 * @private
	 */
	_renderAsVoid(renderer) {
		if (this._destroyed || this._isEnding) return;
		if (!this.renderable || !this.visible || this.worldAlpha <= 0) return;
		if (!CanvasEffect._sceneHasActiveRegionHighlights()) return;
		try {
			this._renderSubtreeAsVoid(renderer, this, null);
		} catch (err) {
			if (CONFIG.debug?.sequencer) {
				console.warn("Sequencer | voidProxy render error", err);
			}
		}
	}

	static _sceneHasActiveRegionHighlights() {
		const layer = canvas?.regions;
		if (!layer) return false;
		const placeables = layer.placeables;
		if (!placeables?.length) return false;
		for (let i = 0; i < placeables.length; i++) {
			const region = placeables[i];
			if (region?.visible && region?.renderable) return true;
		}
		return false;
	}

	_renderSubtreeAsVoid(renderer, displayObject, outerFilter) {
		if (!displayObject) return;
		if (!displayObject.renderable || !displayObject.visible) return;
		if ((displayObject.worldAlpha ?? 1) <= 0) return;

		const filters = displayObject.filters;
		const mask = displayObject._mask;

		let enabledFilters = null;
		if (filters?.length) {
			let anyDisabled = false;
			for (let i = 0; i < filters.length; i++) {
				if (!filters[i].enabled) { anyDisabled = true; break; }
			}
			if (anyDisabled) {
				const scratch = this._voidEnabledFilters ??= [];
				scratch.length = 0;
				for (let i = 0; i < filters.length; i++) {
					if (filters[i].enabled) scratch.push(filters[i]);
				}
				if (scratch.length) enabledFilters = scratch.slice();
			} else {
				enabledFilters = filters;
			}
		}

		const hasFilter = !!enabledFilters && enabledFilters.length > 0;
		const hasMask = !!mask && (!mask.isMaskData
			|| (mask.enabled && (mask.autoDetect || mask.type !== PIXI.MASK_TYPES.NONE)));
		const flush = hasFilter || hasMask;

		let pushedFilter = null;
		let priorFilterBlend;
		let promoted = false;
		let nextOuterFilter = outerFilter;

		if (flush) renderer.batch.flush();
		if (hasFilter) {
			renderer.filter.push(displayObject, enabledFilters);
			const installed = renderer.filter.defaultFilterStack?.at?.(-1);
			const installedFilters = installed?.filters ?? enabledFilters;
			pushedFilter = installedFilters[installedFilters.length - 1];
			if (!outerFilter && pushedFilter) {
				priorFilterBlend = pushedFilter.blendMode;
				pushedFilter.blendMode = PIXI.BLEND_MODES.ERASE;
				promoted = true;
				nextOuterFilter = pushedFilter;
			}
		}
		if (hasMask) renderer.mask.push(displayObject, mask);

		const isMeshLike = typeof displayObject._render === "function"
			&& (displayObject.isSprite === true
				|| displayObject instanceof PIXI.Mesh
				|| displayObject instanceof PIXI.Graphics
				|| displayObject instanceof PIXI.Text);

		const shouldBlendLeaf = isMeshLike && !nextOuterFilter;
		let originalLeafBlend;
		if (shouldBlendLeaf) {
			originalLeafBlend = displayObject.blendMode;
			displayObject.blendMode = PIXI.BLEND_MODES.ERASE;
		}

		try {
			if (isMeshLike) {
				if (displayObject.cullable && typeof displayObject._renderWithCulling === "function") {
					displayObject._renderWithCulling(renderer);
				} else {
					displayObject._render(renderer);
				}
			}

			const children = displayObject.children;
			if (children?.length) {
				for (let i = 0, n = children.length; i < n; i++) {
					this._renderSubtreeAsVoid(renderer, children[i], nextOuterFilter);
				}
			}
		} finally {
			if (shouldBlendLeaf) displayObject.blendMode = originalLeafBlend;
			if (promoted && pushedFilter) pushedFilter.blendMode = priorFilterBlend;
			if (flush) {
				try { renderer.batch.flush(); } catch (_) { /* best-effort */ }
			}
			if (hasMask) {
				try { renderer.mask.pop(displayObject); } catch (_) { /* best-effort */ }
			}
			if (hasFilter) {
				try { renderer.filter.pop(); } catch (_) { /* best-effort */ }
			}
		}
	}

	/**
	 * Remove and destroy the voidMesh proxy if one was registered.
	 *
	 * @private
	 */
	_teardownVoidProxy() {
		const proxy = this._voidProxy;
		if (!proxy) return;
		this._voidProxy = null;
		try {
			if (proxy.parent) proxy.parent.removeChild(proxy);
			proxy.destroy({ children: false });
		} catch (err) {
			if (CONFIG.debug?.sequencer) {
				console.warn("Sequencer | voidProxy teardown error", err);
			}
		}
	}

	get startTimeMs() {
		return this._startTime * 1000;
	}

	get endTimeMs() {
		return this._endTime * 1000;
	}

	/**
	 * Calculates the duration of this effect, based on animation durations, the video source duration, end/start times, etc
	 *
	 * @private
	 */
	_calculateDuration() {
		let playbackRate = this.data.playbackRate || 1.0;

		this.mediaPlaybackRate = playbackRate;

		this._animationDuration = this.data.duration || this.mediaDurationMs;

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

			let animationDurations = this.data.animations?.length
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
				this._endTime = this._animationDuration - (this._animationDuration * this.data.time.end.value);
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
			this._animationTimes.loopStart = this._file.markers.loop.start / playbackRate / 1000;
			this._animationTimes.loopEnd = this._file.markers.loop.end / playbackRate / 1000;
			this._animationTimes.forcedEnd = this._file.markers.forcedEnd / playbackRate / 1000;
		}

		this._totalDuration = this.loops
			? (this._animationDuration * this.loops) + (this.loopDelay * (this.loops - 1))
			: this._animationDuration;

		this._totalDuration /= playbackRate;

		if (this.data.persist) {
			this.mediaLooping = (
				(!this.data.time || (this._startTime === 0 && this._endTime === this.mediaDuration)) &&
				this._animationTimes.loopStart === undefined &&
				this._animationTimes.loopEnd === undefined &&
				!this.loops &&
				!this.loopDelay
			);
		} else {
			this.mediaLooping = this._startTime === 0 && this._endTime > this.mediaDuration && !(this.loops && this.loopDelay);
		}

		// Resolve duration promise so that owner of effect may know when it is finished
		this._durationResolve?.(this._totalDuration);
		this._durationResolve = null;
	}

	/**
	 * If this effect is animatable, hold off on rendering it for a bit so that the animations have time to initialize to
	 * prevent it from spawning and then jumping to the right place
	 *
	 * @private
	 */
	_timeoutVisibility() {
		if (!this.data.animations) {
			return this._setupHooks();
		}
		this._setTimeout(() => {
			this._setupHooks();
		}, 50);
	}

	/**
	 * Add Ticker handler to check for updates to attached objects
	 *
	 * @private
	 */
	_registerTickers() {
		const handlers = [];

		//stretchTo && attached to stretchTo
		if (this.data.stretchTo && this.data.stretchTo?.attachTo) {
			handlers.push(this._transformStretchToAttachedSprite);
		}
		// attachTo, not attached to stretchTo
		if (this.data.attachTo?.active && !this.data.stretchTo?.attachTo) {
			handlers.push(this._transformAttachedNoStretchSprite);
		}

		// rotateTowards
		if (this.data.rotateTowards && this.data.rotateTowards?.attachTo) {
			handlers.push(this._transformRotateTowardsAttachedSprite);
		}

		// scaleTo
		if (this.data.scaleToObject && this.data?.attachTo?.active && this.data?.attachTo?.bindScale) {
			const { heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY } = this._getBaseScale();
			handlers.push(function scaleTick() {
				this._applyScaleToObject(heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY);
				this._setAnchors();
			});
		}

		// source or target destroy safeguards
		if (this.isSourceTemporary) handlers.push(this._checkSourceDestroyed);
		if (this.isTargetTemporary) handlers.push(this._checkTargetDestroyed);

		if (!handlers.length) return;

		this._perEffectTickHandlers = handlers;
		this._addToTicker(this._perEffectTick);
	}

	_perEffectTick() {
		const handlers = this._perEffectTickHandlers;
		if (!handlers) return;
		for (let i = 0; i < handlers.length; i++) {
			try {
				handlers[i].call(this);
			} catch (err) {
				if (CONFIG.debug?.sequencer) {
					console.warn("Sequencer | per-effect ticker handler threw", err);
				}
			}
		}
	}

	_checkSourceDestroyed() {
		if (this.isSourceDestroyed) {
			this._source = this.sourcePosition;
			this._source.uuid = this.uuid;
			SequencerEffectManager.endEffects({ effects: this });
		}
	}

	_checkTargetDestroyed() {
		if (this.isTargetDestroyed) {
			this._target = this.targetPosition;
			SequencerEffectManager.endEffects({ effects: this });
		}
	}

	async _createFile() {
		if (this.data.copySprite) {
			let targetDocument = fromUuidSync(this.data.copySprite.uuid);
			if (targetDocument?.ring?.enabled && targetDocument.object) {
				let clonedObject = targetDocument.object.clone();
				await clonedObject.draw();
				let clonedMesh = clonedObject.mesh;
				clonedMesh.position.set(0, 0);
				clonedMesh.setShaderClass(CONFIG.Token.ring.shaderClass);
				this._renderTexture = canvas.app.renderer.generateTexture(clonedMesh, {
					resolution: clonedMesh.texture.resolution
				});
				clonedObject.destroy();
				return;
			}
		}

		if (this.data.file === "") {
			return;
		}

		let file;
		if (this.data.customRange) {
			const template = this.template ? [this.template.gridSize, this.template.startPoint, this.template.endPoint] : [100, 0, 0]
			file = SequencerFileBase.make(
				this.data.file,
				"temporary.range.file",
				{ template },
			);
		} else if (Sequencer.Database.entryExists(this.data.file)) {
			file = Sequencer.Database.getEntry(this.data.file).clone();
		} else {
			file = SequencerFileBase.make(this.data.file)
			this._currentFilePath = this.data.file;
		}

		if (file.template) {
			this._template =
				foundry.utils.mergeObject(
					{ gridSize: file.template[0], startPoint: file.template[1], endPoint: file.template[2] },
					this.data.template ?? {}
				)
		}
		file.fileIndex = this.data.forcedIndex;
		file.twister = this._twister;
		this._file = file
		this._isRangeFind = file?.rangeFind;
	}

	_updateCurrentFilePath(distance, showDistanceWarning = false) {
		if (this.data.copySprite && this._renderTexture) {
			this._currentFilePath = this.data.copySprite.uuid;
			return;
		}
		if (!this._file) {
			return;
		}
		if (!this.data.stretchTo) {
			this._currentFilePath = this._file.getFile();
			return;
		}
		distance = distance || (new foundry.canvas.geometry.Ray(this.sourcePosition, this.targetPosition)).distance;
		if (distance === 0 && showDistanceWarning) {
			lib.custom_error(
				"effect",
				`stretchTo - You are stretching over a distance of "0", you may be attempting to stretch between two of the same coordinates!`
			);
		}
		this._currentFilePath = this._file.getFileForDistance(distance);
	}

	/**
	 * Creates the sprite, and the relevant containers that manage the position and offsets of the overall visual look of the sprite
	 *
	 * @private
	 */
	async _createSprite() {
		if (this.data.copySprite?.offsetX !== undefined && this.data.copySprite?.offsetY !== undefined) {
			this.rotationContainer.position.set(this.data.copySprite.offsetX, this.data.copySprite.offsetY);
		}

		this._initializing = true;
		this._recomputeRenderable();
		const spriteData = {
			texture: this._renderTexture,
			antialiasing: this.data?.fileOptions?.antialiasing,
			tiling: this.data.tilingTexture,
			xray: this.data.xray || this.data.screenSpace || this.data.screenSpaceAboveUI,
			isPersisted: this.data.persist && !this.data.loopOptions?.endOnLastLoop
		}
		/** @type {SequencerSpriteManager} */
		this.sprite = new SequencerSpriteManager(this._file, spriteData)
		this.spriteContainer.addChild(this.sprite)
		this.sprite.id = this.id + "-sprite";
		this.sprite.loopDelay = this.loopDelay
		this.sprite.currentTime = this._startTime
		this.sprite.loop = this.loops

		await this.sprite.activate(this._currentFilePath)

		if (this.data.copySprite && !this._renderTexture && !this.data.time?.start) {
			const sourcePlaceable = fromUuidSync(this.data.copySprite.uuid)?.object ?? null;
			const sourceTime = sourcePlaceable?.sourceElement?.currentTime;
			if (Number.isFinite(sourceTime) && sourceTime > 0) {
				this.sprite.currentTime = sourceTime;
			}
		}

		this.sprite.volume = (this.data.volume ?? 0) * game.settings.get("core", "globalInterfaceVolume");

		if (this._isRangeFind && this.data.stretchTo && (this.data.attachTo?.active || this.data.stretchTo?.attachTo?.active)) {
			this.sprite.preloadVariants()
		}

		if (this.data.text) {
			const text = this.data.text.text;
			const fontSettings = foundry.utils.deepClone(this.data.text);
			fontSettings.fontSize = (fontSettings?.fontSize ?? 26) * (150 / canvas.grid.size);
			const textSprite = this.sprite.addText({ text, textStyle: fontSettings })
			textSprite.zIndex = 1;
			const textAnchor = this.data.text.anchor
			textSprite.anchor.set(textAnchor?.x ?? 0.5, textAnchor?.y ?? 0.5);
		}

		this.sprite.filters = [];

		if (this.data.filters) {
			for (let index = 0; index < this.data.filters.length; index++) {
				const filterData = this.data.filters[index];
				const filter = new filters[filterData.className](filterData.data);
				filter.id = this.id + "-" + filterData.className + "-" + index.toString();
				if (filter instanceof PIXI.ColorMatrixFilter) {
					this.sprite.colorMatrixFilter = filter;
				} else {
					this.sprite.filters.push(filter);
				}
				const filterKeyName = filterData.name || filterData.className;
				this.effectFilters[filterKeyName] = filter;
			}
		}

		this.effectAlpha = this.data.opacity

		let spriteOffsetX = this.data.spriteOffset?.x ?? 0;
		let spriteOffsetY = this.data.spriteOffset?.y ?? 0;
		if (this.data.spriteOffset?.gridUnits) {
			spriteOffsetX *= canvas.grid.size;
			spriteOffsetY *= canvas.grid.size;
		}

		this.sprite.position.set(spriteOffsetX, spriteOffsetY);

		this.sprite.anchor?.set(
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

		const offsetMap = this._nameOffsetMap?.[this.data.source];
		if (offsetMap?.angle !== undefined) {
			this._customAngle += offsetMap?.angle;
		}
		if (offsetMap?.randomRotation) {
			this._customAngle += lib.random_float_between(-360, 360, offsetMap.twister);
		}

		this.spriteContainer.rotation = -Math.normalizeRadians(
			Math.toRadians(this._customAngle)
		);

		PluginsManager.createSprite({ effect: this });

		if (this.data.tint) {
			this.sprite.tint = this.data.tint;
		}

		if (this.data.blendMode != null) {
			this.sprite.blendMode = this.data.blendMode;
		}

		// only set filter and fade effects when a faded version should actually be shown
		if (this.shouldShowFadedVersion) {
			this.alpha = game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") / 100;
			this.filters = [
				new PIXI.ColorMatrixFilter({
					saturation: -1,
				}),
			];
		}

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

	/**
	 * Single place to write to this.renderable. Other code paths set their
	 * gate slot (e.g. _baseRenderable) and call this; don't bypass.
	 *
	 * @private
	 */
	_recomputeRenderable() {
		if (this._initializing) {
			this.renderable = false;
			return;
		}
		const base = this._baseRenderable ?? this.shouldPlayVisible;
		const paused = this._pauseRenderable !== false;
		this.renderable = base && paused && this._isOnViewedLevel();
	}

	/**
	 * Whether this effect is visible on the currently viewed scene level.
	 * Always true on Foundry v13, and on `.screenSpace()`,
	 * `.screenSpaceAboveUI()`, and `.aboveInterface()` effects.
	 *
	 * @returns {boolean}
	 * @private
	 */
	_isOnViewedLevel() {
		if (!CONSTANTS.IS_V14) return true;
		const currentLevel = canvas?.level;
		if (!currentLevel) return true;
		if (this.data.screenSpace || this.data.screenSpaceAboveUI || this.data.aboveInterface) {
			return true;
		}

		const crossLevels = currentLevel.visibility?.levels;
		const sceneLevels = canvas.scene?.levels;

		if (this.data.levels?.length) {
			for (const entry of this.data.levels) {
				let id = entry;
				if (sceneLevels && !sceneLevels.get(id)) {
					id = sceneLevels.getName?.(entry)?.id ?? entry;
				}
				if (id === currentLevel.id) return true;
				if (crossLevels?.has(id)) return true;
			}
			return false;
		}

		// An explicit `.elevation()` range or `absolute` wins over
		// the source's level membership.
		const hasExplicitSpatial = !!this.data.elevation
			&& (typeof this.data.elevation.top === "number" || this.data.elevation.absolute === true);
		const sourceAttached = !hasExplicitSpatial && this.data.attachTo?.active
			&& typeof this.sourceDocument?.viewed === "boolean";
		const targetAttached = !hasExplicitSpatial
			&& (this.data.stretchTo?.attachTo || this.data.rotateTowards?.attachTo)
			&& typeof this.targetDocument?.viewed === "boolean";
		if (sourceAttached || targetAttached) {
			if (sourceAttached && isDocOnViewedLevel(this.sourceDocument, currentLevel)) return true;
			if (targetAttached && isDocOnViewedLevel(this.targetDocument, currentLevel)) return true;
			return false;
		}

		if (sceneLevels?.size === 1 && sceneLevels.has(foundry.documents.BaseScene.metadata.defaultLevelId)) {
			return true;
		}

		const [zMin, zMax, topInclusive] = this._getEffectiveVerticalExtent();
		const viewed = currentLevel.elevation;
		let levelMatch = intervalsOverlap(zMin, zMax, viewed.bottom, viewed.top, topInclusive);
		if (!levelMatch && crossLevels?.size) {
			const allLevels = canvas.scene?.levels;
			for (const otherId of crossLevels) {
				const other = allLevels?.get(otherId)?.elevation;
				if (!other) continue;
				if (intervalsOverlap(zMin, zMax, other.bottom, other.top, topInclusive)) {
					levelMatch = true;
					break;
				}
			}
		}
		if (!levelMatch) return false;

		// Hide an unattached effect the same way Foundry hides tokens through its culling system
		const pos = this.sourcePosition;
		if (!pos || !canvas.scene) return true;
		return !isPositionCulled(canvas.scene, currentLevel, pos.x, pos.y, zMin, zMax);
	}

	/**
	 * The effect's vertical `[zMin, zMax, topInclusive]` in scene elevation
	 * units. Pinned by an explicit `.elevation()`; otherwise inherits the
	 * source/target's extent (Token depth, Region elevation range and its
	 * `topInclusive` flag).
	 *
	 * @returns {[number, number, boolean]}
	 * @private
	 */
	_getEffectiveVerticalExtent() {
		const out = this._verticalExtent;
		if (this.data.elevation) {
			out[0] = (typeof this.elevationBottom === "number") ? this.elevationBottom : this.elevation;
			out[1] = (typeof this.elevationTop === "number") ? this.elevationTop : out[0];
			out[2] = !!this.data.elevation.topInclusive;
			return out;
		}

		const sourceExtent = canvaslib.get_object_vertical_extent(this.sourceDocument);
		const targetExtent = canvaslib.get_object_vertical_extent(this.targetDocument);

		if (sourceExtent && targetExtent) {
			out[0] = Math.min(sourceExtent[0], targetExtent[0]);
			out[1] = Math.max(sourceExtent[1], targetExtent[1]);
			out[2] = !!(sourceExtent[1] >= targetExtent[1] ? sourceExtent[2] : false)
				|| !!(targetExtent[1] >= sourceExtent[1] ? targetExtent[2] : false);
			return out;
		}
		if (sourceExtent) { out[0] = sourceExtent[0]; out[1] = sourceExtent[1]; out[2] = !!sourceExtent[2]; return out; }
		if (targetExtent) { out[0] = targetExtent[0]; out[1] = targetExtent[1]; out[2] = !!targetExtent[2]; return out; }
		out[0] = this.elevation; out[1] = this.elevation; out[2] = false;
		return out;
	}

	updateElevation() {
		let targetElevation = Math.max(
			canvaslib.get_object_elevation(this.source ?? {}),
			canvaslib.get_object_elevation(this.target ?? {})
		);

		const offset = this.data.elevation?.absolute ? 0 : targetElevation;
		const bottom = (this.data.elevation?.elevation ?? 0) + offset;
		const top = (typeof this.data.elevation?.top === "number")
			? this.data.elevation.top + offset
			: null;
		this.elevationBottom = bottom;
		this.elevationTop = top;

		// Anchor above the highest level floor the effect's top reaches
		// into, so a multi-level effect keeps its sort position when the
		// viewed level changes.
		let renderElevation = bottom;
		const onDefaultRoute = !this.data.aboveLighting && !this.data.aboveInterface
			&& !this.data.screenSpace && !this.data.screenSpaceAboveUI;
		if (onDefaultRoute) {
			const [, extentTop, extentTopInclusive] = this._getEffectiveVerticalExtent();
			const effectiveTop = (typeof extentTop === "number") ? extentTop : bottom;
			const sceneLevels = canvas?.scene?.levels;
			if (sceneLevels) {
				for (const level of sceneLevels) {
					const lvlBottom = level.elevation?.bottom;
					if (!Number.isFinite(lvlBottom)) continue;
					const crosses = extentTopInclusive
						? (effectiveTop >= lvlBottom)
						: (effectiveTop > lvlBottom);
					if (crosses && lvlBottom > renderElevation) renderElevation = lvlBottom;
				}
			}
		}
		this.elevation = renderElevation;
		let sort = !lib.is_real_number(this.data.zIndex)
			? (this?.parent?.children?.length ?? 0)
			: 100000;
		sort = PluginsManager.elevation({ effect: this, sort })
		sort += 100;
		this.sort = sort;
		// sortLayer defaults to the CanvasEffect class default (800), which
		// sits between PrimaryCanvasGroup.SORT_LAYERS.TOKENS (700) and
		// WEATHER (1000). Fall back explicitly when data.sortLayer is
		// unset so we never pass undefined to the primary group sort
		// (which would treat it as 0 and place effects below tiles).
		this.sortLayer = this.data.sortLayer ?? 800;
		// When routed to the interface group (.aboveLighting()), anchor
		// the effect above RegionLayer (zIndex ~100/600) and below the
		// controls layer (zIndex ~1000). The interface group sorts
		// children by zIndex, not sortLayer, so we bake it in here.
		if (this.data.aboveLighting) {
			this.zIndex = 750 + (lib.is_real_number(this.data.zIndex) ? this.data.zIndex : 0);
		} else {
			this.zIndex = sort + (lib.is_real_number(this.data.zIndex) ? this.data.zIndex : 0);
		}
		if (this.parent) {
			this.parent.sortDirty = true;
		}
		// Elevation changes can flip level membership. e.g. an effect at
		// elevation 15 sits in level 2 [10, 20]; raise it to elevation 25
		// and it's on level 3 [20, 30], so visibility must re-evaluate.
		this._recomputeRenderable();
	}

	updateTransform() {
		super.updateTransform();
		if (this.data.screenSpace || this.data.screenSpaceAboveUI) {
			if (!canvas?.screenDimensions) return;
			const [screenWidth, screenHeight] = canvas.screenDimensions;

			if (this._lastScreenDimensions?.screenWidth !== screenWidth
				|| this._lastScreenDimensions?.screenHeight !== screenHeight) {
				this._lastScreenDimensions.screenWidth = screenWidth;
				this._lastScreenDimensions.screenHeight = screenHeight;
			}

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

				this._lastScreenDimensions.width = this.sprite.texture?.width || this._lastScreenDimensions.width || this.sprite.width || this.spriteContainer.children[this.spriteContainer.children.length - 1].width;
				this._lastScreenDimensions.height = this.sprite.texture?.height || this._lastScreenDimensions.height || this.sprite.height || this.spriteContainer.children[this.spriteContainer.children.length - 1].height;

				if (scaleData.fitX) {
					scaleX = scaleX * (screenWidth / this._lastScreenDimensions.width);
				}

				if (scaleData.fitY) {
					scaleY = scaleY * (screenHeight / this._lastScreenDimensions.height);
				}

				scaleX = scaleData.ratioX ? scaleY : scaleX;
				scaleY = scaleData.ratioY ? scaleX : scaleY;

				this.scale.set(scaleX, scaleY);
			}
		}
	}

	async _setupMasks() {
		const maskShapes = this.data.shapes.filter((shape) => shape.isMask);

		if (!this.data?.masks?.length && !maskShapes.length && !this.data?.constrainedByWalls) return;

		const maskFilter = MaskFilter.create();

		if (this.data.constrainedByWalls) {
			this._setupWallMask(maskFilter);
		}

		for (const entry of this.data.masks) {
			if (entry && typeof entry === "object" && entry.__shape) {
				const rawShape = canvaslib.deserializeShape(entry.__shape);
				if (!rawShape) continue;
				const graphics = new PIXI.LegacyGraphics().beginFill().drawShape(rawShape).endFill();
				graphics.cullable = true;
				graphics.custom = true;
				graphics.renderable = false;
				graphics.uuid = "__rawShape-" + foundry.utils.randomID();
				canvas.stage.addChild(graphics);
				this._stageMasks.push(graphics);
				maskFilter.masks.push(graphics);
				continue;
			}

			const uuid = entry;
			const documentObj = fromUuidSync(uuid);

			if (!documentObj || documentObj.parent.id !== this.data.sceneId) continue;

			const obj = documentObj.object;
			const docName = documentObj.documentName;

			let shape = obj?.mesh;
			let shapeToAdd = shape;

			if (docName === "Region") {

				// documentObj.polygons works without the placeable; negative
				// polygons (ring inner disc, etc.) become holes.
				shape = new PIXI.LegacyGraphics()

				for (let polygon of documentObj.polygons) {
					if (polygon.isPositive) {
						shape.beginFill();
					} else {
						shape.beginHole();
					}
					shape.drawShape(polygon);
					if (polygon.isPositive) {
						shape.endFill();
					} else {
						shape.endHole();
					}
				}

				shapeToAdd = shape;

				shapeToAdd.cullable = true;
				shapeToAdd.custom = true;
				shapeToAdd.renderable = false;
				shapeToAdd.uuid = uuid;
				canvas.stage.addChild(shapeToAdd);
				this._stageMasks.push(shapeToAdd);

			} else if (docName === "Token" || docName === "Tile") {
				if (!obj?.mesh) continue;
				maskFilter.masks.push(obj.mesh);
				continue;
			} else if (docName === "MeasuredTemplate" || docName === "Drawing") {
				// MeasuredTemplates are always instantiated; off-level
				// Drawings fall back to doc-shape construction.
				if (obj) {
					shape = obj?.shape?.geometry?.graphicsData?.[0]?.shape ?? obj?.shape;
				} else if (docName === "Drawing") {
					shape = canvaslib.create_drawing_mask_shape(documentObj);
				} else {
					continue;
				}
				if (!shape) continue;

				shape = PluginsManager.masking({
					effect: this,
					doc: documentObj,
					obj,
					shape
				});

				shapeToAdd = new PIXI.LegacyGraphics()
					.beginFill()
					.drawShape(shape)
					.endFill();

				if (docName === "MeasuredTemplate") {
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
				this._stageMasks.push(shapeToAdd);
			} else {
				continue;
			}
			shapeToAdd.obj = obj;

			const updateMethod = (doc) => {
				if (doc !== documentObj) return;
				const mask = maskFilter.masks.find((shape) => shape.uuid === uuid);
				if (!mask) return;
				if (!mask.custom) return;
				mask.clear();
				if (docName === "Region") {
					for (let polygon of documentObj.polygons) {
						if (polygon.isPositive) {
							mask.beginFill();
						} else {
							mask.beginHole();
						}
						mask.drawShape(polygon);
						if (polygon.isPositive) {
							mask.endFill();
						} else {
							mask.endHole();
						}
					}
				} else if (docName === "MeasuredTemplate") {
					mask.position.set(documentObj.x, documentObj.y);
					let maskObj = documentObj.object;
					shape = maskObj?.shape?.geometry?.graphicsData?.[0]?.shape ?? maskObj?.shape;
					shape = PluginsManager.masking({
						effect: this,
						doc: documentObj,
						obj: maskObj,
						shape
					});
					mask.beginFill().drawShape(shape).endFill();
				} else if (docName === "Drawing") {
					const {
						x,
						y,
						shape: { width, height },
						rotation,
					} = documentObj;
					mask.pivot.set(width / 2, height / 2);
					mask.position.set(x + width / 2, y + height / 2);
					mask.angle = rotation;
					let updatedShape;
					if (documentObj.object) {
						updatedShape = documentObj.object?.shape?.geometry?.graphicsData?.[0]?.shape
							?? documentObj.object?.shape;
					} else {
						updatedShape = canvaslib.create_drawing_mask_shape(documentObj);
					}
					if (updatedShape) mask.beginFill().drawShape(updatedShape).endFill();
				}
			};

			PluginsManager.maskingHooks.forEach(hook => {
				hooksManager.addHook(this.uuid, hook, (doc) => {
					setTimeout(() => {
						updateMethod(doc);
					}, 100);
				});
			});

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
	 * Builds the initial wall-constrained mask graphic and wires hooks that recompute
	 * the sweep when walls change or when the attached source moves.
	 *
	 * @param {MaskFilter} maskFilter
	 * @private
	 */
	_setupWallMask(maskFilter) {
		const shape = this._computeWallPolygon();
		if (!shape) return;

		const graphics = new PIXI.LegacyGraphics().beginFill().drawShape(shape).endFill();
		graphics.cullable = true;
		graphics.custom = true;
		graphics.renderable = false;
		graphics.uuid = "__constrainedByWalls";
		canvas.stage.addChild(graphics);
		this._stageMasks.push(graphics);
		maskFilter.masks.push(graphics);
		this._wallMaskGraphics = graphics;

		const recompute = () => {
			if (!this._wallMaskGraphics || this._ended) return;
			const next = this._computeWallPolygon();
			if (!next) return;
			this._wallMaskGraphics.clear().beginFill().drawShape(next).endFill();
		};

		const debouncedRecompute = () => {
			if (this._wallMaskDirty) return;
			this._wallMaskDirty = true;
			this._setTimeout(() => {
				this._wallMaskDirty = false;
				recompute();
			}, 100);
		};

		for (const hook of ["createWall", "updateWall", "deleteWall"]) {
			hooksManager.addHook(this.uuid, hook, debouncedRecompute);
		}

		if (CONSTANTS.IS_V14) {
			for (const hook of ["createLevel", "updateLevel", "deleteLevel"]) {
				hooksManager.addHook(this.uuid, hook, (level) => {
					if (level?.parent?.id !== this.data.sceneId) return;
					debouncedRecompute();
				});
			}
		}

		const attachedToSource = this.data.attachTo?.active && lib.is_UUID(this.data.source);
		const sourceRefreshHook = attachedToSource && this.getSourceHook("refresh");
		if (sourceRefreshHook) {
			hooksManager.addHook(this.uuid, sourceRefreshHook, (placeable) => {
				if (placeable?.document?.uuid !== this.data.source) return;
				recompute();
			});
		}
	}

	/**
	 * Computes the wall-constrained polygon for this effect from the source position.
	 *
	 * @returns {PIXI.Polygon|null}
	 * @private
	 */
	_computeWallPolygon() {
		const cfg = this.data.constrainedByWalls;
		if (!cfg) return null;

		const origin = cfg.origin ?? this.sourcePosition;
		if (!origin || !lib.is_real_number(origin.x) || !lib.is_real_number(origin.y)) return null;

		const elevation = lib.is_real_number(origin.elevation)
			? origin.elevation
			: canvaslib.get_object_elevation(this.source ?? this.sourceDocument ?? {});

		return canvaslib.computeWallPolygon({ ...origin, elevation }, {
			type: cfg.type,
			radius: cfg.radius,
			level: cfg.level ?? this._resolveWallSweepLevel(),
		});
	}

	/**
	 * Resolves which scene Level the wall sweep should consult on Foundry v14.
	 * Returns null on v13 (where Levels do not exist) and when no clear
	 * affinity is available, in which case the polygon backend falls back to
	 * `canvas.level` (the currently viewed level).
	 *
	 * Priority: an attached source's `document.level`, then a single-entry
	 * `.onLevels()` selection, then the lowest-elevation Level whose vertical
	 * range overlaps the effect.
	 *
	 * @returns {foundry.documents.Level|null}
	 * @private
	 */
	_resolveWallSweepLevel() {
		if (!CONSTANTS.IS_V14) return null;
		const sceneLevels = canvas.scene?.levels;
		if (!sceneLevels?.size) return null;

		const sourceDoc = this.sourceDocument;
		const attachedLevelId = this.data.attachTo?.active ? sourceDoc?.level : null;
		if (attachedLevelId) {
			const fromSource = sceneLevels.get(attachedLevelId);
			if (fromSource) return fromSource;
		}

		if (this.data.levels?.length === 1) {
			const entry = this.data.levels[0];
			const fromSection = sceneLevels.get(entry) ?? sceneLevels.getName?.(entry);
			if (fromSection) return fromSection;
		}

		const [zMin, zMax, topInclusive] = this._getEffectiveVerticalExtent();
		let best = null;
		for (const level of sceneLevels) {
			const ext = level.elevation;
			if (!ext) continue;
			if (intervalsOverlap(zMin, zMax, ext.bottom, ext.top, topInclusive)) {
				if (!best || (ext.bottom ?? -Infinity) < (best.elevation.bottom ?? -Infinity)) {
					best = level;
				}
			}
		}
		return best;
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
		let alpha = null;

		if (attachedToSource) {
			hooksManager.addHook(this.uuid, this.getSourceHook("delete"), (doc) => {
				const uuid = doc.uuid;
				if (doc !== this.sourceDocument) return;
				this._source = this._cachedSourceData.position;
				this._source.uuid = uuid;
				SequencerEffectManager.objectDeleted(uuid);
			});

			if (this.isSourceDestroyed) {
				SequencerEffectManager.objectDeleted(this.sourceDocument.uuid);
			}

			if (this.data.attachTo?.bindVisibility) {
				hooksManager.addHook(
					this.uuid,
					"sightRefresh",
					() => {
						if (this._ended) return;
						const sourceVisible =
							this.source
							&& isAttachedPlaceableVisible(this.source)
							&& !this.sourceMesh?.occluded;
						const sourceHidden =
							this.sourceDocument && (this.sourceDocument?.hidden ?? false);
						const targetVisible =
							this.target
							&& isAttachedPlaceableVisible(this.target)
							&& (!attachedToTarget || (this.targetMesh?.occluded ?? true));
						this._baseRenderable =
							baseRenderable &&
							(!sourceHidden || game.user.isGM) &&
							(sourceVisible || targetVisible) &&
							this._checkWallCollisions();
						this.alpha = sourceVisible && sourceHidden ? 0.5 : 1.0;
						this._recomputeRenderable();
					},
					{ effect: this, callNow: true }
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

			if (CONSTANTS.IS_V14) {
				hooksManager.addHook(this.uuid, this.getSourceHook("update"), (doc, changed) => {
					if (doc !== this.sourceDocument) return;
					if (changed?.level === undefined) return;
					this._recomputeRenderable();
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
			if (this.isTargetDestroyed) {
				SequencerEffectManager.objectDeleted(this.targetDocument.uuid);
			}
			hooksManager.addHook(this.uuid, this.getTargetHook("update"), (doc) => {
				if (doc !== this.target) return;
				this.updateElevation();
			});

			if (CONSTANTS.IS_V14) {
				hooksManager.addHook(this.uuid, this.getTargetHook("update"), (doc, changed) => {
					if (doc !== this.targetDocument) return;
					if (changed?.level === undefined) return;
					this._recomputeRenderable();
				});
			}
		}

		// Level documents can mutate independently of the viewed-level
		// switch (which redraws the whole canvas). Edits to elevation,
		// `visibility.levels`, etc. need to re-evaluate every effect.
		if (CONSTANTS.IS_V14) {
			hooksManager.addHook(this.uuid, "updateLevel", (level) => {
				if (level.parent?.id !== this.data.sceneId) return;
				this._recomputeRenderable();
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

		this._setTimeout(() => {
			if (this._ended) return;
			// Seed _baseRenderable when no sightRefresh listener registered.
			if (this._baseRenderable === undefined) {
				this._baseRenderable = baseRenderable;
			}
			// Normalize the pause gate before clearing _initializing.
			// A loop-end pause that fired during init would otherwise
			// leave _pauseRenderable === false, which the post-init
			// recompute reads as paused and hides the effect until the
			// pause cascade lands.
			this._pauseRenderable = true;
			this._initializing = false;
			this._recomputeRenderable();
			if (this.spriteContainer) this.spriteContainer.alpha = alpha ?? 1.0;
		}, 25);
	}

	/**
	 * Calculates the padding and scale to stretch an effect across the given distance
	 *
	 * If the file is a SequencerFileBase instance, it will also pick the appropriate file for the right distance
	 *
	 * @param {number} distance
	 * @param {number} textureWidth
	 * @returns {Object}
	 * @private
	 */
	async _getDistanceScaling(distance, textureWidth) {
		if (!this._distanceCache || this._distanceCache?.distance !== distance) {
			let scaleX = 1.0;
			let scaleY = 1.0;

			if (this._file instanceof SequencerFileBase) {

				const startPoint = this.template?.startPoint ?? 0
				const endPoint = this.template?.endPoint ?? 0
				const widthWithPadding = textureWidth - (startPoint + endPoint);

				const spriteScale = distance / widthWithPadding

				scaleX = spriteScale;
				scaleY = this.data.stretchTo?.onlyX ? widthWithPadding / textureWidth : spriteScale;
			}

			this._distanceCache = {
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
		const ray = new foundry.canvas.geometry.Ray(this.sourcePosition, this.targetPosition);

		this._rotateTowards(ray);

		const distance = ray.distance / (this.data.scale.x ?? 1.0);

		this._updateCurrentFilePath(distance)
		await this.sprite.activate(this._currentFilePath)
		const texture = this.sprite.texture

		let { scaleX, scaleY } = await this._getDistanceScaling(distance, texture.width);

		if (this.data.attachTo?.active) {
			const { x, y } = this.sourcePosition;
			this.position.set(x, y);
		}

		if (this.data.tilingTexture) {
			const scaleX = (this.data.scale.x ?? 1.0);
			const scaleY = (this.data.scale.y ?? 1.0);
			this.sprite.scale.set(scaleX * this.flipX, scaleY * this.flipY);
			this.sprite.width = distance * scaleX;
			this.sprite.height = texture.height * scaleY;

			this.sprite.tileScale.x = this.data.tilingTexture.scale.x * scaleX;
			this.sprite.tileScale.y = this.data.tilingTexture.scale.y * scaleY;
			this.sprite.tilePosition = this.data.tilingTexture.position;
		} else {
			this.sprite.scale.set(
				scaleX * (this.data.scale.x ?? 1.0) * this.flipX,
				scaleY * (this.data.scale.y ?? 1.0) * this.flipY
			);
		}

	}

	_setAnchors() {
		let anchor = { x: 0.5, y: 0.5, ...(this.data.spriteAnchor ?? null) }

		if (
			(this.data.rotateTowards && this.data.rotateTowards.template) ||
			this.data.stretchTo
		) {
			const textureWidth = this.sprite.texture?.width ?? this.sprite.width;
			const templateAnchorX = this.template ? this.template.startPoint / textureWidth : undefined;
			anchor = { x: templateAnchorX, y: 0.5 }
		}
		if (this.data.rotateTowards && !this.data.rotateTowards.template && !this.data.anchor) {
			this.spriteContainer.pivot.set(this.sprite.width * -0.5, 0);
		} else {
			this.spriteContainer.pivot.set(
				lib.interpolate(
					this.sprite.width * -0.5,
					this.sprite.width * 0.5,
					this.data.anchor?.x ?? 0.5
				),
				lib.interpolate(
					this.sprite.height * -0.5,
					this.sprite.height * 0.5,
					this.data.anchor?.y ?? 0.5
				)
			);
		}

		this.sprite.anchor?.set(
			this.flipX === 1 ? anchor.x : 1 - anchor.x,
			anchor.y
		);
	}

	_checkWallCollisions() {
		if (
			!this.data.stretchTo?.attachTo ||
			!this.data.stretchTo?.requiresLineOfSight
		)
			return true;

		const ray = new foundry.canvas.geometry.Ray(this.sourcePosition, this.targetPosition);

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
			ray = new foundry.canvas.geometry.Ray(sourcePosition, targetPosition);
		}

		this.rotationContainer.rotation = Math.normalizeRadians(
			ray.angle + Math.toRadians(this.data.rotateTowards?.rotationOffset ?? 0)
		);

		PluginsManager.rotation({ effect: this });
	}

	/**
	 * Transforms the sprite, rotating it, stretching it, scaling it, sizing it according its data
	 *
	 * @private
	 */
	async _transformSprite() {
		if (this.data.stretchTo) {
			await this._applyDistanceScaling();
		}

		if (!this.data.stretchTo) {
			this._transformNoStretchSprite();
		}

		if (!this.data.screenSpace && (!this.data.attachTo?.active || this.data.stretchTo?.attachTo)) {
			const { x, y } = this.sourcePosition;
			this.position.set(x, y);
		}

		if (this.data.rotateTowards) {
			this._rotateTowards();
		}

		this._setAnchors()
		PluginsManager.rotation({ effect: this });
		this.sprite.updateDefaultScaling()
	}

	async _transformStretchToAttachedSprite() {
		try {
			await this._applyDistanceScaling();
			this._setAnchors()
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

		const { heightWidthRatio, widthHeightRatio, baseScaleX, baseScaleY } = this._getBaseScale()

		if (this.data.scaleToObject) {
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
		} else if (this.data.screenSpace) {
			this.sprite.scale.set(
				baseScaleX,
				baseScaleY
			);
		} else {
			this.sprite.scale.set(
				baseScaleX * this.gridSizeDifference,
				baseScaleY * this.gridSizeDifference
			);
		}
	}

	/**
	 * Calculate the base scale and aspect ratios of the sprite
	 *
	 * @returns {{heightWidthRatio: number, widthHeightRatio: number, baseScaleX: number, baseScaleY: number}}
	 *
	 * @private
	 */
	_getBaseScale() {
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

		return {
			heightWidthRatio,
			widthHeightRatio,
			baseScaleX,
			baseScaleY,
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

	_transformAttachedNoStretchSprite() {

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

		const sourceData = this.getSourceData();
		if (applyRotation) {
			this.rotationContainer.rotation = sourceData.rotation;
		}

		PluginsManager.rotation({ effect: this });

		const { x, y } = this._resolveSourcePosition(sourceData);
		this.position.set(x, y);
	}

	_transformRotateTowardsAttachedSprite() {
		if (this.isDestroyed) return;
		try {
			this._rotateTowards();
			this._setAnchors()
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
			if (animation.target === 'alphaFilter') {
				animation.target = this
				animation.propertyName = 'effectAlpha'
			} else if (animation.target === "effect") {
				animation.target = this;
			} else {
				animation.target = foundry.utils.getProperty(this, animation.target);
			}

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

			if (
				["position.x", "position.y", "height", "width"].includes(
					animation.propertyName
				) &&
				animation.screenSpace
			) {
				const [screenWidth, screenHeight] = canvas.screenDimensions;
				const dimension = animation.propertyName === "position.x" || animation.propertyName === "width"
					? screenWidth
					: screenHeight;
				animation.from *= dimension;
				animation.to *= dimension;
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
			if (animation.target === 'alphaFilter') {
				animation.target = this
				animation.propertyName = 'effectAlpha'
			} else if (animation.target === "effect") {
				animation.target = this;
			} else {
				animation.target = foundry.utils.getProperty(this, animation.target);
			}

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

		this.effectAlpha = 0.0;

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this,
			propertyName: "effectAlpha",
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
		if (!this.data.fadeInAudio || !this.sprite || !this.sprite.hasAnimatedMedia) return 0;

		let fadeInAudio = this.data.fadeInAudio;

		if (
			this.actualCreationTime -
			(this.creationTimestamp +
				fadeInAudio.duration +
				fadeInAudio.delay) >
			0
		)
			return;

		this.sprite.volume = 0.0;

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this.sprite,
			propertyName: "volume",
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

		const fadeOut = this.data.fadeOut;
		const delay = lib.is_real_number(immediate)
			? Math.max(immediate - fadeOut.duration + fadeOut.delay, 0)
			: Math.max(this._totalDuration - fadeOut.duration + fadeOut.delay, 0);

		SequencerAnimationEngine.addAnimation(this.id, {
			target: this,
			propertyName: "effectAlpha",
			to: 0.0,
			duration: fadeOut.duration,
			ease: fadeOut.ease,
			delay,
			absolute: true,
		});

		return fadeOut.duration + delay;
	}

	/**
	 * Fades out the effect at the end of the effect's duration
	 *
	 * @returns {number|*}
	 * @private
	 */
	_fadeOutAudio(immediate = false) {
		if (!this.data.fadeOutAudio || !this.sprite || !this.sprite.hasAnimatedMedia) return 0;

		const fadeOutAudio = this.data.fadeOutAudio;
		const delay = lib.is_real_number(immediate)
			? Math.max(immediate - fadeOutAudio.duration + fadeOutAudio.delay, 0)
			: Math.max(
				this._totalDuration - fadeOutAudio.duration + fadeOutAudio.delay,
				0
			);

		setTimeout(() => {
			SequencerAnimationEngine.addAnimation(this.id, {
				target: this.sprite,
				propertyName: "volume",
				to: 0.0,
				duration: fadeOutAudio.duration,
				ease: fadeOutAudio.ease,
				delay,
				absolute: true,
			});
		});

		return fadeOutAudio.duration + delay;
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

		const scaleOut = this.data.scaleOut;
		const scale = this._determineScale(scaleOut);

		const delay = lib.is_real_number(immediate)
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
				delay,
				absolute: true,
			},
			{
				target: this.sprite,
				propertyName: "scale.y",
				to: scale.y,
				duration: scaleOut.duration,
				ease: scaleOut.ease,
				delay,
				absolute: true,
			},
		]);

		return scaleOut.duration + delay;
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

		const rotateOut = this.data.rotateOut;

		const delay = lib.is_real_number(immediate)
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
				delay,
				absolute: true,
			})
		);

		return rotateOut.duration + delay;
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

		const targetPos = this.targetPosition;

		let movementDuration = this._totalDuration;
		if (this.data.moveSpeed) {
			const distance = canvaslib.distance_between(
				this.sourcePosition,
				targetPos
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
				to: targetPos.x,
				duration: duration,
				ease: moves.ease,
				delay: moves.delay,
				absolute: true
			},
			{
				target: this,
				propertyName: "position.y",
				to: targetPos.y,
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
		this._setTimeout(() => {
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
			this._setTimeout(() => {
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

		let creationTimeDifference = this.data.persist ? this.actualCreationTime - this.creationTimestamp : 0;
		creationTimeDifference *= this.mediaPlaybackRate

		// +1 because "loops: 1" means we run the animation one time, not that it restarts once
		// whereas 0 means endless looping.
		this._currentLoops = Math.floor(creationTimeDifference / this._totalDuration) + 1;

		if (this.loops && this._currentLoops > this.loops) {
			if (this.data.loopOptions?.endOnLastLoop || !this.data.persist) {
				return this.endEffect();
			}
			await this.pauseMedia();
			this.mediaCurrentTime = this._endTime;
			if (this.sprite.texture) {
				this._pauseRenderable = false;
				this._recomputeRenderable();
				this._setTimeout(() => {
					this.updateTexture();
					this._setTimeout(() => {
						this._pauseRenderable = true;
						this._recomputeRenderable();
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
		} else if ((creationTimeDifference / 1000) > this._animationTimes.loopStart) {
			const loopDuration =
				this._animationTimes.loopEnd - this._animationTimes.loopStart;
			this._loopOffset =
				(creationTimeDifference % (loopDuration * 1000)) / 1000;
		}

		if (this._loopOffset) {
			this.mediaCurrentTime = this._loopOffset
		}
		await this.playMedia();
		this._addToTicker(this.loopHandler);
	}

	async loopHandler() {
		if (this._ended || this._isEnding) {
			return;
		}
		const endTime = this.data.persist ? (this._animationTimes.loopEnd ?? this._endTime) : this._endTime;
		if (this.mediaCurrentTime < endTime) {
			return;
		}
		if (this.restartLoopHandler != null) {
			return;
		}

		// if we're above end time, we can safely just pause for now
		this.pauseMedia();

		// default media current time to exactly end time so we don't
		// continue to trigger certain parts of the following code
		// unnecessarily
		this.mediaCurrentTime = this._endTime;

		// if we reached maximum loops, stay paused or even end the effect
		if ((this.loops || !this.data.persist) && this._currentLoops >= this.loops) {
			if (!this.data.persist || (this.data.persist && this.data.loopOptions?.endOnLastLoop)) {
				this.endEffect();
			}
			this._ticker?.remove(this.loopHandler, this);
			return;
		}

		const restartTime = this._startTime === 0 && this._animationTimes.loopStart
			? this._animationTimes.loopStart
			: this._startTime;
		// no loop delay means just start again at the beginning!
		if (!this.loopDelay) {
			this._currentLoops++;
			this.mediaCurrentTime = restartTime;
			this.playMedia();
			return;
		}

		this._currentLoops++;
		// register restart handler to trigger after loop delay
		this.restartLoopHandler = this._setTimeout(() => {
			this.restartLoopHandler = null;
			this.mediaCurrentTime = restartTime;
			this.playMedia();
		}, this.loopDelay)
	}
}

class PersistentCanvasEffect extends CanvasEffect {

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
		this._setTimeout(() => {
			this._setupHooks();
		}, timeout);
	}

	/** @OVERRIDE */
	_setEndTimeout() {
		let creationTimeDifference = this.actualCreationTime - this.creationTimestamp;
		if (this.loops && creationTimeDifference >= this._totalDuration && this.hasAnimatedMedia) {
			this._setTimeout(() => {
				this.pauseMedia();
			}, this._totalDuration);
		}
	}

	/** @OVERRIDE */
	async endEffect() {
		if (this._isEnding) return;
		this._isEnding = true;
		let extraEndDuration = this.data.extraEndDuration ?? 0;
		this.mediaLooping = false;
		if (this._animationTimes?.forcedEnd) {
			this.mediaCurrentTime = this._animationTimes.forcedEnd;
			extraEndDuration += (this.mediaDuration - (this._animationTimes?.forcedEnd ?? 0)) * 1000;
		} else if (this._animationTimes?.loopEnd) {
			extraEndDuration += (this.mediaDuration - this.mediaCurrentTime) * 1000;
		}
		const fromEndCustomAnimations = this._getFromEndCustomAnimations(extraEndDuration);
		const durations = [
			this._fadeOut(extraEndDuration),
			this._fadeOutAudio(extraEndDuration),
			this._scaleOut(extraEndDuration),
			this._rotateOut(extraEndDuration),
			extraEndDuration,
			...fromEndCustomAnimations.map(
				(animation) => animation.duration + animation.delay
			),
		].filter(Boolean);
		SequencerAnimationEngine.addAnimation(this.id, fromEndCustomAnimations);
		const waitDuration = Math.max(...durations, 0);
		this._resolve(waitDuration);
		return new Promise((resolve) =>
			this._setTimeout(() => {
				super.endEffect();
				resolve(this.data);
			}, waitDuration)
		);
	}
}
