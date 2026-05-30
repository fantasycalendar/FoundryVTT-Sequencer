import Section from "./section.js";
import traits from "./traits/_traits.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { easeFunctions } from "../canvas-effects/ease.js";
import SequencerMotionManager from "../modules/sequencer-motion-manager.js";


export default class MotionSection extends Section {
	static niceName = "Motion";

	constructor(inSequence, inTarget) {
		super(inSequence);
		this._originObject = null;
		this._persist = false;
		this._persistUntilUpdate = false;
		this._tracks = {
			x: [],
			y: [],
			scale: [],
			rotation: [],
			alpha: [],
		};
		this._noise = null;
		this._oscillate = null;
		if (inTarget) this.on(inTarget);
	}

	_applyTraits() {
		Object.assign(this.constructor.prototype, traits.users);
		Object.assign(this.constructor.prototype, traits.name);
	}

	/**
	 * Sets the Token, Tile, or Drawing this motion will animate. Accepts
	 * the placeable itself or its document.
	 *
	 * @param {object|string} inTarget
	 * @returns {MotionSection}
	 */
	on(inTarget) {
		inTarget = this._validateLocation(inTarget);
		if (!inTarget)
			throw this.sequence._customError(
				this,
				"on",
				"could not find position of given object"
			);
		this._originObject = inTarget;
		return this;
	}

	/**
	 * Plays the motion forward, then holds the displaced position
	 * indefinitely. Call `Sequencer.MotionManager.endMotion(target, options)`
	 * to play the return animation and end the motion.
	 *
	 * Mutually exclusive with `.persistUntilUpdate()`.
	 *
	 * @returns {MotionSection}
	 */
	persist() {
		if (this._persistUntilUpdate)
			throw this.sequence._customError(
				this,
				"persist",
				"`.persistUntilUpdate()` and `.persist()` are mutually exclusive; pick one persistence mode."
			);
		this._persist = true;
		return this;
	}

	/**
	 * Plays the motion forward, then holds the displaced position until the
	 * placeable's document is updated (position or rotation). The document
	 * update ends the motion without playing a return animation — useful
	 * when the document will be moved to the displaced position so the
	 * sprite stays put with no visible snap.
	 *
	 * Mutually exclusive with `.persist()`.
	 *
	 * @returns {MotionSection}
	 */
	persistUntilUpdate() {
		if (this._persist)
			throw this.sequence._customError(
				this,
				"persistUntilUpdate",
				"`.persistUntilUpdate()` and `.persist()` are mutually exclusive; pick one persistence mode."
			);
		this._persistUntilUpdate = true;
		return this;
	}

	/**
	 * Layers a periodic oscillation onto the motion. Position and rotation
	 * axes oscillate by `amplitude` units around their starting value;
	 * scale and alpha oscillate around `baseline` (default 1.0).
	 *
	 * Required: `period` (ms), `waveform` ("sine" | "triangle" | "square"),
	 * and at least one of `x`, `y`, `rotation`, `scale`, `alpha`. Each axis
	 * takes `{amplitude, phase}`, plus `baseline` for scale and alpha.
	 *
	 * Optional: `duration`, `delay`, `fadeInDuration`, `fadeOutDuration`.
	 * Under `.persist()` the oscillation loops until the motion ends, then
	 * fades over `fadeOutDuration`.
	 *
	 * At most one `.oscillate()` per motion.
	 *
	 * @param {object} inOptions
	 * @returns {MotionSection}
	 */
	oscillate(inOptions = {}) {
		if (this._oscillate) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"only one `.oscillate()` is allowed per motion section"
			);
		}
		if (typeof inOptions !== "object" || inOptions === null) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"inOptions must be of type object"
			);
		}

		const options = foundry.utils.mergeObject(
			{
				period: undefined,
				waveform: undefined,
				duration: undefined,
				delay: 0,
				fadeInDuration: 0,
				fadeOutDuration: 0,
				x: undefined,
				y: undefined,
				rotation: undefined,
				scale: undefined,
				alpha: undefined,
			},
			inOptions
		);

		if (!lib.is_real_number(options.period) || options.period <= 0) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"options.period must be a positive real number"
			);
		}
		if (
			typeof options.waveform !== "string" ||
			!canvaslib.OSCILLATE_WAVEFORM_NAMES.includes(options.waveform)
		) {
			throw this.sequence._customError(
				this,
				"oscillate",
				`options.waveform must be one of: ${canvaslib.OSCILLATE_WAVEFORM_NAMES.join(", ")}`
			);
		}
		if (!lib.is_real_number(options.delay) || options.delay < 0) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"options.delay must be a non-negative real number"
			);
		}
		if (!lib.is_real_number(options.fadeInDuration) || options.fadeInDuration < 0) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"options.fadeInDuration must be a non-negative real number"
			);
		}
		if (!lib.is_real_number(options.fadeOutDuration) || options.fadeOutDuration < 0) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"options.fadeOutDuration must be a non-negative real number"
			);
		}
		if (
			options.duration !== undefined &&
			(!lib.is_real_number(options.duration) || options.duration <= 0)
		) {
			throw this.sequence._customError(
				this,
				"oscillate",
				"options.duration must be a positive real number when specified"
			);
		}

		const axisNames = ["x", "y", "rotation", "scale", "alpha"];
		const configured = axisNames.filter((axis) => options[axis] !== undefined);
		if (configured.length === 0) {
			throw this.sequence._customError(
				this,
				"oscillate",
				`at least one axis (${axisNames.join(", ")}) must be configured`
			);
		}
		for (const axis of configured) {
			this._validateOscillateAxis(axis, options[axis]);
		}

		this._oscillate = options;
		return this;
	}

	/**
	 * @private
	 */
	_validateOscillateAxis(axisName, axisConfig) {
		if (typeof axisConfig !== "object" || axisConfig === null) {
			throw this.sequence._customError(
				this,
				"oscillate",
				`options.${axisName} must be of type object`
			);
		}
		if (!lib.is_real_number(axisConfig.amplitude)) {
			throw this.sequence._customError(
				this,
				"oscillate",
				`options.${axisName}.amplitude must be a real number`
			);
		}
		if (axisConfig.phase !== undefined && !lib.is_real_number(axisConfig.phase)) {
			throw this.sequence._customError(
				this,
				"oscillate",
				`options.${axisName}.phase must be a real number when specified`
			);
		}
		if (axisName === "scale" || axisName === "alpha") {
			if (
				axisConfig.baseline !== undefined &&
				(!lib.is_real_number(axisConfig.baseline) || axisConfig.baseline <= 0)
			) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName}.baseline must be a positive real number when specified`
				);
			}
		}
	}

	/**
	 * Moves the sprite toward `inTarget`. Pass a single position
	 * (`{x, y}` / placeable / document) for a single-target animation, or
	 * an array of waypoints for a keyframed path.
	 *
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default true), `easeOut`,
	 * `returnDuration`. The return-leg defaults to mirroring the forward
	 * leg unless overridden.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `returnValues`,
	 * `returnDuration`. Each waypoint is `{x, y}`, or a per-key object
	 * `{v: {x, y}, duration?, inEase?, outEase?}` for fine-grained control.
	 *
	 * @param {object|string|array} inTarget
	 * @param {object} [inOptions={}]
	 * @returns {MotionSection}
	 */
	moveTo(inTarget, inOptions = {}) {
		if (inTarget === undefined || inTarget === null)
			throw this.sequence._customError(
				this,
				"moveTo",
				"inTarget is required"
			);
		if (typeof inOptions !== "object" || inOptions === null)
			throw this.sequence._customError(
				this,
				"moveTo",
				"inOptions must be of type object"
			);

		const isKeyframe = Array.isArray(inTarget);

		let options;
		if (isKeyframe) {
			// Check against the input so the error names the key the user
			// actually passed.
			for (const key of ["return", "easeOut"]) {
				if (key in inOptions) {
					throw this.sequence._customError(
						this,
						"moveTo",
						`\`${key}\` is not compatible with keyframe tracks; use \`returnValues\` to specify an explicit return animation/time.`
					);
				}
			}

			options = foundry.utils.mergeObject(
				{
					returnValues: undefined,
					duration: undefined,
					returnDuration: undefined,
					ease: "linear",
					delay: 0,
				},
				inOptions
			);
		} else {
			options = foundry.utils.mergeObject(
				{
					duration: undefined,
					ease: "linear",
					delay: 0,
					return: true,
					easeOut: undefined,
					returnDuration: undefined,
				},
				inOptions
			);

			// Default the return-leg fields off the outward-leg ones.
			if (options.easeOut === undefined) options.easeOut = options.ease;
			if (options.returnDuration === undefined)
				options.returnDuration = options.duration;
		}

		let validatedTarget = null;
		if (!isKeyframe) {
			validatedTarget = this._validateLocation(inTarget);
			if (!validatedTarget)
				throw this.sequence._customError(
					this,
					"moveTo",
					"could not resolve a position from inTarget"
				);
		}

		const xConfig = isKeyframe
			? this._buildKeyframeTrack("moveTo", inTarget, options, "x")
			: this._buildSingleTrack("moveTo", validatedTarget, options, "x");
		const yConfig = isKeyframe
			? this._buildKeyframeTrack("moveTo", inTarget, options, "y")
			: this._buildSingleTrack("moveTo", validatedTarget, options, "y");

		this._tracks.x.push(xConfig);
		this._tracks.y.push(yConfig);
		return this;
	}

	/**
	 * Validates a normalized single-track options object (defaults already
	 * merged by the caller) and builds the per-axis TrackConfig for `moveTo`.
	 * `target` is `{x, y}` (or a placeable resolved to one); `axis` is "x" or
	 * "y". The target's value on the named axis becomes the track's `to`;
	 * the `from` is resolved later (at motion start) from the rest state.
	 *
	 * @private
	 */
	_buildSingleTrack(methodName, target, options, axis) {
		if (!lib.is_real_number(options.duration) || options.duration <= 0)
			throw this.sequence._customError(
				this,
				methodName,
				"options.duration must be a positive real number"
			);
		if (typeof options.ease !== "string" || !(options.ease in easeFunctions))
			throw this.sequence._customError(
				this,
				methodName,
				"options.ease must be a registered ease function name"
			);
		if (!lib.is_real_number(options.delay) || options.delay < 0)
			throw this.sequence._customError(
				this,
				methodName,
				"options.delay must be a non-negative real number"
			);
		if (typeof options.return !== "boolean")
			throw this.sequence._customError(
				this,
				methodName,
				"options.return must be of type boolean"
			);
		if (this._persistUntilUpdate && options.return) {
			throw this.sequence._customError(
				this,
				methodName,
				"`.persistUntilUpdate()` is incompatible with `return: true` tracks; the document update is the return."
			);
		}
		if (
			typeof options.easeOut !== "string" ||
			!(options.easeOut in easeFunctions)
		)
			throw this.sequence._customError(
				this,
				methodName,
				"options.easeOut must be a registered ease function name"
			);
		if (
			!lib.is_real_number(options.returnDuration) ||
			options.returnDuration <= 0
		)
			throw this.sequence._customError(
				this,
				methodName,
				"options.returnDuration must be a positive real number"
			);

		return {
			form: "single",
			to: target[axis],
			ease: options.ease,
			duration: options.duration,
			delay: options.delay,
			return: options.return,
			easeOut: options.easeOut,
			returnDuration: options.returnDuration,
			absolute: true,
		};
	}

	/**
	 * Validates a keyframe track for `moveTo` and builds the per-axis
	 * TrackConfig. `outwardValues` is the array passed as `inTarget`;
	 * `options` are the (already-defaults-merged) tween options.
	 *
	 * @private
	 */
	_buildKeyframeTrack(methodName, outwardValues, options, axis) {
		if (outwardValues.length < 2)
			throw this.sequence._customError(
				this,
				methodName,
				"inTarget must have at least 2 elements (one segment)"
			);
		if (typeof options.ease !== "string" || !(options.ease in easeFunctions))
			throw this.sequence._customError(
				this,
				methodName,
				"options.ease must be a registered ease function name"
			);
		if (!lib.is_real_number(options.delay) || options.delay < 0)
			throw this.sequence._customError(
				this,
				methodName,
				"options.delay must be a non-negative real number"
			);
		if (
			options.returnDuration !== undefined &&
			options.returnValues === undefined
		) {
			throw this.sequence._customError(
				this,
				methodName,
				"`returnDuration` requires `returnValues` on a keyframe track."
			);
		}
		if (this._persistUntilUpdate && options.returnValues !== undefined) {
			throw this.sequence._customError(
				this,
				methodName,
				"`.persistUntilUpdate()` is incompatible with `returnValues` on a keyframe track; the document update is the return."
			);
		}

		const outwardFrames = this._normalizeKeyframes(
			methodName,
			outwardValues,
			options.duration,
			options.ease,
			axis,
			"inTarget"
		);

		let returnFrames;
		if (options.returnValues !== undefined) {
			returnFrames = this._normalizeKeyframes(
				methodName,
				options.returnValues,
				options.returnDuration,
				options.ease,
				axis,
				"inOptions.returnValues"
			);
		}

		return {
			form: "keyframe",
			frames: outwardFrames,
			returnFrames,
			delay: options.delay,
			absolute: true,
		};
	}

	/**
	 * Normalizes a user-supplied array (`{x, y}` pairs or keyframe objects)
	 * into the internal `frames` array of `{v, segmentDuration, segmentEase}`
	 * entries. Enforces shape homogeneity, per-key duration consistency, and
	 * ease validation.
	 *
	 * `axis` is the property being extracted ("x" or "y" for moveTo).
	 * `fieldPath` is the user-facing path (e.g. "inTarget" or
	 * "inOptions.returnValues") used in error messages.
	 *
	 * @private
	 */
	_normalizeKeyframes(
		methodName,
		rawValues,
		trackLevelDuration,
		trackLevelEase,
		axis,
		fieldPath
	) {
		const isCoordPair = (candidate) =>
			candidate
			&& typeof candidate === "object"
			&& lib.is_real_number(candidate.x)
			&& lib.is_real_number(candidate.y);
		const isKeyframeObject = (candidate) =>
			candidate
			&& typeof candidate === "object"
			&& "v" in candidate
			&& !lib.is_real_number(candidate)
			&& !isCoordPair(candidate);

		const firstElement = rawValues[0];
		let shape;
		if (isCoordPair(firstElement)) {
			shape = "coord";
		} else if (isKeyframeObject(firstElement)) {
			shape = "keyframe";
		} else {
			throw this.sequence._customError(
				this,
				methodName,
				`${fieldPath}[0] must be a {x, y} coordinate pair or a keyframe object {v: {x, y}, ...}`
			);
		}

		for (let keyframeIndex = 0; keyframeIndex < rawValues.length; keyframeIndex++) {
			const keyframeInput = rawValues[keyframeIndex];
			if (shape === "coord" && !isCoordPair(keyframeInput)) {
				throw this.sequence._customError(
					this,
					methodName,
					`${fieldPath} is mixed; either every element is a {x, y} coordinate pair or every element is a keyframe object.`
				);
			}
			if (shape === "keyframe" && !isKeyframeObject(keyframeInput)) {
				throw this.sequence._customError(
					this,
					methodName,
					`${fieldPath} is mixed; either every element is a {x, y} coordinate pair or every element is a keyframe object.`
				);
			}
		}

		const perKeyDurationKeys = [];
		if (shape === "keyframe") {
			for (let keyframeIndex = 0; keyframeIndex < rawValues.length; keyframeIndex++) {
				if ("duration" in rawValues[keyframeIndex] && rawValues[keyframeIndex].duration !== undefined) {
					perKeyDurationKeys.push(keyframeIndex);
				}
			}
			if (perKeyDurationKeys.includes(0)) {
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe `duration` on the first key is meaningless; no segment ends at the first key. Set `duration` on every key after the first instead."
				);
			}
		}

		const hasAnyPerKeyDuration = perKeyDurationKeys.length > 0;
		if (hasAnyPerKeyDuration) {
			const expectedDurationKeyCount = rawValues.length - 1;
			if (perKeyDurationKeys.length !== expectedDurationKeyCount) {
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe per-key `duration` must be set on every key after the first, or on none."
				);
			}
			if (trackLevelDuration !== undefined) {
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe `duration` is ambiguous; specify the track-level `duration` (divided evenly) OR per-key `duration` (absolute ms), not both."
				);
			}
		}

		let segmentDurations;
		if (hasAnyPerKeyDuration) {
			segmentDurations = rawValues.map((keyframeInput, keyframeIndex) => {
				if (keyframeIndex === 0) return 0;
				if (!lib.is_real_number(keyframeInput.duration) || keyframeInput.duration <= 0) {
					throw this.sequence._customError(
						this,
						methodName,
						`${fieldPath}[${keyframeIndex}].duration must be a positive real number`
					);
				}
				return keyframeInput.duration;
			});
		} else {
			if (
				trackLevelDuration === undefined ||
				!lib.is_real_number(trackLevelDuration)
			) {
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe track requires either a track-level `duration` or per-key durations on every key after the first."
				);
			}
			if (trackLevelDuration <= 0) {
				throw this.sequence._customError(
					this,
					methodName,
					"track-level `duration` must be > 0"
				);
			}
			const perSegmentDuration = trackLevelDuration / (rawValues.length - 1);
			segmentDurations = rawValues.map((_, keyframeIndex) =>
				keyframeIndex === 0 ? 0 : perSegmentDuration
			);
		}

		const frames = rawValues.map((keyframeInput, keyframeIndex) => {
			let axisValue;
			if (shape === "coord") {
				axisValue = keyframeInput[axis];
			} else {
				if (!isCoordPair(keyframeInput.v)) {
					throw this.sequence._customError(
						this,
						methodName,
						`${fieldPath}[${keyframeIndex}].v must be a {x, y} coordinate pair for moveTo`
					);
				}
				axisValue = keyframeInput.v[axis];
			}

			let segmentEase;
			if (keyframeIndex === 0) {
				// The first frame has no incoming segment.
				segmentEase = trackLevelEase;
			} else {
				const thisFrame = shape === "keyframe" ? keyframeInput : null;
				const previousFrame =
					shape === "keyframe" && keyframeIndex > 0
						? rawValues[keyframeIndex - 1]
						: null;
				const easeCandidate =
					thisFrame?.inEase
					?? thisFrame?.ease
					?? previousFrame?.outEase
					?? trackLevelEase;
				if (typeof easeCandidate !== "string")
					throw this.sequence._customError(
						this,
						methodName,
						`${fieldPath}[${keyframeIndex}] ease must be a string`
					);
				if (!(easeCandidate in easeFunctions))
					throw this.sequence._customError(
						this,
						methodName,
						`${fieldPath}[${keyframeIndex}] ease "${easeCandidate}" is not a registered ease function`
					);
				segmentEase = easeCandidate;
			}

			return {
				v: axisValue,
				segmentDuration: segmentDurations[keyframeIndex],
				segmentEase,
			};
		});

		return frames;
	}

	/**
	 * @private
	 *
	 * Waits for the target token's mesh to draw, then registers any
	 * `.name()` entry on the sequence's nameOffsetMap.
	 */
	async preRun() {
		await this._waitForTokenMesh(this._originObject);
		if (this._name) {
			this.sequence.nameOffsetMap ||= {};
			this.sequence.nameOffsetMap[this._name] = {
				source: this._originObject,
				target: null,
			};
		}
	}

	/**
	 * @private
	 */
	async _waitForTokenMesh(target) {
		const Token = foundry.canvas.placeables.Token;
		const TokenDocument = foundry.documents.TokenDocument;
		let token = null;
		if (target instanceof Token) token = target;
		else if (target instanceof TokenDocument) token = target.object;
		if (token === null || token.mesh != null) return;
		return new Promise((resolve) => {
			const hookId = Hooks.on("refreshToken", (tokenDoc) => {
				if (tokenDoc.document.actorId !== token.document.actorId || !token.mesh) return;
				Hooks.off("refreshToken", hookId);
				resolve();
			});
		});
	}

	/**
	 * @private
	 */
	async run() {
		const placeable = this._originObject?.object ?? this._originObject;
		const target = canvaslib.getMotionTarget(placeable);
		if (!target) {
			throw this.sequence._customError(
				this,
				"motion",
				`requires a Token, Tile, or Drawing target; got ${placeable?.constructor?.name ?? "null"}`
			);
		}

		const uuid = placeable?.document?.uuid ?? placeable?.uuid ?? null;
		if (!uuid) {
			throw this.sequence._customError(
				this,
				"motion",
				"target has no uuid; motions require a placeable with a document"
			);
		}

		const overallDuration = this._computeOverallDuration();

		const data = {
			sceneId: game.user.viewedScene,
			uuid,
			sequenceId: this.sequence.id,
			creatorUserId: game.userId,
			moduleName: this.sequence.moduleName,
			users: this._users ? [...this._users] : false,
			name: this._name || null,
			persist: this._persist,
			persistUntilUpdate: this._persistUntilUpdate,
			tracks: this._tracks,
			oscillate: this._oscillate,
			overallDuration,
		};

		const push = !this.sequence.local && !this.sequence.remote;
		SequencerMotionManager.startMotion(data, push);

		return new Promise((resolve) => {
			setTimeout(resolve, overallDuration + this._currentWaitTime);
		});
	}

	/**
	 * @private
	 *
	 * Longest `delay + outward (+ return)` across every track. Persistent
	 * motions sum outward only so `.waitUntilFinished()` resolves when the
	 * entry animation lands instead of hanging on the indefinite hold.
	 */
	_computeOverallDuration() {
		const persistent = this._persist || this._persistUntilUpdate;
		let longest = 0;
		for (const propertyName of ["x", "y", "rotation", "scale", "alpha"]) {
			for (const track of this._tracks[propertyName]) {
				const delay = track.delay ?? 0;
				let outwardDuration;
				let returnDuration;
				if (track.form === "single") {
					outwardDuration = track.duration;
					returnDuration = (!persistent && track.return) ? track.returnDuration : 0;
				} else {
					outwardDuration = track.frames.reduce(
						(sum, frame) => sum + frame.segmentDuration,
						0
					);
					returnDuration = (!persistent && track.returnFrames)
						? track.returnFrames.reduce(
							(sum, frame) => sum + frame.segmentDuration,
							0
						)
						: 0;
				}
				const trackEnd = delay + outwardDuration + returnDuration;
				if (trackEnd > longest) longest = trackEnd;
			}
		}
		if (this._oscillate) {
			const delay = this._oscillate.delay ?? 0;
			const oscillateEnd = persistent
				? delay + (this._oscillate.fadeInDuration ?? 0)
				: delay + (this._oscillate.duration ?? 0);
			if (oscillateEnd > longest) longest = oscillateEnd;
		}
		return longest;
	}
}
