import CrosshairsDocument from "./CrosshairsDocument.js";
import TokenCrosshairsDocument from "./TokenCrosshairsDocument.js";
import CONSTANTS from "../../constants.js";

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
			fillColor: config.fillColor ?? "#000000",
			angle: config.angle ?? 53.13, // Default for Foundry, it seems?
			direction: config.direction ?? 0
		}, {
			parent: canvas.scene
		}, foundry.utils.mergeObject(CrosshairsDocument.defaultConfig, config), callbacks);

		return reticle.show();

	}

	/**
	 * Show a configurable crosshair based a foundry PlaceableObject
	 *
	 * @param {PlaceableObject} obj
	 * @param {CrosshairData/Object} config
	 * @param {CrosshairCallbackData/Object} callbacks
	 * @returns {Promise}
	 */
	static showToken(obj, config = {}, callbacks = {}) {

		const placeable = obj instanceof PlaceableObject ? obj : obj.object;

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
	 * @param {CrosshairData} crosshair
	 * @param {String/Array<string>} types
	 * @param {(object: PlaceableObject, crosshair: CrosshairData) => boolean} filterMethod
	 * @returns {Array<Document>/Record<String, Array<Document>>}
	 */
	static collect(crosshair, types = "Token", filterMethod = this.containsCenter) {

		const typesArray = Array.isArray(types) ? types : [types];

		const result = typesArray.reduce((acc, embeddedName) => {
			const collection = crosshair.parent.getEmbeddedCollection(embeddedName);

			acc[embeddedName] = collection.filter((document) => {
				return filterMethod(document.object, crosshair);
			});
			return acc;
		}, {});

		/* if we are only collecting one kind of placeable, only return one kind of placeable */
		return Array.isArray(types) ? result : result[types];

	}

	static containsCenter(placeable, crosshair) {
		const calcDistance = (A, B) => {
			return Math.hypot(A.x - B.x, A.y - B.y);
		};

		const distance = calcDistance(placeable.center, crosshair);
		return distance <= crosshair.distance * crosshair.parent.grid.size;
	}

}
