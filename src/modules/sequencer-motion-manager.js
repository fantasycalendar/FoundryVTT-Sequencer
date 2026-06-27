import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import { easeFunctions } from "../canvas-effects/ease.js";
import * as canvaslib from "../lib/canvas-lib.js";
import * as lib from "../lib/lib.js";
import {
	PROPERTY_NAMES,
	lerp,
	sampleTrack,
	motionHasReturningTracks,
} from "../lib/motion-lib.js";
import flagManager from "../utils/flag-manager.js";
import SequenceManager from "./sequence-manager.js";

const MOTION_REGISTRY = new Map();

class Motion {
	constructor(config, restState, meshOriginOffset) {
		this._id = config._id;
		this.sequenceId = config.sequenceId ?? null;
		this.name = config.name ?? null;
		this.persist = !!config.persist;
		this.persistUntilUpdate = !!config.persistUntilUpdate;
		this.done = false;
		this.returnTriggeredAt = undefined;
		this.settleOverride = undefined;
		this.actualCreationTime = Date.now();
		this.creationTimeDelta = this.actualCreationTime - config.creationTimestamp;
		this.startTime = performance.now();
		this.finished = new Promise((resolve) => {
			this._resolveFinished = resolve;
		});
		this.oscillate = config.oscillate ?? [];
		this.noise = (config.noise ?? []).map((noise) => ({
			...noise,
			waveform: canvaslib.buildNoiseWaveform(noise),
		}));

		this.tracks = {
			x: [],
			y: [],
			rotation: [],
			scale: [],
			alpha: [],
			tint: [],
		};
		for (const propertyName of PROPERTY_NAMES) {
			const sourceTracks = config.tracks?.[propertyName] ?? [];
			for (const sourceTrack of sourceTracks) {
				this.tracks[propertyName].push(
					this.#buildTrack(sourceTrack, propertyName, restState, meshOriginOffset)
				);
			}
		}
	}

	/**
	 * Build a runtime track from the section's TrackConfig: clone, fill in
	 * `startTime`, and for absolute position/rotation tracks resolve `from`
	 * to the rest state and convert document-space targets to mesh-space
	 * via `meshOriginOffset`.
	 */
	#buildTrack(sourceTrack, propertyName, restState, meshOriginOffset) {
		const track = { ...sourceTrack, startTime: this.startTime - this.creationTimeDelta };
		if (propertyName === "tint") {
			track.lerpFn = track.colorSpace === "hsv" ? lib.lerpColorHSV : lib.lerpColor;
		}
		if (!track.absolute) return track;

		if (propertyName === "x") {
			track.from = restState.x;
			if (track.form === "single") {
				track.to = track.to + meshOriginOffset.x;
			} else {
				track.frames = track.frames.map((frame) => ({
					...frame,
					v: frame.v + meshOriginOffset.x,
				}));
				if (track.returnFrames) {
					track.returnFrames = track.returnFrames.map((frame) => ({
						...frame,
						v: frame.v + meshOriginOffset.x,
					}));
				}
			}
		} else if (propertyName === "y") {
			track.from = restState.y;
			if (track.form === "single") {
				track.to = track.to + meshOriginOffset.y;
			} else {
				track.frames = track.frames.map((frame) => ({
					...frame,
					v: frame.v + meshOriginOffset.y,
				}));
				if (track.returnFrames) {
					track.returnFrames = track.returnFrames.map((frame) => ({
						...frame,
						v: frame.v + meshOriginOffset.y,
					}));
				}
			}
		} else if (propertyName === "rotation") {
			track.from = restState.angle;
		} else if (propertyName === "tint") {
			track.from = restState.tint;
		}
		return track;
	}

	sampleAt(now) {
		if (this.done) return null;

		let deltaX = 0;
		let deltaY = 0;
		let deltaAngle = 0;
		let scaleMultiplier = 1;
		let alphaMultiplier = 1;
		let tintR = 1;
		let tintG = 1;
		let tintB = 1;
		let anyAlive = false;

		for (const propertyName of PROPERTY_NAMES) {
			for (const track of this.tracks[propertyName]) {
				const sample = sampleTrack(track, this, now);
				if (sample === null) continue;
				anyAlive = true;
				switch (propertyName) {
					case "x":
						deltaX += track.absolute ? sample - track.from : sample;
						break;
					case "y":
						deltaY += track.absolute ? sample - track.from : sample;
						break;
					case "rotation":
						deltaAngle += track.absolute ? sample - track.from : sample;
						break;
					case "scale":
						scaleMultiplier *= sample;
						break;
					case "alpha":
						alphaMultiplier *= sample;
						break;
					case "tint": {
						const sR = (sample >> 16) & 0xff;
						const sG = (sample >> 8) & 0xff;
						const sB = sample & 0xff;
						const fR = (track.from >> 16) & 0xff;
						const fG = (track.from >> 8) & 0xff;
						const fB = track.from & 0xff;
						tintR *= fR === 0 ? 1 : sR / fR;
						tintG *= fG === 0 ? 1 : sG / fG;
						tintB *= fB === 0 ? 1 : sB / fB;
						break;
					}
				}
			}
		}

		for (const oscillate of this.oscillate) {
			const oscillateSample = canvaslib.sampleOscillation(oscillate, this, now);
			if (oscillateSample === null) continue;
			anyAlive = true;
			deltaX += oscillateSample.deltaX;
			deltaY += oscillateSample.deltaY;
			deltaAngle += oscillateSample.deltaAngle;
			scaleMultiplier *= oscillateSample.scaleMultiplier;
			alphaMultiplier *= oscillateSample.alphaMultiplier;
		}

		for (const noise of this.noise) {
			const noiseSample = canvaslib.sampleNoise(noise, this, now);
			if (noiseSample === null) continue;
			anyAlive = true;
			deltaX += noiseSample.deltaX;
			deltaY += noiseSample.deltaY;
			deltaAngle += noiseSample.deltaAngle;
		}

		if (!anyAlive) return null;
		return { deltaX, deltaY, deltaAngle, scaleMultiplier, alphaMultiplier, tintR, tintG, tintB };
	}

	triggerReturn(settleOverride) {
		if (this.returnTriggeredAt !== undefined) return;
		this.returnTriggeredAt = performance.now();
		this.settleOverride = settleOverride;

		// Capture mid-outward values into `interruptedFrom` so the return
		// lerps from where the sprite was, not from `track.to`.
		for (const propertyName of PROPERTY_NAMES) {
			for (const track of this.tracks[propertyName]) {
				if (track.form !== "single") continue;
				const elapsed = this.returnTriggeredAt - track.startTime - (track.delay ?? 0);
				if (elapsed >= 0 && elapsed < track.duration) {
					const easeFunction = easeFunctions[track.ease] ?? easeFunctions.linear;
					const progress = easeFunction(elapsed / track.duration);
					const lerpFn = track.lerpFn ?? lerp;
					track.interruptedFrom = lerpFn(track.from, track.to, progress);
				}
			}
		}
	}

	markDone() {
		this.done = true;
	}

	/**
	 * Resolve the `finished` promise the section is awaiting. Called from
	 * every aggregator path that removes this motion from its set, so a
	 * `.waitUntilFinished()` on a persistent motion knows when to release
	 * the rest of the sequence.
	 */
	_finish() {
		this._resolveFinished();
		SequenceManager.RunningMotions.delete(this._id);
	}

	/**
	 * Removes this motion's persisted flag, if it was persisted. Called
	 * from every Motion end path in PlaceableMotionAggregator so the flag
	 * does not survive natural completion, explicit endMotion, or scene
	 * teardown. Non-persistent motions skip this safely because their
	 * flag was never written.
	 */
	_removeFlag(uuid) {
		if (!this.persist && !this.persistUntilUpdate) return;
		flagManager.removeFlags(uuid, { motions: [this._id] });
	}
}

class PlaceableMotionAggregator {
	constructor(uuid, placeable, target) {
		this.uuid = uuid;
		this.placeable = placeable;
		this.target = target;
		this.motions = new Set();

		// PIXI-space rest state. Foundry's OBJECTS=23 drain has already
		// applied the latest document values to `target.*` this frame.
		this.restState = {
			x: target.position.x,
			y: target.position.y,
			angle: target.angle,
			scaleX: target.scale.x,
			scaleY: target.scale.y,
			alpha: target.alpha,
			tint: target.tint ?? 0xffffff,
		};

		const documentRestState = canvaslib.getDocumentRestState(placeable);
		this.lastDocumentState = {
			x: documentRestState.x,
			y: documentRestState.y,
			rotation: documentRestState.rotation,
		};

		// `.moveTo` takes document-space coords; `target.position` is
		// mesh-space. Token and Drawing are center-anchored; Tile is
		// top-left. This is the constant offset between the two.
		this.meshOriginOffset = {
			x: this.restState.x - this.lastDocumentState.x,
			y: this.restState.y - this.lastDocumentState.y,
		};

		this.cache = {
			deltaX: 0,
			deltaY: 0,
			deltaAngle: 0,
			scaleMultiplier: 1,
			alphaMultiplier: 1,
			tintR: 1,
			tintG: 1,
			tintB: 1,
		};

		this.tick = this.tick.bind(this);
		this.tornDown = false;
	}

	addMotion(motion) {
		this.motions.add(motion);
	}

	tick() {
		if (this.tornDown) return;
		try {
			// Resolve fresh each tick; the placeable may have been deleted.
			const placeable = fromUuidSync(this.uuid)?.object ?? null;
			const target = placeable ? canvaslib.getMotionTarget(placeable) : null;
			if (!target || target.destroyed) {
				this.teardown(false);
				return;
			}
			this.placeable = placeable;
			this.target = target;

			// (1) Detect document position/rotation change since last frame.
			// Per-axis, because Foundry's renderFlags pipeline only refreshes
			// `target.position.x` / `target.position.y` / `target.angle` on
			// axes whose document fields actually changed. Reading PIXI-space
			// values on an unchanged axis would pick up our own displaced
			// write from the previous frame and compound it.
			const documentRestState = canvaslib.getDocumentRestState(placeable);
			const documentChangedX = documentRestState.x !== this.lastDocumentState.x;
			const documentChangedY = documentRestState.y !== this.lastDocumentState.y;
			const documentChangedRotation = documentRestState.rotation !== this.lastDocumentState.rotation;

			if (documentChangedX || documentChangedY || documentChangedRotation) {
				// (1a) persistUntilUpdate motions: drain on the document update.
				for (const motion of this.motions) {
					if (motion.persistUntilUpdate) motion.markDone();
				}
				// (1b) Per-axis re-snapshot. Foundry's `_refreshPosition` /
				// `_refreshRotation` only fired on axes whose document field
				// changed (see Token#_onAnimationUpdate at token.mjs:2424,
				// Tile#_onUpdate at tile.mjs:436-439, Drawing#_onUpdate at
				// drawing.mjs:640-641). For axes that didn't change,
				// `target.position` / `target.angle` still hold our last
				// displaced write, which must be ignored here.
				let deltaRestX = 0;
				let deltaRestY = 0;
				let deltaRestAngle = 0;
				if (documentChangedX) {
					deltaRestX = target.position.x - this.restState.x;
					this.restState.x = target.position.x;
					this.lastDocumentState.x = documentRestState.x;
				}
				if (documentChangedY) {
					deltaRestY = target.position.y - this.restState.y;
					this.restState.y = target.position.y;
					this.lastDocumentState.y = documentRestState.y;
				}
				if (documentChangedRotation) {
					deltaRestAngle = target.angle - this.restState.angle;
					this.restState.angle = target.angle;
					this.lastDocumentState.rotation = documentRestState.rotation;
				}

				// Translate absolute tracks by the per-axis rest-state delta
				// so the motion stays relative to the new rest state on
				// axes that moved.
				for (const motion of this.motions) {
					if (motion.done) continue;
					for (const propertyName of PROPERTY_NAMES) {
						for (const track of motion.tracks[propertyName]) {
							if (!track.absolute) continue;
							let axisDelta;
							if (propertyName === "x") axisDelta = deltaRestX;
							else if (propertyName === "y") axisDelta = deltaRestY;
							else if (propertyName === "rotation") axisDelta = deltaRestAngle;
							else continue;
							if (axisDelta === 0) continue;
							track.from += axisDelta;
							if (track.form === "single") {
								track.to += axisDelta;
								if (track.interruptedFrom !== undefined) {
									track.interruptedFrom += axisDelta;
								}
							} else {
								for (const frame of track.frames) frame.v += axisDelta;
								if (track.returnFrames) {
									for (const frame of track.returnFrames) frame.v += axisDelta;
								}
							}
						}
					}
				}
			}

			// (2) Compute current displacement from all active motions.
			const now = performance.now();
			let deltaX = 0;
			let deltaY = 0;
			let deltaAngle = 0;
			let scaleMultiplier = 1;
			let alphaMultiplier = 1;
			let tintR = 1;
			let tintG = 1;
			let tintB = 1;
			for (const motion of [...this.motions]) {
				const sample = motion.sampleAt(now);
				if (sample === null) {
					this.motions.delete(motion);
					motion._finish();
					motion._removeFlag(this.uuid);
					continue;
				}
				deltaX += sample.deltaX;
				deltaY += sample.deltaY;
				deltaAngle += sample.deltaAngle;
				scaleMultiplier *= sample.scaleMultiplier;
				alphaMultiplier *= sample.alphaMultiplier;
				tintR *= sample.tintR;
				tintG *= sample.tintG;
				tintB *= sample.tintB;
			}

			// (3) Update cache for getDisplacement consumers.
			this.cache.deltaX = deltaX;
			this.cache.deltaY = deltaY;
			this.cache.deltaAngle = deltaAngle;
			this.cache.scaleMultiplier = scaleMultiplier;
			this.cache.alphaMultiplier = alphaMultiplier;
			this.cache.tintR = tintR;
			this.cache.tintG = tintG;
			this.cache.tintB = tintB;

			// (4) Self-dispose if no motions remain.
			if (this.motions.size === 0) {
				this.teardown(true);
				return;
			}

			// (5) Overwrite last frame's displaced write. No reset to rest
			// state needed; `restState` is kept current by step (1b).
			target.position.set(
				this.restState.x + deltaX,
				this.restState.y + deltaY
			);
			target.angle = this.restState.angle + deltaAngle;
			if (scaleMultiplier !== 1) {
				target.scale.set(
					this.restState.scaleX * scaleMultiplier,
					this.restState.scaleY * scaleMultiplier
				);
			}
			if (alphaMultiplier !== 1) {
				target.alpha = this.restState.alpha * alphaMultiplier;
			}
			if (tintR !== 1 || tintG !== 1 || tintB !== 1) {
				const restR = (this.restState.tint >> 16) & 0xff;
				const restG = (this.restState.tint >> 8) & 0xff;
				const restB = this.restState.tint & 0xff;
				const finalR = Math.max(0, Math.min(0xff, Math.round(restR * tintR)));
				const finalG = Math.max(0, Math.min(0xff, Math.round(restG * tintG)));
				const finalB = Math.max(0, Math.min(0xff, Math.round(restB * tintB)));
				target.tint = (finalR << 16) | (finalG << 8) | finalB;
			}
		} catch (error) {
			console.error("Sequencer | motion aggregator threw; removing handler", error);
			this.teardown(false);
		}
	}

	teardown(triggerRefresh) {
		if (this.tornDown) return;
		this.tornDown = true;
		canvas.app?.ticker?.remove(this.tick);
		MOTION_REGISTRY.delete(this.uuid);
		for (const motion of this.motions){
			motion._finish();
		}
		this.motions.clear();
		if (!triggerRefresh) return;
		const placeable = this.placeable;
		const target = this.target;
		if (!placeable || placeable._destroyed || !target || target.destroyed) return;
		// Queue Foundry's pipeline to restore position/rotation; write
		// scale/alpha directly since renderFlags doesn't cover them.
		if (placeable.renderFlags) {
			placeable.renderFlags.set({
				refreshPosition: true,
				refreshRotation: true,
			});
		}
		target.scale.set(this.restState.scaleX, this.restState.scaleY);
		target.alpha = this.restState.alpha;
		target.tint = this.restState.tint;
	}
}

export default class SequencerMotionManager {
	static registerHooks() {
		Hooks.on("canvasTearDown", () => {
			for (const aggregator of [...MOTION_REGISTRY.values()]) {
				aggregator.teardown(false);
			}
			MOTION_REGISTRY.clear();
		});
	}

	/**
	 * Reads persisted motion flags from the journal and replays each
	 * motion locally via _startMotion. Called on canvasReady after the
	 * scene's documents have finished loading. Stale flags (the target
	 * placeable no longer exists) are removed.
	 */
	static async initializePersistentMotions() {
		SequencerMotionManager.tearDownPersistentMotions();
		const allMotionFlags = flagManager.getDatabaseFlags().motions;
		const motionsToRemove = {};
		for (const [uuid, motions] of Object.entries(allMotionFlags)) {
			const doc = fromUuidSync(uuid);
			if (!doc) {
				motionsToRemove[uuid] = motions;
				continue;
			}
			if (doc.parent?.id && doc.parent.id !== canvas.scene?.id) continue;
			// Read through getMotionFlags so any registered motion
			// migrations run before resurrection, matching how
			// getEffectFlags / getSoundFlags migrate on read.
			for (const [, motionData] of flagManager.getMotionFlags(doc)) {
				SequencerMotionManager._startMotion(motionData);
			}
		}
		for (const [uuid, motions] of Object.entries(motionsToRemove)) {
			flagManager.removeFlags(uuid, {
				motions: motions.map(([id]) => id),
				removeAllMotions: true,
			});
		}
	}

	/**
	 * Tears down all in-memory motion aggregators without touching flags.
	 * Called from the canvasTearDown hook. Mirrors
	 * SequencerEffectManager.tearDownPersistentEffects.
	 */
	static tearDownPersistentMotions() {
		for (const aggregator of [...MOTION_REGISTRY.values()]) {
			aggregator.teardown(false);
		}
		MOTION_REGISTRY.clear();
	}

	/**
	 * Start a motion. `data` is the serializable payload built by
	 * MotionSection. Returns `{ duration, finished }`: `duration` is the
	 * outward (+ return) span the section uses for its non-persistent wait;
	 * `finished` is a promise that resolves when the motion is removed
	 * from the aggregator. The section awaits `finished` for persistent
	 * motions so `.waitUntilFinished()` releases when the motion actually
	 * ends (matching the effect-section convention).
	 */
	static startMotion(data, push = true) {
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.START_MOTION, data);
			if (data.persist || data.persistUntilUpdate) {
				flagManager.addFlags(data.uuid, { motions: data });
			}
		}
		return SequencerMotionManager._startMotion(data);
	}

	static _startMotion(data) {
		const noop = { duration: 0, finished: Promise.resolve() };
		if (game.user.viewedScene !== data.sceneId) return noop;
		if (Array.isArray(data.users) && data.users.length && !data.users.includes(game.userId)) return noop;

		const document = fromUuidSync(data.uuid);
		const placeable = document?.object ?? null;
		if (!placeable) return noop;
		const target = canvaslib.getMotionTarget(placeable);
		if (!target) return noop;

		let aggregator = MOTION_REGISTRY.get(data.uuid);
		if (!aggregator) {
			aggregator = new PlaceableMotionAggregator(data.uuid, placeable, target);
			MOTION_REGISTRY.set(data.uuid, aggregator);
			canvas.app.ticker.add(aggregator.tick, undefined, PIXI.UPDATE_PRIORITY.NORMAL + 1);
		}

		const motion = new Motion(data, aggregator.restState, aggregator.meshOriginOffset);
		aggregator.addMotion(motion);
		SequenceManager.RunningMotions.add(motion._id, { id: motion._id, data });
		return { duration: data.overallDuration ?? 0, finished: motion.finished };
	}

	/**
	 * End motions matching the given target and filter. Mirrors
	 * `SequencerEffectManager.endEffects` in shape: user-facing arguments in,
	 * normalized internal data out, then dispatch through the socket.
	 *
	 * @param {object|string|null} target  A placeable, document, uuid string,
	 *   or `null` to match every aggregator (the `endAllMotions` case).
	 * @param {object} [options]           Optional filter:
	 *   - `sequenceId`: only end motions from this sequence.
	 *   - `name`: only end motions whose `.name()` matches.
	 *   - `settle`: override the configured returnDuration for the wind-down.
	 *   - `sceneId`: defaults to the viewer's current scene.
	 * @param {boolean} [push=true]        Whether to broadcast to other clients.
	 */
	static endMotion(target, options = {}, push = true) {
		let uuid = null;
		if (target) {
			if (typeof target === "string") uuid = target;
			else uuid = target?.uuid ?? target?.document?.uuid ?? null;
		}
		const data = {
			sceneId: options.sceneId ?? game.user.viewedScene,
			uuid,
			sequenceId: options.sequenceId ?? null,
			name: options.name ?? null,
			settle: options.settle ?? 0,
		};
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_MOTION, data);
		}
		return SequencerMotionManager._endMotion(data);
	}

	/** Shorthand for `endMotion(null, options, push)`. Matches every uuid. */
	static endAllMotions(options = {}, push = true) {
		return SequencerMotionManager.endMotion(null, options, push);
	}

	static _endMotion(data) {
		if (game.user.viewedScene !== data.sceneId) return 0;
		const aggregators = data.uuid
			? [MOTION_REGISTRY.get(data.uuid)].filter(Boolean)
			: Array.from(MOTION_REGISTRY.values());

		let count = 0;
		for (const aggregator of aggregators) {
			for (const motion of [...aggregator.motions]) {
				if (data.sequenceId && motion.sequenceId !== data.sequenceId) continue;
				if (data.name && motion.name !== data.name) continue;

				if (motion.persist) {
					// Remove the flag now, not when the settle animation
					// finishes. `endMotion` is the "this has ended" signal;
					// a reload mid-settle must not resurrect it. The
					// in-memory return leg still plays for the visual, and
					// the tick removes the motion from the set when
					// `sampleAt` returns null.
					motion._removeFlag(aggregator.uuid);
					motion.triggerReturn(data.settle);
				} else if (motion.persistUntilUpdate) {
					// No return leg; endMotion is "cancel the hold now."
					aggregator.motions.delete(motion);
					motion._finish();
					motion._removeFlag(aggregator.uuid);
				} else if (data.settle > 0 && motionHasReturningTracks(motion)) {
					motion.triggerReturn(data.settle);
				} else {
					aggregator.motions.delete(motion);
					motion._finish();
					motion._removeFlag(aggregator.uuid);
				}
				count++;
			}
		}
		return count;
	}

	/**
	 * Read the current per-frame displacement for the given target. Used by
	 * the canvas-lib chokepoint to make `.atLocation(token)` and friends
	 * motion-aware. Returns `null` if no motion is active on the target.
	 *
	 * @param {object|string} target  A placeable, document, or uuid string.
	 * @returns {object|null}
	 */
	static getDisplacement(target) {
		const uuid = target?.uuid ?? target?.document?.uuid ?? target;
		if (typeof uuid !== "string") return null;
		const aggregator = MOTION_REGISTRY.get(uuid);
		if (!aggregator) return null;
		return { ...aggregator.cache };
	}
}
