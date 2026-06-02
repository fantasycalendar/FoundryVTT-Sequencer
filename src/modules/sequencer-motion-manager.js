import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import { easeFunctions } from "../canvas-effects/ease.js";
import * as canvaslib from "../lib/canvas-lib.js";

const MOTION_REGISTRY = new Map();

const PROPERTY_NAMES = ["x", "y", "rotation", "scale", "alpha"];

function lerp(from, to, progress) {
	return from + (to - from) * progress;
}

/**
 * Sample a normalized keyframe array at `elapsed` ms since the array's start.
 * Returns the interpolated value, or `null` if `elapsed` exceeds the array's
 * total duration. The first frame's `segmentDuration` is `0` (no segment
 * ends there).
 */
function sampleFrames(frames, elapsed) {
	if (elapsed < 0) return null;
	let cumulative = 0;
	for (let index = 1; index < frames.length; index++) {
		const segmentDuration = frames[index].segmentDuration;
		if (elapsed < cumulative + segmentDuration) {
			const segmentProgress = (elapsed - cumulative) / segmentDuration;
			const easeFunction = easeFunctions[frames[index].segmentEase] ?? easeFunctions.linear;
			const easedProgress = easeFunction(segmentProgress);
			return lerp(frames[index - 1].v, frames[index].v, easedProgress);
		}
		cumulative += segmentDuration;
	}
	return null;
}

/**
 * Sample a single track. Returns the raw sample (an absolute value when
 * `track.absolute`, a delta otherwise), or `null` when the track has no
 * contribution this frame. The caller's switch on property name converts to
 * the appropriate `delta*` or `*Multiplier` contribution.
 */
function sampleTrack(track, motion, now) {
	if (motion.done) return null;

	const elapsed = now - track.startTime - (track.delay ?? 0);
	if (elapsed < 0) return null;

	// Single-track form (`track.from` defined).
	if (track.form === "single") {
		const returnFromValue = track.interruptedFrom ?? track.to;

		if (elapsed < track.duration && motion.returnTriggeredAt === undefined) {
			const easeFunction = easeFunctions[track.ease] ?? easeFunctions.linear;
			const progress = easeFunction(elapsed / track.duration);
			return lerp(track.from, track.to, progress);
		}

		if (motion.returnTriggeredAt !== undefined) {
			if (!track.return) return null;
			const returnElapsed = now - motion.returnTriggeredAt;
			const returnDuration = motion.settleOverride ?? track.returnDuration;
			if (returnElapsed < returnDuration) {
				const easeOutFunction = easeFunctions[track.easeOut] ?? easeFunctions.linear;
				const returnProgress = easeOutFunction(returnElapsed / returnDuration);
				return lerp(returnFromValue, track.from, returnProgress);
			}
			return null;
		}

		if (motion.persistUntilUpdate || motion.persist) {
			return track.to;
		}

		if (track.return) {
			if (elapsed < track.duration + track.returnDuration) {
				const easeOutFunction = easeFunctions[track.easeOut] ?? easeFunctions.linear;
				const returnElapsed = elapsed - track.duration;
				const returnProgress = easeOutFunction(returnElapsed / track.returnDuration);
				return lerp(returnFromValue, track.from, returnProgress);
			}
			return null;
		}
		return null;
	}

	// Keyframe form.
	const outwardDuration = track.frames.reduce(
		(sum, frame) => sum + frame.segmentDuration,
		0
	);

	if (motion.returnTriggeredAt !== undefined) {
		if (!track.returnFrames) return null;
		const returnElapsed = now - motion.returnTriggeredAt;
		const effectiveReturnFrames = [
			track.frames[track.frames.length - 1],
			...track.returnFrames,
		];
		return sampleFrames(effectiveReturnFrames, returnElapsed);
	}

	if (elapsed < outwardDuration) {
		return sampleFrames(track.frames, elapsed);
	}

	if (motion.persistUntilUpdate || motion.persist) {
		return track.frames[track.frames.length - 1].v;
	}

	if (track.returnFrames) {
		const returnElapsed = elapsed - outwardDuration;
		const effectiveReturnFrames = [
			track.frames[track.frames.length - 1],
			...track.returnFrames,
		];
		return sampleFrames(effectiveReturnFrames, returnElapsed);
	}
	return null;
}

/**
 * @returns {boolean} true if any track on the motion has `return: true` (the
 *   default for single-track form) or `returnFrames` (keyframe form).
 */
function motionHasReturningTracks(motion) {
	for (const propertyName of PROPERTY_NAMES) {
		const tracks = motion.tracks[propertyName];
		if (!tracks) continue;
		for (const track of tracks) {
			if (track.form === "single" && track.return) return true;
			if (track.form === "keyframe" && track.returnFrames) return true;
		}
	}
	return false;
}

class Motion {
	constructor(config, restState, meshOriginOffset) {
		this.sequenceId = config.sequenceId ?? null;
		this.name = config.name ?? null;
		this.persist = !!config.persist;
		this.persistUntilUpdate = !!config.persistUntilUpdate;
		this.done = false;
		this.returnTriggeredAt = undefined;
		this.settleOverride = undefined;
		this.startTime = performance.now();
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
		const track = { ...sourceTrack, startTime: this.startTime };
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
		return { deltaX, deltaY, deltaAngle, scaleMultiplier, alphaMultiplier };
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
					track.interruptedFrom = lerp(track.from, track.to, progress);
				}
			}
		}
	}

	markDone() {
		this.done = true;
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
			for (const motion of [...this.motions]) {
				const sample = motion.sampleAt(now);
				if (sample === null) {
					this.motions.delete(motion);
					continue;
				}
				deltaX += sample.deltaX;
				deltaY += sample.deltaY;
				deltaAngle += sample.deltaAngle;
				scaleMultiplier *= sample.scaleMultiplier;
				alphaMultiplier *= sample.alphaMultiplier;
			}

			// (3) Update cache for getDisplacement consumers.
			this.cache.deltaX = deltaX;
			this.cache.deltaY = deltaY;
			this.cache.deltaAngle = deltaAngle;
			this.cache.scaleMultiplier = scaleMultiplier;
			this.cache.alphaMultiplier = alphaMultiplier;

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
	}
}

export default class SequencerMotionManager {
	static registerHooks() {
		Hooks.on("canvasTearDown", () => {
			for (const aggregator of MOTION_REGISTRY.values()) {
				aggregator.tornDown = true;
				canvas.app?.ticker?.remove(aggregator.tick);
			}
			MOTION_REGISTRY.clear();
		});
	}

	/**
	 * Start a motion. `data` is the serializable payload built by
	 * MotionSection. Returns the same overallDuration the section uses for
	 * its completion promise so Sequences can compose.
	 */
	static startMotion(data, push = true) {
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.START_MOTION, data);
		}
		return SequencerMotionManager._startMotion(data);
	}

	static _startMotion(data) {
		if (game.user.viewedScene !== data.sceneId) return 0;
		if (Array.isArray(data.users) && data.users.length && !data.users.includes(game.userId)) return 0;

		const document = fromUuidSync(data.uuid);
		const placeable = document?.object ?? null;
		if (!placeable) return 0;
		const target = canvaslib.getMotionTarget(placeable);
		if (!target) return 0;

		let aggregator = MOTION_REGISTRY.get(data.uuid);
		if (!aggregator) {
			aggregator = new PlaceableMotionAggregator(data.uuid, placeable, target);
			MOTION_REGISTRY.set(data.uuid, aggregator);
			canvas.app.ticker.add(aggregator.tick, undefined, PIXI.UPDATE_PRIORITY.NORMAL + 1);
		}

		const motion = new Motion(data, aggregator.restState, aggregator.meshOriginOffset);
		aggregator.addMotion(motion);
		return data.overallDuration ?? 0;
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
					motion.triggerReturn(data.settle);
				} else if (motion.persistUntilUpdate) {
					// No return leg; endMotion is "cancel the hold now."
					aggregator.motions.delete(motion);
				} else if (data.settle > 0 && motionHasReturningTracks(motion)) {
					motion.triggerReturn(data.settle);
				} else {
					aggregator.motions.delete(motion);
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
