import CrosshairsPlaceable from "./CrosshairsPlaceable.js";

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
	}

	crosshair = {};
	#layer = null;
	endPosition = null;

	static get placeableClass() {
		return CrosshairsPlaceable;
	}

	static get defaultConfig() {
		return foundry.utils.deepClone({
			gridHighlight: true,
			icon: {
				display: false,
				texture: "",
				borderVisible: false
			},
			snap: {
				position: CONST.GRID_SNAPPING_MODES.CENTER,
				size: CONST.GRID_SNAPPING_MODES.CENTER,
				angle: 0
			},
			lockDrag: true,
			distanceMinMax: {
				locked: true,
				min: null,
				max: null
			},
			label: {
				display: false,
				text: "",
				dx: 0,
				dy: 0,
			},
			location: {
				obj: null,
				limit: false,
				minRange: null,
				maxRange: null,
				showRange: false,
				lock: false,
				edge: false,
				edgeOffsetDistance: 0,
				offset: { x: 0, y: 0 }
			},
			lockManualRotation: false,
			textureTile: 0,
		})
	};

	getOrientation() {
		return {
			x: this.x,
			y: this.y,
			width: this.token.width * this.parent.grid.size,
			height: this.token.height * this.parent.grid.size,
			elevation: 0, // TODO
			rotation: this.rotation,
			end: this.endPosition
		};
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
