import Crosshairs from "./Crosshairs.js";

export default class Crosshair {

	/**
	 * @param {MeasuredTemplateData/Object} template
	 * @param {CrosshairData/Object} crosshair
	 * @param {CrosshairCallbackData/Object} callbacks
	 * @returns {*}
	 */
	static show({ template = {}, crosshair= {}, callbacks= {} }={}) {

		const reticle = new Crosshairs({
			...template,
			t: template?.t ?? CONST.MEASURED_TEMPLATE_TYPES.CIRCLE,
			distance: template?.distance ?? 0.5,
			direction: template.direction ?? 0,
			angle: template.angle ?? 0,
			borderColor: template.borderColor ?? "#000000",
			fillColor: template.fillColor ?? "#000000",
		}, {
			parent: canvas.scene
		}, foundry.utils.mergeObject(Crosshairs.defaultConfig(), crosshair), callbacks);

		return reticle.show();

	}

	/**
	 * @param {MeasuredTemplateData} crosshair
	 * @param {String/Array<string>} types
	 * @param {Function} filterMethod
	 * @returns {Array<Document>|Object<String:Array<Document>>}
	 */
	static collect(crosshair, types = "Token", filterMethod=this.containsCenter) {

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
