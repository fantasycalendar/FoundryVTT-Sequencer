import CrosshairsPlaceable from "./CrosshairsPlaceable.js";
import { get_object_canvas_data } from "../../lib/canvas-lib.js";
import CONSTANTS from "../../constants.js";

/**
 *
 *
 * @class CrosshairsDocument
 * @mixes ClientDocumentMixin
 *
 */
export default class CrosshairsDocument extends MeasuredTemplateDocument {

	constructor(config = {}, context = {}, crosshair = {}, callbacks = {}) {
		super(config, context);
		this.crosshair = foundry.utils.mergeObject(CrosshairsDocument.defaultConfig, crosshair);
		this.callbacks = callbacks;
		this.originalConfig = foundry.utils.deepClone(config);
	}

	crosshair = {};
	#layer = null;
	cachedPosition = null;
	originalConfig = {};

	static get placeableClass() {
		return CrosshairsPlaceable;
	}

	static get defaultConfig() {
		return {
			gridHighlight: true,
			icon: {
				texture: "",
				borderVisible: false
			},
			snap: {
				position: CONST.GRID_SNAPPING_MODES.CENTER,
				size: CONST.GRID_SNAPPING_MODES.CENTER,
				direction: 0
			},
			lockDrag: true,
			distanceMin: null,
			distanceMax: null,
			label: {
				text: "",
				dx: 0,
				dy: 0,
			},
			location: {
				obj: null,
				limitMinRange: null,
				limitMaxRange: null,
				showRange: false,
				displayRangePoly: false,
				rangePolyFillColor: null,
				rangePolyLineColor: null,
				rangePolyFillAlpha: null,
				rangePolyLineAlpha: null,
				lockToEdge: false,
				lockToEdgeDirection: false,
				offset: { x: 0, y: 0 },
				wallBehavior: CONSTANTS.PLACEMENT_RESTRICTIONS.ANYWHERE
			},
			lockManualRotation: false
		};
	};

	getOrientation() {
		this.cachedPosition = (!this.object || this.object?.destroyed) ? this.cachedPosition : {
			source: get_object_canvas_data(this.object, { uuid: false }),
			target: this.t === CONST.MEASURED_TEMPLATE_TYPES.CONE || this.t === CONST.MEASURED_TEMPLATE_TYPES.RAY
				? get_object_canvas_data(this.object, { measure: true, uuid: false })
				: null
		};
		return this.cachedPosition;
	}

	get documentName() {
		return 'CrosshairsDocument';
	}

	get layer() {
		if (this.#layer) return this.#layer;
		const create = (doc) => new this.constructor.placeableClass(doc);
		const sink = {
			get(target, prop) {
				switch (prop) {
					case 'createObject':
						return create;
					default:
						return target[prop];
				}
			}
		};

		this.#layer = new Proxy(canvas.activeLayer, sink);
		return this.#layer;
	}

	get isEmbedded() {
		return !!this.parent;
	}

	getCrosshairShape(){
		const {t, distance, direction, angle, width} = this;
		switch ( t ) {
			case "circle":
				return foundry.canvas.placeables.MeasuredTemplate.getCircleShape(distance);
			case "cone":
				return foundry.canvas.placeables.MeasuredTemplate.getConeShape(distance, direction, angle);
			case "rect":
				return foundry.canvas.placeables.MeasuredTemplate.getRectShape(distance, direction);
			case "ray":
				return foundry.canvas.placeables.MeasuredTemplate.getRayShape(distance, direction, width);
		}
	}

	token = {};

	prepareDerivedData() {
		super.prepareDerivedData();
		const gridUnits = this.distance / this.parent.grid.distance;
		this.radius = gridUnits * this.parent.grid.size;
		this.token = {};
		this.token.width = gridUnits * 2;
		this.token.height = gridUnits * 2;
		switch (this.t) {
			case 'rect':
				this.token.x = this.x;
				this.token.y = this.y;
				break;
			case 'circle':
			default:
				this.token.x = this.x - this.radius;
				this.token.y = this.y - this.radius;
		}
	}

	show() {
		this._destroyed = false;
		this.#layer = null;
		return this.object.show();
	}

}
