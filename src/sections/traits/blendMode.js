import { is_real_number, throttled_custom_warning } from "../../lib/lib.js";
import CONSTANTS from "../../constants.js";

/**
 * Reverse lookup from numeric blend mode value to the canonical name used in
 * CONSTANTS.BLEND_MODES. Built once on module load.
 *
 * @type {Map<number, string>}
 */
const BLEND_MODE_NAMES = new Map(
	Object.entries(CONSTANTS.BLEND_MODES).map(([name, value]) => [value, name])
);

/**
 * Normalize a given blend mode name into the PIXI lookup key.
 * Accepts spaces, hyphens, or underscores between words and is case-insensitive.
 * e.g. "Soft Light", "soft-light", "SOFT_LIGHT", "softlight" → "soft_light"
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeBlendModeName(name) {
	return String(name)
		.toLowerCase()
		.replace(/[\s\-]+/g, "_")
		.replace(/_+/g, "_")
		.trim();
}

/**
 * Resolve a string OR numeric input into the canonical PIXI.BLEND_MODES numeric
 * value. Returns null if the value cannot be resolved.
 *
 * Strings are looked up in CONSTANTS.BLEND_MODES (with name normalization, plus
 * a handful of aliases collapsed to the canonical key). Numbers are validated
 * to be one of the values in CONSTANTS.BLEND_MODES.
 *
 * @param {number|string} value
 * @returns {number|null}
 */
function resolveBlendMode(value) {
	if (is_real_number(value)) {
		const knownValues = Object.values(CONSTANTS.BLEND_MODES);
		return knownValues.includes(value) ? value : null;
	}
	if (typeof value !== "string") return null;

	let key = normalizeBlendModeName(value);

	// A few common aliases that don't share a stem with the canonical key.
	const aliases = {
		none: "none",
		dodge: "color_dodge",
		burn: "color_burn",
		hardlight: "hard_light",
		softlight: "soft_light",
		colordodge: "color_dodge",
		colorburn: "color_burn",
		normalnpm: "normal_npm",
		addnpm: "add_npm",
		screennpm: "screen_npm"
	};
	const compact = key.replace(/_/g, "");
	if (aliases[compact]) key = aliases[compact];

	const resolved = CONSTANTS.BLEND_MODES[key];
	return is_real_number(resolved) ? resolved : null;
}

export default {
	_blendMode: null,

	/**
	 * Sets the blend mode used when compositing this effect onto the canvas.
	 *
	 * Accepts either a string name (case-insensitive, hyphens/underscores/spaces
	 * tolerated) or a numeric PIXI.BLEND_MODES constant.
	 *
	 * "normal", "add", "multiply", "screen", "subtract", and "erase" render
	 * correctly on the GPU's blend unit. The "advanced" modes (overlay,
	 * soft-light, hard-light, color-dodge, color-burn, darken, lighten,
	 * difference, exclusion, hue, saturation, color, luminosity) are exposed
	 * by name in PIXI v7 but are not implemented by the renderer; requesting
	 * them logs a one-time warning and falls back to normal blending.
	 *
	 * @example
	 *   .blendMode("multiply")
	 *   .blendMode("add")
	 *   .blendMode(PIXI.BLEND_MODES.SCREEN)
	 *
	 * @param {number|string} mode
	 * @returns this
	 */
	blendMode(mode) {
		if (!is_real_number(mode) && typeof mode !== "string") {
			throw this.sequence._customError(
				this,
				"blendMode",
				"mode must be a string (e.g. \"multiply\") or a number (PIXI.BLEND_MODES constant)"
			);
		}
		const resolved = resolveBlendMode(mode);
		if (resolved === null) {
			const valid = Object.keys(CONSTANTS.BLEND_MODES).join(", ");
			throw this.sequence._customError(
				this,
				"blendMode",
				`unknown blend mode "${mode}". Valid modes are: ${valid}`
			);
		}
		if (CONSTANTS.UNSUPPORTED_BLEND_MODES.has(resolved)) {
			const name = BLEND_MODE_NAMES.get(resolved) ?? String(mode);
			throttled_custom_warning(
				"Sequencer",
				`Effect | .blendMode("${name}") is not supported by PIXI v7 and will render as normal blending. Supported modes: normal, add, multiply, screen, subtract, erase.`
			);
		}
		this._blendMode = resolved;
		return this;
	}
};
