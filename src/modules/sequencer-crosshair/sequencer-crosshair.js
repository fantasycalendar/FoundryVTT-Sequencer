import CrosshairsDocument from "./CrosshairsDocument.js";
import TokenCrosshairsDocument from "./TokenCrosshairsDocument.js";
import CONSTANTS from "../../constants.js";
import CrosshairsPlaceable from "./CrosshairsPlaceable.js";
import SequencerMotionManager from "../sequencer-motion-manager.js";
import * as lib from "../../lib/lib.js";

export default class Crosshair {

	static PLACEMENT_RESTRICTIONS = CONSTANTS.PLACEMENT_RESTRICTIONS;
	static CALLBACKS = CONSTANTS.CALLBACKS;

	/**
	 * Show a configurable crosshair
	 *
	 * @param {CrosshairData/Object} config
	 * @param {CrosshairCallbackData/Object} callbacks
	 * @returns {Promise}
	 */
	static show(config = {}, callbacks = {}) {

		const reticle = new CrosshairsDocument({
			t: config.t ?? CONST.MEASURED_TEMPLATE_TYPES.CIRCLE,
			distance: config?.distance ?? canvas.grid.distance / 2,
			width: config?.width ?? canvas.grid.distance,
			borderColor: config.borderColor ?? "#000000",
			fillColor: config.fillColor ?? game.user.color,
			texture: config.texture,
			angle: config.angle ?? 53.13, // Default for Foundry, it seems?
			direction: config.direction ?? 0
		}, {
			parent: canvas.scene
		}, foundry.utils.mergeObject(CrosshairsDocument.defaultConfig, config), callbacks);

		return reticle.show();

	}

	/**
	 * Show a configurable crosshair based a PlaceableObject
	 *
	 * @param {PlaceableObject} obj
	 * @param {CrosshairData/Object} config
	 * @param {CrosshairCallbackData/Object} callbacks
	 * @returns {Promise}
	 */
	static showToken(obj, config = {}, callbacks = {}) {

		const placeable = obj instanceof foundry.canvas.placeables.PlaceableObject ? obj : obj.object;

		const controlled = placeable.controlled;
		placeable.release();

		const reticle = new TokenCrosshairsDocument(placeable, {
			parent: canvas.scene
		}, config, callbacks);

		return reticle.show().finally(() => {
			if (controlled) placeable.control()
		});

	}

	/**
	 * Collects the placeables of the given embedded type(s) that fall within
	 * a placed crosshair's shape.
	 *
	 * `collect(crosshair, options)` where `options` is
	 * `{ types, filterMethod, ignoreMotion }`:
	 *   - `types`: the embedded document type(s) to collect (string or array,
	 *     default `"Token"`).
	 *   - `filterMethod`: `(placeable, crosshair, shape, options) => boolean`,
	 *     the containment test. Defaults to a centre-containment test.
	 *   - `ignoreMotion`: when false (default), a placeable displaced by a
	 *     `.motion()` is collected at its visible (motion-displaced) position;
	 *     pass true to collect at its document position. Only affects the
	 *     default `filterMethod`; a custom `filterMethod` receives the flag in
	 *     its fourth argument and may honor or ignore it.
	 *
	 * (A legacy positional argument form is still accepted but deprecated and
	 * emits a warning; use the options object above.)
	 *
	 * @param {CrosshairsDocument} crosshair
	 * @param {object} [options] `{ types, filterMethod, ignoreMotion }`.
	 * @returns {Array<Document>/Record<String, Array<Document>>}
	 */
	static collect(crosshair, typesOrOptions = "Token", filterMethod, options = {}) {

		let types;
		let ignoreMotion;

		const isOptionsObject =
			typeof typesOrOptions === "object"
			&& typesOrOptions !== null
			&& !Array.isArray(typesOrOptions);

		if (isOptionsObject) {
			types = typesOrOptions.types ?? "Token";
			filterMethod = typesOrOptions.filterMethod ?? this.containsCenter;
			ignoreMotion = typesOrOptions.ignoreMotion ?? false;
		} else {
			if (arguments.length > 1) {
				lib.throttled_custom_warning(
					"Sequencer",
					"Crosshair.collect | The positional arguments form `collect(crosshair, types, filterMethod, options)` is deprecated and will be removed in a future version. Pass a single options object instead: `collect(crosshair, { types, filterMethod, ignoreMotion })`.",
					10000,
					true
				);
			}
			types = typesOrOptions;
			filterMethod = filterMethod ?? this.containsCenter;
			ignoreMotion = options.ignoreMotion ?? false;
		}

		const typesArray = Array.isArray(types) ? types : [types];
		const crosshairDoc = crosshair instanceof CrosshairsPlaceable ? crosshair.document : crosshair;
		const shape = crosshairDoc.getCrosshairShape();
		shape.x = crosshair.x;
		shape.y = crosshair.y;

		const result = typesArray.reduce((acc, embeddedName) => {
			const collection = crosshairDoc.parent.getEmbeddedCollection(embeddedName);

			acc[embeddedName] = collection.filter((document) => {
				return filterMethod(document.object, crosshairDoc, shape, { ignoreMotion });
			});
			return acc;
		}, {});

		/* if we are only collecting one kind of placeable, only return one kind of placeable */
		return Array.isArray(types) ? result : result[types];

	}

	static containsCenter(placeable, crosshair, shape, { ignoreMotion = false } = {}) {
		let { x, y } = placeable.center;
		if (!ignoreMotion) {
			const displacement = SequencerMotionManager.getDisplacement(placeable);
			if (displacement) {
				x += displacement.deltaX;
				y += displacement.deltaY;
			}
		}
		return shape.contains(x, y);
	}

}
