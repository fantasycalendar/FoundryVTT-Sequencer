import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import { easeFunctions } from "../canvas-effects/ease.js";
import * as canvaslib from "../lib/canvas-lib.js";
import * as lib from "../lib/lib.js";
import {
	PROPERTY_NAMES,
	lerp,
	sampleTrack,
	motionHasReturningTracks,
	resolveAttachedTo,
	resolveTowardsComponent,
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
		this.zIndex = config.zIndex ?? null;
		this.done = false;
		this.returnTriggeredAt = undefined;
		this.settleOverride = undefined;
		this.actualCreationTime = Date.now();
		this.creationTimeDelta = this.actualCreationTime - config.creationTimestamp;
		this.startTime = performance.now();
		this.meshOriginOffset = meshOriginOffset;
		this.uuid = config.uuid;
		this.finished = new Promise((resolve) => {
			this._resolveFinished = resolve;
		});
		this.oscillate = config.oscillate ?? [];
		this.noise = (config.noise ?? []).map((noise, noiseIndex) => ({
			...noise,
			waveform: canvaslib.buildNoiseWaveform(
				noise,
				lib.createMersenneTwister(config.creationTimestamp + noiseIndex)
			),
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
	 * `startTime`, for additive scale tracks convert the signed scale
	 * changes into multipliers of the rest scale, and for absolute
	 * position/rotation tracks resolve `from` to the rest state and convert
	 * document-space targets to mesh-space via `meshOriginOffset`.
	 */
	#buildTrack(sourceTrack, propertyName, restState, meshOriginOffset) {
		const track = { ...sourceTrack, startTime: this.startTime - this.creationTimeDelta };
		if (propertyName === "tint") {
			track.lerpFn = track.colorSpace === "hsv" ? lib.lerpColorHSV : lib.lerpColor;
		}
		if (propertyName === "scale" && track.scaleAdditive) {
			// The change is in document scale units, so the ratio is formed
			// against the document's texture scale; the resulting multiplier
			// is unit-free and applies cleanly to the mesh-space rest scale.
			// Magnitude, so a mirrored (negative) scale keeps its sign.
			const restScale =
				Math.abs(
					track.scaleAxis === "y"
						? restState.documentScaleY
						: restState.documentScaleX
				) || 1;
			const toMultiplier = (delta) => Math.max(0, (restScale + delta) / restScale);
			if (track.form === "single") {
				track.to = toMultiplier(track.to);
			} else {
				track.frames = track.frames.map((frame) => ({
					...frame,
					v: toMultiplier(frame.v),
				}));
				if (track.returnFrames) {
					track.returnFrames = track.returnFrames.map((frame) => ({
						...frame,
						v: toMultiplier(frame.v),
					}));
				}
			}
		}
		if ((propertyName === "x" || propertyName === "y") && track.gridUnits) {
			// The authored value is in grid squares. Convert it to pixels
			// against the scene grid at instantiation, so a resurrected
			// motion re-reads the current grid rather than replaying a pixel
			// count baked against an old one. The pixel `meshOriginOffset`
			// added below for absolute tracks is applied after this scaling.
			const gridSize = canvas?.grid?.size ?? 1;
			if (track.form === "single") {
				track.to = track.to * gridSize;
			} else {
				track.frames = track.frames.map((frame) => ({
					...frame,
					v: frame.v * gridSize,
				}));
				if (track.returnFrames) {
					track.returnFrames = track.returnFrames.map((frame) => ({
						...frame,
						v: frame.v * gridSize,
					}));
				}
			}
		}

		if (!track.absolute) {
			this.#finalizeKeyframeTrack(track);
			return track;
		}

		if (propertyName === "x") {
			track.from = restState.x;
			if (track.form === "single") {
				if (!track.attached) track.to = track.to + meshOriginOffset.x;
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
				if (!track.attached) track.to = track.to + meshOriginOffset.y;
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
		} else if (propertyName === "alpha") {
			track.from = restState.alpha;
		} else if (propertyName === "tint") {
			track.from = restState.tint;
		}
		this.#finalizeKeyframeTrack(track);
		return track;
	}

	/**
	 * Precompute the per-frame invariants of a keyframe-form track once its
	 * frames are in their final values: the summed outward duration and the
	 * return-frame list prefixed with the last outward frame. `sampleTrack`
	 * reads these instead of recomputing them every frame.
	 */
	#finalizeKeyframeTrack(track) {
		if (track.form !== "keyframe") return;
		track.outwardDuration = track.frames.reduce(
			(sum, frame) => sum + frame.segmentDuration,
			0
		);
		if (track.returnFrames) {
			track.effectiveReturnFrames = [
				track.frames[track.frames.length - 1],
				...track.returnFrames,
			];
		}
	}

	sampleAt(now) {
		if (this.done) return null;

		let deltaX = 0;
		let deltaY = 0;
		let deltaAngle = 0;
		let deltaAlpha = 0;
		let scaleMultiplierX = 1;
		let scaleMultiplierY = 1;
		let alphaMultiplier = 1;
		let tintR = 1;
		let tintG = 1;
		let tintB = 1;
		let anyAlive = false;

		// A layer still inside its delay window samples null, the same
		// value it returns when finished.
		const pendingIsAlive = this.returnTriggeredAt === undefined;

		for (const propertyName of PROPERTY_NAMES) {
			for (const track of this.tracks[propertyName]) {
				if (now - track.startTime - (track.delay ?? 0) < 0) {
					if (pendingIsAlive) anyAlive = true;
					continue;
				}
				const sample = sampleTrack(track, this, now);
				if (sample === null) continue;
				anyAlive = true;
				switch (propertyName) {
					case "x": {
						const contributionX = track.towardsUuid
							? sample * resolveTowardsComponent(track, this)
							: sample;
						deltaX += track.absolute ? contributionX - track.from : contributionX;
						break;
					}
					case "y": {
						const contributionY = track.towardsUuid
							? sample * resolveTowardsComponent(track, this)
							: sample;
						deltaY += track.absolute ? contributionY - track.from : contributionY;
						break;
					}
					case "rotation":
						deltaAngle += track.absolute ? sample - track.from : sample;
						break;
					case "scale":
						if (track.scaleAxis === "y") scaleMultiplierY *= sample;
						else scaleMultiplierX *= sample;
						break;
					case "alpha":
						deltaAlpha += track.absolute ? sample - track.from : sample;
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
			if (now - this.startTime - (oscillate.delay ?? 0) + this.creationTimeDelta < 0) {
				if (pendingIsAlive) anyAlive = true;
				continue;
			}
			const oscillateSample = canvaslib.sampleOscillation(oscillate, this, now);
			if (oscillateSample === null) continue;
			anyAlive = true;
			deltaX += oscillateSample.deltaX;
			deltaY += oscillateSample.deltaY;
			deltaAngle += oscillateSample.deltaAngle;
			scaleMultiplierX *= oscillateSample.scaleMultiplier;
			scaleMultiplierY *= oscillateSample.scaleMultiplier;
			alphaMultiplier *= oscillateSample.alphaMultiplier;
		}

		for (const noise of this.noise) {
			if (now - this.startTime - (noise.delay ?? 0) + this.creationTimeDelta < 0) {
				if (pendingIsAlive) anyAlive = true;
				continue;
			}
			const noiseSample = canvaslib.sampleNoise(noise, this, now);
			if (noiseSample === null) continue;
			anyAlive = true;
			deltaX += noiseSample.deltaX;
			deltaY += noiseSample.deltaY;
			deltaAngle += noiseSample.deltaAngle;
		}

		// A persistent zIndex-only motion has no contributing layer but must
		// stay alive to hold its sort override until it is ended.
		if (
			this.zIndex !== null &&
			(this.persist || this.persistUntilUpdate) &&
			this.returnTriggeredAt === undefined
		) {
			anyAlive = true;
		}

		if (!anyAlive) return null;
		return {
			deltaX,
			deltaY,
			deltaAngle,
			deltaAlpha,
			scaleMultiplierX,
			scaleMultiplierY,
			alphaMultiplier,
			tintR,
			tintG,
			tintB
		};
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
					let snapshotTo = track.to;
					if (track.attached) {
						const liveTo = resolveAttachedTo(track, this);
						if (liveTo !== null) {
							snapshotTo = liveTo;
						} else {
							const offset = track.attachAxis === "y"
								? this.meshOriginOffset.y
								: this.meshOriginOffset.x;
							snapshotTo = track.to + offset;
						}
					}
					track.interruptedFrom = lerpFn(track.from, snapshotTo, progress);
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
	 * does not survive natural completion, explicit endMotions, or scene
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
			sort: target.sort ?? 0,
		};

		// Document-space texture scale, for converting `.scaleBy()` changes
		// (document scale units) into mesh-space multipliers; the mesh's
		// `target.scale` above also folds in the texture-to-grid pixel fit.
		// Drawings have no texture scale, so 1 makes the change a fraction
		// of the rest size.
		const documentTexture = placeable.document.texture;
		this.restState.documentScaleX = documentTexture?.scaleX ?? 1;
		this.restState.documentScaleY = documentTexture?.scaleY ?? 1;

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
			deltaAlpha: 0,
			scaleMultiplierX: 1,
			scaleMultiplierY: 1,
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

			// Detect document position/rotation change since last frame.
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
				// persistUntilUpdate motions: drain on the document update.
				for (const motion of this.motions) {
					if (motion.persistUntilUpdate) motion.markDone();
				}
				// Per-axis re-snapshot. Foundry's `_refreshPosition` /
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
								if (!track.attached) track.to += axisDelta;
								if (track.interruptedFrom !== undefined) {
									track.interruptedFrom += axisDelta;
								}
								if (track.attachedOutwardValue !== undefined) {
									track.attachedOutwardValue += axisDelta;
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

			// Compute current displacement from all active motions.
			const now = performance.now();
			let deltaX = 0;
			let deltaY = 0;
			let deltaAngle = 0;
			let deltaAlpha = 0;
			let scaleMultiplierX = 1;
			let scaleMultiplierY = 1;
			let alphaMultiplier = 1;
			let tintR = 1;
			let tintG = 1;
			let tintB = 1;
			// Last active motion that set a `.zIndex()` wins the sort
			// override; null leaves the mesh at its document sort.
			let sortOverride = null;
			for (const motion of [...this.motions]) {
				const sample = motion.sampleAt(now);
				if (sample === null) {
					this.motions.delete(motion);
					motion._finish();
					motion._removeFlag(this.uuid);
					continue;
				}
				if (motion.zIndex !== null) sortOverride = motion.zIndex;
				deltaX += sample.deltaX;
				deltaY += sample.deltaY;
				deltaAngle += sample.deltaAngle;
				deltaAlpha += sample.deltaAlpha;
				scaleMultiplierX *= sample.scaleMultiplierX;
				scaleMultiplierY *= sample.scaleMultiplierY;
				alphaMultiplier *= sample.alphaMultiplier;
				tintR *= sample.tintR;
				tintG *= sample.tintG;
				tintB *= sample.tintB;
			}

			// Update cache for getDisplacement consumers.
			this.cache.deltaX = deltaX;
			this.cache.deltaY = deltaY;
			this.cache.deltaAngle = deltaAngle;
			this.cache.deltaAlpha = deltaAlpha;
			this.cache.scaleMultiplierX = scaleMultiplierX;
			this.cache.scaleMultiplierY = scaleMultiplierY;
			this.cache.alphaMultiplier = alphaMultiplier;
			this.cache.tintR = tintR;
			this.cache.tintG = tintG;
			this.cache.tintB = tintB;

			// Self-dispose if no motions remain.
			if (this.motions.size === 0) {
				this.teardown(true);
				return;
			}

			// Overwrite last frame's displaced write. No reset to rest
			// state needed; `restState` is kept current by the re-snapshot
			// above.
			target.position.set(
				this.restState.x + deltaX,
				this.restState.y + deltaY
			);
			target.angle = this.restState.angle + deltaAngle;
			if (scaleMultiplierX !== 1 || scaleMultiplierY !== 1) {
				target.scale.set(
					this.restState.scaleX * scaleMultiplierX,
					this.restState.scaleY * scaleMultiplierY
				);
			}
			if (deltaAlpha !== 0 || alphaMultiplier !== 1) {
				// Fade deltas add onto the rest alpha; oscillation alpha
				// multiplies the result. Additive deltas can leave [0, 1]
				// when several tracks stack, so clamp the final write.
				const composedAlpha =
					(this.restState.alpha + deltaAlpha) * alphaMultiplier;
				target.alpha = Math.max(0, Math.min(1, composedAlpha));
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
			// Foundry's `_refreshState` resets `mesh.sort` to the document
			// sort; rewrite the override every frame so the mesh wins its
			// same-elevation ordering while the motion runs. Set `sortDirty`
			// so the primary group re-sorts on the changed value.
			if (sortOverride !== null && target.sort !== sortOverride) {
				target.sort = sortOverride;
				if (target.parent) target.parent.sortDirty = true;
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
		if (target.sort !== this.restState.sort) {
			target.sort = this.restState.sort;
			if (target.parent) target.parent.sortDirty = true;
		}
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
	 * Two calling forms are accepted:
	 *   - Positional: `endMotions(target, options)` where `target` is a
	 *     placeable, document, or uuid string.
	 *   - Single options object: `endMotions({ object, name, sequenceId,
	 *     settle, sceneId })`, where `object` (or `target`) is the
	 *     placeable / document / uuid string.
	 *
	 * The unscoped "end every motion on the scene" path has exactly one
	 * entry point: a `null`/omitted first argument (used by `endAllMotions`).
	 * A non-null first argument that resolves to neither a target nor a
	 * recognized options object throws, rather than silently ending every
	 * motion.
	 *
	 * @param {object|string|null} target  A placeable, document, uuid string,
	 *   an options object, or `null` to match every aggregator.
	 * @param {object} [options]           Optional filter (ignored when the
	 *   first argument is itself an options object):
	 *   - `sequenceId`: only end motions from this sequence.
	 *   - `name`: only end motions whose `.name()` matches.
	 *   - `settle`: override the configured returnDuration for the wind-down.
	 *   - `sceneId`: defaults to the viewer's current scene.
	 * @param {boolean} [push=true]        Whether to broadcast to other clients.
	 */
	static endMotions(target, options = {}, push = true) {
		const extractUuid = (candidate) => {
			if (typeof candidate === "string") return candidate;
			return candidate?.uuid ?? candidate?.document?.uuid ?? null;
		};

		let uuid = null;
		let resolvedOptions = options;

		if (target === null || target === undefined) {
			// The sole unscoped match-all path (endAllMotions).
		} else if (typeof target === "string") {
			uuid = target;
		} else if (target?.uuid !== undefined || target?.document !== undefined) {
			// A document (`.uuid`) or placeable (`.document.uuid`).
			uuid = extractUuid(target);
			if (uuid === null) {
				throw lib.custom_error(
					"Sequencer",
					"MotionManager | endMotions | could not resolve a uuid from the given target"
				);
			}
		} else if (
			typeof target === "object"
			&& ("object" in target || "target" in target || "name" in target || "sequenceId" in target)
		) {
			// Single options-object form. The first argument carries the
			// filter; the second positional argument is ignored.
			resolvedOptions = target;
			const bagTarget = target.object ?? target.target ?? null;
			if (bagTarget !== null && bagTarget !== undefined) {
				uuid = extractUuid(bagTarget);
				if (uuid === null) {
					throw lib.custom_error(
						"Sequencer",
						"MotionManager | endMotions | the options object's `object`/`target` did not resolve to a uuid"
					);
				}
			}
			// No `object`/`target` in the bag leaves `uuid` null: this is a
			// name/sequence-scoped end across all placeables, the same shape
			// as `endAllMotions({ name })`.
		} else {
			throw lib.custom_error(
				"Sequencer",
				"MotionManager | endMotions | no target specified; pass a placeable, document, uuid string, an options object, or null to end all motions"
			);
		}

		const data = {
			sceneId: resolvedOptions.sceneId ?? game.user.viewedScene,
			uuid,
			sequenceId: resolvedOptions.sequenceId ?? null,
			name: resolvedOptions.name ?? null,
			settle: resolvedOptions.settle ?? 0,
		};
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_MOTION, data);
		}
		return SequencerMotionManager._endMotions(data);
	}

	/** Shorthand for `endMotions(null, options, push)`. Matches every uuid. */
	static endAllMotions(options = {}, push = true) {
		return SequencerMotionManager.endMotions(null, options, push);
	}

	static _endMotions(data) {
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
					// finishes. `endMotions` is the "this has ended" signal;
					// a reload mid-settle must not resurrect it. The
					// in-memory return leg still plays for the visual, and
					// the tick removes the motion from the set when
					// `sampleAt` returns null.
					motion._removeFlag(aggregator.uuid);
					motion.triggerReturn(data.settle);
				} else if (motion.persistUntilUpdate) {
					// No return leg; endMotions is "cancel the hold now."
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
