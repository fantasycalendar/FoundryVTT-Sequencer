import { easeFunctions } from "../canvas-effects/ease.js";
import * as canvaslib from "./canvas-lib.js";

/**
 * The set of axes a motion can drive on a placeable. Position (`x`, `y`)
 * and `rotation` are summed into a delta against the rest state; `scale`
 * and `alpha` are multiplied; `tint` is composed channel-wise.
 */
export const PROPERTY_NAMES = ["x", "y", "rotation", "scale", "alpha", "tint"];

export function lerp(from, to, progress) {
	return from + (to - from) * progress;
}

/**
 * Resolve an attached track's live `to` in mesh-space: read the target fresh
 * each frame, take its document position on this axis, and add the motioned
 * token's `meshOriginOffset`. Returns `null` when the target is gone, so the
 * caller falls back to the baked `track.to`.
 */
export function resolveAttachedTo(track, motion) {
	const placeable = fromUuidSync(track.attachToUuid)?.object ?? null;
	if (!placeable) return null;
	const pos = canvaslib.get_object_position(placeable, {
		exact: true,
		ignoreMotion: track.attachIgnoreMotion,
	});
	const documentValue = track.attachAxis === "y" ? pos?.y : pos?.x;
	if (typeof documentValue !== "number") return null;
	const offset = track.attachAxis === "y" ? motion.meshOriginOffset.y : motion.meshOriginOffset.x;
	return documentValue + offset;
}

/**
 * Sample a normalized keyframe array at `elapsed` ms since the array's start.
 * Returns the interpolated value, or `null` if `elapsed` exceeds the array's
 * total duration. The first frame's `segmentDuration` is `0` (no segment
 * ends there).
 */
export function sampleFrames(frames, elapsed, lerpFn = lerp) {
	if (elapsed < 0) return null;
	let cumulative = 0;
	for (let index = 1; index < frames.length; index++) {
		const segmentDuration = frames[index].segmentDuration;
		if (elapsed < cumulative + segmentDuration) {
			const segmentProgress = (elapsed - cumulative) / segmentDuration;
			const easeFunction = easeFunctions[frames[index].segmentEase] ?? easeFunctions.linear;
			const easedProgress = easeFunction(segmentProgress);
			return lerpFn(frames[index - 1].v, frames[index].v, easedProgress);
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
export function sampleTrack(track, motion, now) {
	if (motion.done) return null;

	const lerpFn = track.lerpFn ?? lerp;
	const elapsed = now - track.startTime - (track.delay ?? 0);
	if (elapsed < 0) return null;

	// Single-track form (`track.from` defined).
	if (track.form === "single") {
		let effectiveTo = track.to;
		if (track.attached) {
			const liveTo = resolveAttachedTo(track, motion);
			if (liveTo !== null) {
				effectiveTo = liveTo;
			} else {
				// Target gone: fall back to the baked document-space `to`.
				const offset = track.attachAxis === "y"
					? motion.meshOriginOffset.y
					: motion.meshOriginOffset.x;
				effectiveTo = track.to + offset;
			}
		}
		// The return anchors on where the sprite was, not the live target, so it
		// does not slide while the target keeps moving: `interruptedFrom` from
		// `triggerReturn`, else the outward value frozen while the outward leg ran.
		const returnFromValue =
			track.interruptedFrom ?? track.attachedOutwardValue ?? effectiveTo;

		if (elapsed < track.duration && motion.returnTriggeredAt === undefined) {
			const easeFunction = easeFunctions[track.ease] ?? easeFunctions.linear;
			const progress = easeFunction(elapsed / track.duration);
			if (track.attached) track.attachedOutwardValue = effectiveTo;
			return lerpFn(track.from, effectiveTo, progress);
		}

		if (motion.returnTriggeredAt !== undefined) {
			if (!track.return) return null;
			const returnElapsed = now - motion.returnTriggeredAt;
			const returnDuration = motion.settleOverride ?? track.returnDuration;
			if (returnElapsed < returnDuration) {
				const easeOutFunction = easeFunctions[track.easeOut] ?? easeFunctions.linear;
				const returnProgress = easeOutFunction(returnElapsed / returnDuration);
				return lerpFn(returnFromValue, track.from, returnProgress);
			}
			return null;
		}

		if (motion.persistUntilUpdate || motion.persist) {
			if (track.attached) track.attachedOutwardValue = effectiveTo;
			return effectiveTo;
		}

		if (track.return) {
			if (elapsed < track.duration + track.returnDuration) {
				const easeOutFunction = easeFunctions[track.easeOut] ?? easeFunctions.linear;
				const returnElapsed = elapsed - track.duration;
				const returnProgress = easeOutFunction(returnElapsed / track.returnDuration);
				return lerpFn(returnFromValue, track.from, returnProgress);
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
	const lastFrame = track.frames[track.frames.length - 1];
	const firstFrame = track.frames[0];

	if (motion.returnTriggeredAt !== undefined) {
		const returnElapsed = now - motion.returnTriggeredAt;
		const returnDuration = motion.settleOverride ?? track.returnDuration;
		if (track.returnFrames) {
			const effectiveReturnFrames = [lastFrame, ...track.returnFrames];
			return sampleFrames(effectiveReturnFrames, returnElapsed, lerpFn);
		}
		if (track.defaultReturn) {
			if (returnElapsed >= returnDuration) return null;
			const easeFunction = easeFunctions[track.defaultReturnEase] ?? easeFunctions.linear;
			const progress = easeFunction(returnElapsed / returnDuration);
			return lerpFn(lastFrame.v, firstFrame.v, progress);
		}
		return null;
	}

	if (elapsed < outwardDuration) {
		return sampleFrames(track.frames, elapsed, lerpFn);
	}

	if (motion.persistUntilUpdate || motion.persist) {
		return lastFrame.v;
	}

	if (track.returnFrames) {
		const returnElapsed = elapsed - outwardDuration;
		const effectiveReturnFrames = [lastFrame, ...track.returnFrames];
		return sampleFrames(effectiveReturnFrames, returnElapsed, lerpFn);
	}

	if (track.defaultReturn) {
		const returnElapsed = elapsed - outwardDuration;
		if (returnElapsed >= track.returnDuration) return null;
		const easeFunction = easeFunctions[track.defaultReturnEase] ?? easeFunctions.linear;
		const progress = easeFunction(returnElapsed / track.returnDuration);
		return lerpFn(lastFrame.v, firstFrame.v, progress);
	}

	return null;
}

/**
 * @returns {boolean} true if any track on the motion has `return: true` (the
 *   default for single-track form) or returns on the keyframe form (either
 *   an explicit `returnFrames` from `returnValues`, or the default reverse).
 */
export function motionHasReturningTracks(motion) {
	for (const propertyName of PROPERTY_NAMES) {
		const tracks = motion.tracks[propertyName];
		if (!tracks) continue;
		for (const track of tracks) {
			if (track.form === "single" && track.return) return true;
			if (track.form === "keyframe" && (track.returnFrames || track.defaultReturn)) return true;
		}
	}
	return false;
}
