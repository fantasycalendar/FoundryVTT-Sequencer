import Section from "./section.js";
import traits from "./traits/_traits.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { easeFunctions } from "../canvas-effects/ease.js";
import SequencerMotionManager from "../modules/sequencer-motion-manager.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";
import CrosshairsDocument from "../modules/sequencer-crosshair/CrosshairsDocument.js";
import flagManager from "../utils/flag-manager.js";


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
			tint: [],
		};
		this._noise = [];
		this._oscillate = [];
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
	 * indefinitely. Call `Sequencer.MotionManager.endMotions(target, options)`
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
	 * update ends the motion without playing a return animation. Useful
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
	 * Layers random shake / jitter onto the motion. Position samples are
	 * pulled from a random direction inside the cone `[directionMin,
	 * directionMax]` (degrees, full circle by default). Rotation jitter
	 * runs on an independent random stream.
	 *
	 * Required: `frequency` (ms between samples) and one of `strength`
	 * (pixels; number, or `{x, y}` where either axis may be omitted and
	 * defaults to `0`) / `strengthScaledToObject` (multiplier of the
	 * placeable's dimensions; same shape).
	 *
	 * Optional: `duration` (ms, default `1000`), `rotationStrength`
	 * (degrees, default 0), `directionMin` and `directionMax` (degrees
	 * in `[0, 720]`, default `0` and `360`), `delay`, `fadeInDuration`,
	 * `fadeOutDuration`.
	 *
	 * Under `.persist()` the shake loops until the motion ends, then fades
	 * over `fadeOutDuration`; `duration` is the length of one loop cycle.
	 *
	 * Multiple `.noise()` calls on the same motion compose additively,
	 * useful for stacking layers like a fast jitter on top of a slow
	 * tremor, each with its own timing and strength.
	 *
	 * @param {object} inOptions
	 * @returns {MotionSection}
	 */
	noise(inOptions = {}) {
		if (typeof inOptions !== "object" || inOptions === null) {
			throw this.sequence._customError(
				this,
				"noise",
				"inOptions must be of type object"
			);
		}

		const options = foundry.utils.mergeObject(
			{
				strength: undefined,
				strengthScaledToObject: undefined,
				rotationStrength: 0,
				frequency: undefined,
				duration: undefined,
				delay: 0,
				fadeInDuration: 0,
				fadeOutDuration: 0,
				directionMin: 0,
				directionMax: 360,
			},
			inOptions
		);

		if (
			options.duration !== undefined &&
			(!lib.is_real_number(options.duration) || options.duration <= 0)
		) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.duration must be a positive real number when specified"
			);
		}
		if (!lib.is_real_number(options.frequency) || options.frequency <= 0) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.frequency must be a positive real number"
			);
		}
		if (!lib.is_real_number(options.delay) || options.delay < 0) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.delay must be a non-negative real number"
			);
		}
		if (!lib.is_real_number(options.fadeInDuration) || options.fadeInDuration < 0) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.fadeInDuration must be a non-negative real number"
			);
		}
		if (!lib.is_real_number(options.fadeOutDuration) || options.fadeOutDuration < 0) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.fadeOutDuration must be a non-negative real number"
			);
		}
		if (!lib.is_real_number(options.rotationStrength) || options.rotationStrength < 0) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.rotationStrength must be a non-negative real number"
			);
		}

		const hasStrength = options.strength !== undefined;
		const hasScaledStrength = options.strengthScaledToObject !== undefined;
		if (hasStrength === hasScaledStrength) {
			throw this.sequence._customError(
				this,
				"noise",
				"exactly one of `strength` or `strengthScaledToObject` is required"
			);
		}
		this._validateNoiseStrength(
			hasStrength ? "strength" : "strengthScaledToObject",
			hasStrength ? options.strength : options.strengthScaledToObject
		);

		for (const key of ["directionMin", "directionMax"]) {
			if (!lib.is_real_number(options[key]) || options[key] < 0 || options[key] > 720) {
				throw this.sequence._customError(
					this,
					"noise",
					`options.${key} must be a real number in [0, 720]`
				);
			}
		}
		if (options.directionMin > options.directionMax) {
			throw this.sequence._customError(
				this,
				"noise",
				"options.directionMin must be <= options.directionMax"
			);
		}

		this._noise.push(options);
		return this;
	}

	/**
	 * @private
	 */
	_validateNoiseStrength(fieldName, value) {
		if (lib.is_real_number(value)) return;
		if (typeof value === "object" && value !== null) {
			const hasX = value.x !== undefined;
			const hasY = value.y !== undefined;
			if (hasX && !lib.is_real_number(value.x)) {
				throw this.sequence._customError(
					this,
					"noise",
					`options.${fieldName}.x must be a real number when specified`
				);
			}
			if (hasY && !lib.is_real_number(value.y)) {
				throw this.sequence._customError(
					this,
					"noise",
					`options.${fieldName}.y must be a real number when specified`
				);
			}
			if (hasX || hasY) {
				value.x ??= 0;
				value.y ??= 0;
				return;
			}
		}
		throw this.sequence._customError(
			this,
			"noise",
			`options.${fieldName} must be a real number or a {x, y} object with at least one real-number axis`
		);
	}

	/**
	 * Layers a periodic oscillation onto the motion. Position and rotation
	 * axes oscillate by `amplitude` units around their starting value;
	 * scale and alpha oscillate around `baseline` (default 1.0).
	 *
	 * Required: `period` (ms), `waveform` ("sine" | "triangle" | "square"),
	 * and at least one of `x`, `y`, `rotation`, `scale`, `alpha`. Each axis
	 * takes `{amplitude, phase}`, plus `baseline` for scale and alpha. On
	 * the `x` and `y` axes, `strengthScaledToObject` (a number) can stand
	 * in for `amplitude` to express the swing as a multiplier of the
	 * placeable's width or height; the two are mutually exclusive on the
	 * same axis.
	 *
	 * Optional: `duration` (ms, default `1000`), `delay`, `fadeInDuration`,
	 * `fadeOutDuration`.
	 *
	 * Under `.persist()` the oscillation loops until the motion ends, then
	 * fades over `fadeOutDuration`.
	 *
	 * Multiple `.oscillate()` calls on the same motion compose additively,
	 * useful for stacking layers like a slow sway with a fast bob, each
	 * with its own period, waveform, and per-axis amplitudes.
	 *
	 * @param {object} inOptions
	 * @returns {MotionSection}
	 */
	oscillate(inOptions = {}) {
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

		this._oscillate.push(options);
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

		const scaledAllowed = axisName === "x" || axisName === "y";
		const hasAmplitude = axisConfig.amplitude !== undefined;
		const hasScaled = axisConfig.strengthScaledToObject !== undefined;

		if (scaledAllowed) {
			if (hasAmplitude === hasScaled) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName} requires exactly one of \`amplitude\` or \`strengthScaledToObject\``
				);
			}
			if (hasAmplitude && !lib.is_real_number(axisConfig.amplitude)) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName}.amplitude must be a real number`
				);
			}
			if (hasScaled && !lib.is_real_number(axisConfig.strengthScaledToObject)) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName}.strengthScaledToObject must be a real number`
				);
			}
		} else {
			if (hasScaled) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName}.strengthScaledToObject is only supported on the x and y axes`
				);
			}
			if (!lib.is_real_number(axisConfig.amplitude)) {
				throw this.sequence._customError(
					this,
					"oscillate",
					`options.${axisName}.amplitude must be a real number`
				);
			}
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
	 * (`{x, y}` / placeable / document / name reference) for a single-target
	 * animation, or an array of waypoints for a keyframed path.
	 *
	 * When the target is a placeable, document, or name reference, its
	 * position is read at the moment this method is called, and includes
	 * any motion currently displacing it: moving toward a token that is
	 * itself flying via a `.motion()` lands on where it visually appears,
	 * not on its document position. Pass `ignoreMotion: true` to target the
	 * document position instead (e.g. the ground beneath a flying token). A
	 * literal `{x, y}` is used as given.
	 *
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default true), `easeOut`,
	 * `returnDuration`, `ignoreMotion` (default false). The return-leg
	 * defaults to mirroring the forward leg unless overridden.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `returnValues`,
	 * `returnDuration`. Each waypoint is `{x, y}`, or a per-key object
	 * `{v: {x, y}, duration?, hold?, inEase?, outEase?}` for fine-grained
	 * control. A per-key `hold` (ms) dwells at that waypoint before continuing.
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
			if ("easeOut" in inOptions) {
				throw this.sequence._customError(
					this,
					"moveTo",
					"`easeOut` is not compatible with keyframe tracks; use per-key `inEase` / `outEase` on the keyframes themselves."
				);
			}
			if ("ignoreMotion" in inOptions) {
				throw this.sequence._customError(
					this,
					"moveTo",
					"`ignoreMotion` is not compatible with keyframe tracks; keyframe waypoints are literal coordinates, not placeables."
				);
			}
			if (inOptions.attachTo) {
				throw this.sequence._customError(
					this,
					"moveTo",
					"`attachTo` is not compatible with keyframe tracks; it tracks a single live target, while keyframe waypoints are fixed coordinates."
				);
			}

			options = foundry.utils.mergeObject(
				{
					returnValues: undefined,
					duration: undefined,
					returnDuration: undefined,
					ease: "linear",
					delay: 0,
					return: true,
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
					ignoreMotion: false,
					attachTo: false,
				},
				inOptions
			);

			if (typeof options.ignoreMotion !== "boolean")
				throw this.sequence._customError(
					this,
					"moveTo",
					"options.ignoreMotion must be of type boolean"
				);
			if (typeof options.attachTo !== "boolean")
				throw this.sequence._customError(
					this,
					"moveTo",
					"options.attachTo must be of type boolean"
				);

			// Default the return-leg fields off the outward-leg ones.
			if (options.easeOut === undefined) options.easeOut = options.ease;
			if (options.returnDuration === undefined)
				options.returnDuration = options.duration;
		}

		let validatedTarget = null;
		let attachToUuid = null;
		if (!isKeyframe) {
			validatedTarget = this._validateLocation(inTarget);
			if (!validatedTarget)
				throw this.sequence._customError(
					this,
					"moveTo",
					"could not resolve a position from inTarget"
				);

			const isCrosshair =
				validatedTarget instanceof CrosshairsPlaceable
				|| validatedTarget instanceof CrosshairsDocument;

			if (isCrosshair) {
				if (options.attachTo)
					throw this.sequence._customError(
						this,
						"moveTo",
						"`attachTo: true` cannot follow a crosshair; a crosshair is a one-time placement, not a placeable that keeps moving."
					);

				const crosshairDoc = validatedTarget.document ?? validatedTarget;
				const orientation = crosshairDoc.getOrientation().source;
				if (!lib.is_real_number(orientation?.x) || !lib.is_real_number(orientation?.y))
					throw this.sequence._customError(
						this,
						"moveTo",
						"could not resolve a position from the given crosshair"
					);
				const halfSize = canvaslib.get_object_dimensions(this._originObject, true);
				validatedTarget = {
					x: orientation.x - halfSize.width,
					y: orientation.y - halfSize.height,
				};
			}

			const isPlaceableOrDocument =
				!isCrosshair
				&& (validatedTarget instanceof foundry.canvas.placeables.PlaceableObject
					|| validatedTarget instanceof foundry.abstract.Document);

			if (options.attachTo && !isPlaceableOrDocument)
				throw this.sequence._customError(
					this,
					"moveTo",
					"`attachTo: true` requires a placeable, document, or named-object target to follow; a literal {x, y} has nothing to attach to."
				);

			if (isPlaceableOrDocument) {
				attachToUuid =
					validatedTarget.document?.uuid ?? validatedTarget.uuid ?? null;
				if (options.attachTo && !attachToUuid)
					throw this.sequence._customError(
						this,
						"moveTo",
						"`attachTo: true` could not resolve a uuid from the given target"
					);

				const resolved = canvaslib.get_object_position(validatedTarget, {
					exact: true,
					ignoreMotion: options.ignoreMotion,
				});
				if (!lib.is_real_number(resolved?.x) || !lib.is_real_number(resolved?.y))
					throw this.sequence._customError(
						this,
						"moveTo",
						"could not resolve a position from inTarget"
					);
				validatedTarget = { x: resolved.x, y: resolved.y };
			} else if (
				!lib.is_real_number(validatedTarget?.x)
				|| !lib.is_real_number(validatedTarget?.y)
			) {
				throw this.sequence._customError(
					this,
					"moveTo",
					"inTarget must be an {x, y} coordinate, a placeable, a document, or the name of a placed object"
				);
			}
		}

		const xConfig = isKeyframe
			? this._buildKeyframeTrack("moveTo", inTarget, options, "x")
			: this._buildSingleTrack("moveTo", validatedTarget, options, "x");
		const yConfig = isKeyframe
			? this._buildKeyframeTrack("moveTo", inTarget, options, "y")
			: this._buildSingleTrack("moveTo", validatedTarget, options, "y");

		if (!isKeyframe && options.attachTo) {
			xConfig.attached = true;
			xConfig.attachToUuid = attachToUuid;
			xConfig.attachIgnoreMotion = options.ignoreMotion;
			xConfig.attachAxis = "x";
			yConfig.attached = true;
			yConfig.attachToUuid = attachToUuid;
			yConfig.attachIgnoreMotion = options.ignoreMotion;
			yConfig.attachAxis = "y";
		}

		this._tracks.x.push(xConfig);
		this._tracks.y.push(yConfig);
		return this;
	}

	/**
	 * Tints the sprite toward a target color, then (by default) tints back
	 * to the sprite's original color. Pass a single color for a single-tween
	 * animation, or an array of colors for a keyframed color path.
	 *
	 * Colors accept a hex string (`"#ff0000"`) or a 24-bit integer
	 * (`0xff0000`).
	 *
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default `true`), `easeOut`,
	 * `returnDuration`. The return-leg defaults to mirroring the forward
	 * leg unless overridden.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `returnValues`,
	 * `returnDuration`. Each waypoint is a color value, or a per-key object
	 * `{v: color, duration?, hold?, inEase?, outEase?}` for fine-grained
	 * control. A per-key `hold` (ms) dwells at that waypoint before
	 * continuing. The return leg sweeps back through the keyframes in reverse
	 * over `returnDuration`.
	 *
	 * Multiple `.tintTo()` calls on the same motion compose by RGB
	 * component-wise multiplication, the same rule PIXI itself uses when
	 * combining tints. A red tint at half strength layered under a green
	 * tint at half strength produces a darker yellow, not pure red or pure
	 * green.
	 *
	 * @param {number|string|array} inColor
	 * @param {object} [inOptions={}]
	 * @returns {MotionSection}
	 */
	tintTo(inColor, inOptions = {}) {
		if (inColor === undefined || inColor === null)
			throw this.sequence._customError(
				this,
				"tintTo",
				"inColor is required"
			);
		if (typeof inOptions !== "object" || inOptions === null)
			throw this.sequence._customError(
				this,
				"tintTo",
				"inOptions must be of type object"
			);

		const isKeyframe = Array.isArray(inColor);

		let options;
		if (isKeyframe) {
			if ("easeOut" in inOptions) {
				throw this.sequence._customError(
					this,
					"tintTo",
					"`easeOut` is not compatible with keyframe tracks; use per-key `inEase` / `outEase` on the keyframes themselves."
				);
			}

			options = foundry.utils.mergeObject(
				{
					returnValues: undefined,
					duration: undefined,
					returnDuration: undefined,
					ease: "linear",
					delay: 0,
					return: true,
					colorSpace: "rgb",
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
					colorSpace: "rgb",
				},
				inOptions
			);

			if (options.easeOut === undefined) options.easeOut = options.ease;
			if (options.returnDuration === undefined)
				options.returnDuration = options.duration;
		}

		if (options.colorSpace !== "rgb" && options.colorSpace !== "hsv") {
			throw this.sequence._customError(
				this,
				"tintTo",
				`options.colorSpace must be "rgb" or "hsv"; got ${JSON.stringify(options.colorSpace)}`
			);
		}

		let trackConfig;
		if (isKeyframe) {
			trackConfig = this._buildKeyframeTrack(
				"tintTo",
				inColor.map((entry) => {
					if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
						return { ...entry, v: this._normalizeColor("tintTo", entry.v) };
					}
					return this._normalizeColor("tintTo", entry);
				}),
				options,
				"tint",
				"inColor"
			);
		} else {
			const decimal = this._normalizeColor("tintTo", inColor);
			trackConfig = this._buildSingleTrack(
				"tintTo",
				{ tint: decimal },
				options,
				"tint"
			);
		}

		trackConfig.colorSpace = options.colorSpace;
		this._tracks.tint.push(trackConfig);
		return this;
	}

	/**
	 * @private
	 *
	 * Accepts a hex string (`"#ff0000"`) or a 24-bit integer (`0xff0000`)
	 * and returns the integer. Throws if neither form is valid.
	 */
	_normalizeColor(methodName, inColor) {
		if (lib.is_real_number(inColor)) {
			if (inColor < 0 || inColor > 0xffffff) {
				throw this.sequence._customError(
					this,
					methodName,
					`color must be a 24-bit integer in [0, 0xffffff]; got ${inColor}`
				);
			}
			return Math.round(inColor);
		}
		if (typeof inColor === "string") {
			const trimmed = inColor.startsWith("#") ? inColor.slice(1) : inColor;
			if (!/^[0-9a-fA-F]{6}$/.test(trimmed)) {
				throw this.sequence._customError(
					this,
					methodName,
					`color must be a 6-digit hex string like "#ff0000" or "ff0000"; got "${inColor}"`
				);
			}
			return parseInt(trimmed, 16);
		}
		throw this.sequence._customError(
			this,
			methodName,
			"color must be a hex string or a 24-bit integer"
		);
	}

	/**
	 * Rotates the sprite to the given angle in degrees, then (by default)
	 * rotates back to its resting angle.
	 *
	 * The angle is a document-space rotation, the same value you'd pass to
	 * `token.document.update({ rotation })`. The path is literal: rotating
	 * to 350 from a resting angle of 10 sweeps +340 degrees.
	 *
	 * Accepts a single angle, or an array of waypoint angles for a
	 * multi-segment path. Waypoints are numbers, or per-key objects
	 * `{v: number, duration?, hold?, inEase?, outEase?}` matching the
	 * `.moveTo()` keyframe form.
	 *
	 * Single-angle form options:
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default `true`), `easeOut`,
	 * `returnDuration`. The return-leg defaults mirror the forward leg.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `return`,
	 * `returnValues`, `returnDuration`.
	 *
	 * Tokens with locked rotation rest at a visible angle of 0, so the
	 * motion rotates them from 0 regardless of their document rotation.
	 *
	 * @param {number|array} inRotation
	 * @param {object} [inOptions={}]
	 * @returns {MotionSection}
	 */
	rotateTo(inRotation, inOptions = {}) {
		if (inRotation === undefined || inRotation === null)
			throw this.sequence._customError(
				this,
				"rotateTo",
				"inRotation is required"
			);
		if (typeof inOptions !== "object" || inOptions === null)
			throw this.sequence._customError(
				this,
				"rotateTo",
				"inOptions must be of type object"
			);

		const isKeyframe = Array.isArray(inRotation);
		const options = this._mergeScalarTrackOptions("rotateTo", isKeyframe, inOptions);

		let trackConfig;
		if (isKeyframe) {
			trackConfig = this._buildKeyframeTrack(
				"rotateTo",
				inRotation,
				options,
				"rotation",
				"inRotation"
			);
		} else {
			if (!lib.is_real_number(inRotation))
				throw this.sequence._customError(
					this,
					"rotateTo",
					"inRotation must be a real number (degrees)"
				);
			trackConfig = this._buildSingleTrack(
				"rotateTo",
				{ rotation: inRotation },
				options,
				"rotation"
			);
		}

		this._tracks.rotation.push(trackConfig);
		return this;
	}

	/**
	 * Fades the sprite to the given opacity, then (by default) fades back
	 * to its resting opacity.
	 *
	 * The target is an absolute alpha between `0` (invisible) and `1`
	 * (fully visible): fading to `0.5` ends at half visibility regardless
	 * of the sprite's resting opacity, including fading an invisible
	 * sprite up (a reveal from resting opacity 0).
	 *
	 * Accepts a single alpha, or an array of waypoint alphas for a
	 * multi-segment path. Waypoints are numbers in `[0, 1]`, or per-key
	 * objects `{v: number, duration?, hold?, inEase?, outEase?}` matching
	 * the `.moveTo()` keyframe form.
	 *
	 * Single-alpha form options:
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default `true`), `easeOut`,
	 * `returnDuration`. The return-leg defaults mirror the forward leg.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `return`,
	 * `returnValues`, `returnDuration`.
	 *
	 * @param {number|array} inAlpha
	 * @param {object} [inOptions={}]
	 * @returns {MotionSection}
	 */
	fadeTo(inAlpha, inOptions = {}) {
		if (inAlpha === undefined || inAlpha === null)
			throw this.sequence._customError(
				this,
				"fadeTo",
				"inAlpha is required"
			);
		if (typeof inOptions !== "object" || inOptions === null)
			throw this.sequence._customError(
				this,
				"fadeTo",
				"inOptions must be of type object"
			);

		const validateAlpha = (value) => {
			if (!lib.is_real_number(value) || value < 0 || value > 1)
				throw this.sequence._customError(
					this,
					"fadeTo",
					"alpha must be a real number in [0, 1]"
				);
			return value;
		};

		const isKeyframe = Array.isArray(inAlpha);
		const options = this._mergeScalarTrackOptions("fadeTo", isKeyframe, inOptions);

		let trackConfig;
		if (isKeyframe) {
			if (options.returnValues !== undefined) {
				for (const entry of options.returnValues) {
					validateAlpha(entry && typeof entry === "object" && "v" in entry ? entry.v : entry);
				}
			}
			trackConfig = this._buildKeyframeTrack(
				"fadeTo",
				inAlpha.map((entry) => {
					if (entry && typeof entry === "object" && "v" in entry) {
						return { ...entry, v: validateAlpha(entry.v) };
					}
					return validateAlpha(entry);
				}),
				options,
				"alpha",
				"inAlpha"
			);
		} else {
			validateAlpha(inAlpha);
			trackConfig = this._buildSingleTrack(
				"fadeTo",
				{ alpha: inAlpha },
				options,
				"alpha"
			);
		}

		this._tracks.alpha.push(trackConfig);
		return this;
	}

	/**
	 * Scales the sprite relative to its resting size, then (by default)
	 * scales back. Scaling to `1.5` ends at 1.5 times how the sprite looks
	 * at rest; mirrored sprites stay mirrored.
	 *
	 * Accepts:
	 * - A single positive number, scaling both axes uniformly
	 * - A `{x, y}` object of positive numbers; a missing axis is left
	 *   unscaled, so `{x: 2}` stretches only horizontally
	 * - An array of waypoints for a multi-segment path, where each
	 *   waypoint is a positive number, a full `{x, y}` pair, or a per-key
	 *   object `{v: number|{x, y}, duration?, hold?, inEase?, outEase?}`
	 *   matching the `.moveTo()` keyframe form. The keyframe form always
	 *   drives both axes (numbers apply to both).
	 *
	 * Single-target form options:
	 * Required: `duration` (ms).
	 * Optional: `ease`, `delay`, `return` (default `true`), `easeOut`,
	 * `returnDuration`. The return-leg defaults mirror the forward leg.
	 *
	 * Keyframe form accepts: `duration`, `ease`, `delay`, `return`,
	 * `returnValues`, `returnDuration`.
	 *
	 * Multiple `.scaleTo()` calls compose by multiplication, and compose
	 * the same way with `.oscillate()`'s scale axis.
	 *
	 * @param {number|object|array} inScale
	 * @param {object} [inOptions={}]
	 * @returns {MotionSection}
	 */
	scaleTo(inScale, inOptions = {}) {
		if (inScale === undefined || inScale === null)
			throw this.sequence._customError(
				this,
				"scaleTo",
				"inScale is required"
			);
		if (typeof inOptions !== "object" || inOptions === null)
			throw this.sequence._customError(
				this,
				"scaleTo",
				"inOptions must be of type object"
			);

		const isKeyframe = Array.isArray(inScale);
		const options = this._mergeScalarTrackOptions("scaleTo", isKeyframe, inOptions);

		if (isKeyframe) {
			const normalizedEntries = inScale.map((entry) => {
				if (entry && typeof entry === "object" && "v" in entry) {
					return { ...entry, v: this._normalizeScaleValue("scaleTo", entry.v, true) };
				}
				return this._normalizeScaleValue("scaleTo", entry, true);
			});
			const normalizedReturnValues = options.returnValues?.map((entry) => {
				if (entry && typeof entry === "object" && "v" in entry) {
					return { ...entry, v: this._normalizeScaleValue("scaleTo", entry.v, true) };
				}
				return this._normalizeScaleValue("scaleTo", entry, true);
			});
			const axisOptions = normalizedReturnValues
				? { ...options, returnValues: normalizedReturnValues }
				: options;
			for (const axis of ["x", "y"]) {
				const config = this._buildKeyframeTrack(
					"scaleTo",
					normalizedEntries,
					axisOptions,
					axis,
					"inScale"
				);
				config.absolute = false;
				config.scaleAxis = axis;
				this._tracks.scale.push(config);
			}
		} else {
			const normalized = this._normalizeScaleValue("scaleTo", inScale, false);
			for (const axis of ["x", "y"]) {
				if (normalized[axis] === undefined) continue;
				const config = this._buildSingleTrack(
					"scaleTo",
					{ scale: normalized[axis] },
					options,
					"scale"
				);
				config.absolute = false;
				config.from = 1;
				config.scaleAxis = axis;
				this._tracks.scale.push(config);
			}
		}

		return this;
	}

	/**
	 * @private
	 *
	 * Shared options-merging for the scalar-track builders (`rotateTo`,
	 * `fadeTo`, `scaleTo`). Mirrors the keyframe/single split `moveTo` and
	 * `tintTo` use: the keyframe form rejects `easeOut` and accepts
	 * `returnValues`; the single form defaults `easeOut`/`returnDuration`
	 * off the forward leg.
	 */
	_mergeScalarTrackOptions(methodName, isKeyframe, inOptions) {
		if (isKeyframe) {
			if ("easeOut" in inOptions) {
				throw this.sequence._customError(
					this,
					methodName,
					"`easeOut` is not compatible with keyframe tracks; use per-key `inEase` / `outEase` on the keyframes themselves."
				);
			}
			return foundry.utils.mergeObject(
				{
					returnValues: undefined,
					duration: undefined,
					returnDuration: undefined,
					ease: "linear",
					delay: 0,
					return: true,
				},
				inOptions
			);
		}
		const options = foundry.utils.mergeObject(
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
		if (options.easeOut === undefined) options.easeOut = options.ease;
		if (options.returnDuration === undefined)
			options.returnDuration = options.duration;
		return options;
	}

	/**
	 * @private
	 *
	 * Normalizes a `.scaleTo()` value to a `{x, y}` pair. A positive number
	 * becomes `{x: v, y: v}`. An object keeps its provided axes, each a
	 * positive real number. When `requireBothAxes` is true (keyframe form),
	 * an object must provide both axes so every waypoint drives both tracks;
	 * when false (single-target form), a missing axis stays undefined and no
	 * track is built for it.
	 */
	_normalizeScaleValue(methodName, value, requireBothAxes) {
		if (lib.is_real_number(value)) {
			if (value <= 0)
				throw this.sequence._customError(
					this,
					methodName,
					"scale must be a positive number"
				);
			return { x: value, y: value };
		}
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const hasX = value.x !== undefined;
			const hasY = value.y !== undefined;
			if (!hasX && !hasY)
				throw this.sequence._customError(
					this,
					methodName,
					"a {x, y} scale must provide at least one axis"
				);
			if (requireBothAxes && (!hasX || !hasY))
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe scale waypoints must provide both axes; use a number to scale both uniformly"
				);
			for (const axis of ["x", "y"]) {
				if (value[axis] === undefined) continue;
				if (!lib.is_real_number(value[axis]) || value[axis] <= 0)
					throw this.sequence._customError(
						this,
						methodName,
						`scale ${axis} must be a positive number`
					);
			}
			return { x: value.x, y: value.y };
		}
		throw this.sequence._customError(
			this,
			methodName,
			"scale must be a positive number or a {x, y} object of positive numbers"
		);
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
	 * Validates a keyframe track and builds the per-axis TrackConfig.
	 * `outwardValues` is the waypoint array the builder received;
	 * `options` are the (already-defaults-merged) tween options.
	 * `parameterName` is the builder's first-parameter name, used in
	 * error messages so they reference the argument the user passed.
	 *
	 * @private
	 */
	_buildKeyframeTrack(methodName, outwardValues, options, axis, parameterName = "inTarget") {
		if (outwardValues.length < 2)
			throw this.sequence._customError(
				this,
				methodName,
				`${parameterName} must have at least 2 elements (one segment)`
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
		if (options.return === false && options.returnValues !== undefined)
			throw this.sequence._customError(
				this,
				methodName,
				"`return: false` and `returnValues` are contradictory; pick one."
			);
		if (options.return === false && options.returnDuration !== undefined)
			throw this.sequence._customError(
				this,
				methodName,
				"`return: false` and `returnDuration` are contradictory; pick one."
			);
		if (
			options.returnDuration !== undefined &&
			(!lib.is_real_number(options.returnDuration) || options.returnDuration <= 0)
		)
			throw this.sequence._customError(
				this,
				methodName,
				"options.returnDuration must be a positive real number when specified"
			);

		const outwardFrames = this._normalizeKeyframes(
			methodName,
			outwardValues,
			options.duration,
			options.ease,
			axis,
			parameterName
		);

		const outwardDuration = outwardFrames.reduce(
			(sum, frame) => sum + frame.segmentDuration,
			0
		);
		const returnDuration = options.returnDuration ?? outwardDuration;

		let returnFrames;
		let defaultReturn = false;
		if (options.return) {
			if (options.returnValues !== undefined) {
				if (!Array.isArray(options.returnValues) || options.returnValues.length < 1) {
					throw this.sequence._customError(
						this,
						methodName,
						"inOptions.returnValues must be an array with at least 1 element"
					);
				}
				const returnValuesHavePerKeyDurations = options.returnValues.some(
					(entry) =>
						entry &&
						typeof entry === "object" &&
						"v" in entry &&
						entry.duration !== undefined
				);
				const returnTrackLevelDuration =
					options.returnDuration !== undefined
						? options.returnDuration
						: returnValuesHavePerKeyDurations
							? undefined
							: outwardDuration;
				returnFrames = this._normalizeKeyframes(
					methodName,
					options.returnValues,
					returnTrackLevelDuration,
					options.ease,
					axis,
					"inOptions.returnValues",
					true
				);
			} else {
				defaultReturn = true;
			}
		}

		return {
			form: "keyframe",
			frames: outwardFrames,
			returnFrames,
			defaultReturn,
			returnDuration,
			defaultReturnEase: options.ease,
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
	 * `hasIncomingSegment` distinguishes the two array roles. An outward
	 * array's first element is the starting value: no segment ends there,
	 * so it gets `segmentDuration: 0` and per-key `duration` on it is
	 * rejected. A `returnValues` array is played as
	 * `[lastOutwardFrame, ...returnFrames]`, so EVERY element is a
	 * destination with an incoming segment: the first element takes a
	 * duration (per-key or an even share of the track-level total) and
	 * resolves its own ease.
	 *
	 * @private
	 */
	_normalizeKeyframes(
		methodName,
		rawValues,
		trackLevelDuration,
		trackLevelEase,
		axis,
		fieldPath,
		hasIncomingSegment = false
	) {
		const valueShape =
			axis === "tint" || axis === "rotation" || axis === "alpha"
				? "scalar"
				: "coord";
		const isLiteralValue = valueShape === "coord"
			? (candidate) =>
				candidate
				&& typeof candidate === "object"
				&& lib.is_real_number(candidate.x)
				&& lib.is_real_number(candidate.y)
			: (candidate) => lib.is_real_number(candidate);
		const isKeyframeObject = (candidate) =>
			candidate
			&& typeof candidate === "object"
			&& "v" in candidate
			&& !isLiteralValue(candidate);
		const literalShapeError = valueShape === "coord"
			? `${fieldPath}[0] must be a {x, y} coordinate pair or a keyframe object {v: {x, y}, ...}`
			: `${fieldPath}[0] must be a number or a keyframe object {v: number, ...}`;
		const literalMixedError = valueShape === "coord"
			? `${fieldPath} is mixed; either every element is a {x, y} coordinate pair or every element is a keyframe object.`
			: `${fieldPath} is mixed; either every element is a number or every element is a keyframe object.`;

		const firstElement = rawValues[0];
		let shape;
		if (isLiteralValue(firstElement)) {
			shape = "literal";
		} else if (isKeyframeObject(firstElement)) {
			shape = "keyframe";
		} else {
			throw this.sequence._customError(
				this,
				methodName,
				literalShapeError
			);
		}

		for (let keyframeIndex = 0; keyframeIndex < rawValues.length; keyframeIndex++) {
			const keyframeInput = rawValues[keyframeIndex];
			if (shape === "literal" && !isLiteralValue(keyframeInput)) {
				throw this.sequence._customError(
					this,
					methodName,
					literalMixedError
				);
			}
			if (shape === "keyframe" && !isKeyframeObject(keyframeInput)) {
				throw this.sequence._customError(
					this,
					methodName,
					literalMixedError
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
			if (!hasIncomingSegment && perKeyDurationKeys.includes(0)) {
				throw this.sequence._customError(
					this,
					methodName,
					"keyframe `duration` on the first key is meaningless; no segment ends at the first key. Set `duration` on every key after the first instead."
				);
			}
		}

		const perKeyHolds = rawValues.map((keyframeInput) => {
			if (shape !== "keyframe" || keyframeInput.hold === undefined) return 0;
			if (!lib.is_real_number(keyframeInput.hold) || keyframeInput.hold < 0) {
				throw this.sequence._customError(
					this,
					methodName,
					`${fieldPath} keyframe \`hold\` must be a non-negative real number`
				);
			}
			return keyframeInput.hold;
		});

		const segmentCount = hasIncomingSegment
			? rawValues.length
			: rawValues.length - 1;

		const hasAnyPerKeyDuration = perKeyDurationKeys.length > 0;
		if (hasAnyPerKeyDuration) {
			if (perKeyDurationKeys.length !== segmentCount) {
				throw this.sequence._customError(
					this,
					methodName,
					hasIncomingSegment
						? "keyframe per-key `duration` must be set on every key, or on none."
						: "keyframe per-key `duration` must be set on every key after the first, or on none."
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
				if (keyframeIndex === 0 && !hasIncomingSegment) return 0;
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
			const perSegmentDuration = trackLevelDuration / segmentCount;
			segmentDurations = rawValues.map((_, keyframeIndex) =>
				keyframeIndex === 0 && !hasIncomingSegment ? 0 : perSegmentDuration
			);
		}

		return rawValues.flatMap((keyframeInput, keyframeIndex) => {
			let axisValue;
			if (shape === "literal") {
				axisValue = valueShape === "coord" ? keyframeInput[axis] : keyframeInput;
			} else {
				if (valueShape === "coord") {
					if (!isLiteralValue(keyframeInput.v)) {
						throw this.sequence._customError(
							this,
							methodName,
							`${fieldPath}[${keyframeIndex}].v must be a {x, y} coordinate pair for ${methodName}`
						);
					}
					axisValue = keyframeInput.v[axis];
				} else {
					if (!lib.is_real_number(keyframeInput.v)) {
						throw this.sequence._customError(
							this,
							methodName,
							`${fieldPath}[${keyframeIndex}].v must be a number for ${methodName}`
						);
					}
					axisValue = keyframeInput.v;
				}
			}

			let segmentEase;
			if (keyframeIndex === 0 && !hasIncomingSegment) {
				// An outward array's first frame has no incoming segment.
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

			const frame = {
				v: axisValue,
				segmentDuration: segmentDurations[keyframeIndex],
				segmentEase,
			};

			// A per-key `hold` dwells at the waypoint after arriving, so we add a synthetic key to replicate the hold
			if (perKeyHolds[keyframeIndex] > 0) {
				return [
					frame,
					{
						v: axisValue,
						segmentDuration: perKeyHolds[keyframeIndex],
						segmentEase: "linear",
					},
				];
			}
			return frame;
		});
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
			let safetyTimeout;
			const finish = () => {
				Hooks.off("refreshToken", hookId);
				clearTimeout(safetyTimeout);
				resolve();
			};
			const hookId = Hooks.on("refreshToken", (tokenDoc) => {
				if (tokenDoc.document.actorId !== token.document.actorId || !token.mesh) return;
				finish();
			});
			safetyTimeout = setTimeout(finish, 5000);
		});
	}

	/**
	 * @private
	 *
	 * Cross-method validation that depends on the section's final state
	 * after all chained methods have run. Builder methods (`.moveTo()`,
	 * `.tintTo()`, etc.) and persistence methods (`.persist()`,
	 * `.persistUntilUpdate()`) can be called in any order, so checks
	 * that span multiple methods belong here rather than at build time.
	 * Called from `run()` so a thrown error surfaces as both a UI
	 * notification and a console unhandled rejection; `_initialize()`
	 * swallows throws via `Promise.allSettled` in the play loop and is
	 * unsuitable for hard validation.
	 */
	_expressWarnings() {
		if (this._persistUntilUpdate) {
			for (const propertyName of ["x", "y", "rotation", "scale", "alpha", "tint"]) {
				for (const track of this._tracks[propertyName]) {
					if (track.form === "single" && track.return) {
						throw this.sequence._customError(
							this,
							"motion",
							"`.persistUntilUpdate()` is incompatible with `return: true` tracks; the document update is the return. Pass `return: false` on the track."
						);
					}
					if (track.form === "keyframe" && (track.returnFrames || track.defaultReturn)) {
						throw this.sequence._customError(
							this,
							"motion",
							"`.persistUntilUpdate()` is incompatible with returning keyframe tracks; the document update is the return. Pass `return: false` on the track."
						);
					}
				}
			}
		}
	}

	/**
	 * @private
	 */
	async run() {
		this._expressWarnings();

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

		const motionId = foundry.utils.randomID();
		const creationTimestamp = Date.now();

		const overallDuration = this._computeOverallDuration();
		const resolvedNoise = this._resolveNoiseForRun(placeable);
		const resolvedOscillate = this._resolveOscillateForRun(placeable);

		const data = {
			_id: motionId,
			flagVersion: flagManager.latestMotionFlagVersion,
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
			noise: resolvedNoise,
			oscillate: resolvedOscillate,
			overallDuration,
			creationTimestamp,
		};

		const push = !this.sequence.local && !this.sequence.remote;
		const { finished } = SequencerMotionManager.startMotion(data, push);

		const persistent = this._persist || this._persistUntilUpdate;
		if (persistent) {
			await finished;
			if (this._currentWaitTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, this._currentWaitTime));
			}
			return;
		}
		return new Promise((resolve) => {
			setTimeout(resolve, overallDuration + this._currentWaitTime);
		});
	}

	/**
	 * @private
	 *
	 * Longest `delay + outward (+ return)` across every track. Used only
	 * by the non-persistent wait path in `run()` and broadcast in the
	 * data payload for telemetry. Persistent motions ignore this number
	 * and wait on the manager's `finished` promise instead.
	 */
	_computeOverallDuration() {
		let longest = 0;
		for (const propertyName of ["x", "y", "rotation", "scale", "alpha", "tint"]) {
			for (const track of this._tracks[propertyName]) {
				const delay = track.delay ?? 0;
				let outwardDuration;
				let returnDuration;
				if (track.form === "single") {
					outwardDuration = track.duration;
					returnDuration = track.return ? track.returnDuration : 0;
				} else {
					outwardDuration = track.frames.reduce(
						(sum, frame) => sum + frame.segmentDuration,
						0
					);
					if (track.returnFrames) {
						returnDuration = track.returnFrames.reduce(
							(sum, frame) => sum + frame.segmentDuration,
							0
						);
					} else if (track.defaultReturn) {
						returnDuration = track.returnDuration;
					} else {
						returnDuration = 0;
					}
				}
				const trackEnd = delay + outwardDuration + returnDuration;
				if (trackEnd > longest) longest = trackEnd;
			}
		}
		for (const oscillate of this._oscillate) {
			const delay = oscillate.delay ?? 0;
			const oscillateEnd = delay + (oscillate.duration ?? canvaslib.MOTION_DEFAULT_DURATION);
			if (oscillateEnd > longest) longest = oscillateEnd;
		}
		for (const noise of this._noise) {
			const delay = noise.delay ?? 0;
			const noiseEnd = delay + (noise.duration ?? canvaslib.MOTION_DEFAULT_DURATION);
			if (noiseEnd > longest) longest = noiseEnd;
		}
		return longest;
	}

	/**
	 * @private
	 *
	 * Resolves each noise entry's `strengthScaledToObject` against the
	 * placeable's dimensions and rewrites it into a plain `strength` so
	 * the manager only ever sees one concrete shape.
	 */
	_resolveNoiseForRun(placeable) {
		if (this._noise.length === 0) return [];

		const dimensions = canvaslib.get_object_dimensions(placeable);
		return this._noise.map((noise) => {
			if (noise.strength !== undefined) return noise;
			const scaled = noise.strengthScaledToObject;
			let strength;
			if (typeof scaled === "object") {
				strength = {
					x: scaled.x * dimensions.width,
					y: scaled.y * dimensions.height,
				};
			} else {
				strength = {
					x: scaled * dimensions.width,
					y: scaled * dimensions.height,
				};
			}
			return { ...noise, strength, strengthScaledToObject: undefined };
		});
	}

	/**
	 * @private
	 *
	 * Resolves each oscillate entry's per-axis `strengthScaledToObject`
	 * against the placeable's dimensions and rewrites it into a plain
	 * `amplitude` so the manager only ever sees one concrete shape. Only
	 * the `x` and `y` axes carry the scaled form.
	 */
	_resolveOscillateForRun(placeable) {
		if (this._oscillate.length === 0) return [];

		const dimensions = canvaslib.get_object_dimensions(placeable);
		return this._oscillate.map((oscillate) => {
			const xNeedsResolve = oscillate.x?.strengthScaledToObject !== undefined;
			const yNeedsResolve = oscillate.y?.strengthScaledToObject !== undefined;
			if (!xNeedsResolve && !yNeedsResolve) return oscillate;

			const resolved = { ...oscillate };
			if (xNeedsResolve) {
				resolved.x = {
					...oscillate.x,
					amplitude: oscillate.x.strengthScaledToObject * dimensions.width,
					strengthScaledToObject: undefined,
				};
			}
			if (yNeedsResolve) {
				resolved.y = {
					...oscillate.y,
					amplitude: oscillate.y.strengthScaledToObject * dimensions.height,
					strengthScaledToObject: undefined,
				};
			}
			return resolved;
		});
	}
}
