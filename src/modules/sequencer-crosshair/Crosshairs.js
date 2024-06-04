import CrosshairsPlaceable from "./CrosshairsPlaceable.js";

/**
 *
 *
 * @class CrosshairsDocument
 * @mixes ClientDocumentMixin
 *
 */
export default class Crosshairs extends MeasuredTemplateDocument {

	constructor(config = {}, options = {}, crosshair = {}) {
		super(config, options);
		this.crosshair = foundry.utils.mergeObject(
			Crosshairs.defaultConfig(),
			crosshair
		);
	}

	crosshair = {};
	#layer = null;
	endPosition = null;

	static get placeableClass() {
		return CrosshairsPlaceable;
	}

	static defaultConfig() {
		return foundry.utils.deepClone({
			borderDisplay: false,
			icon: {
				display: false,
				texture: "",
			},
			snap: {
				position: CONST.GRID_SNAPPING_MODES.VERTEX,
				size: CONST.GRID_SNAPPING_MODES.VERTEX,
				angle: 0
			},
			distanceMinMax: {
				min: null,
				max: null
			},
			label: {
				display: false,
				text: "",
				dx: 0,
				dy: 0,
			},
			lockLocation: {
				location: null,
				offsetDistance: 0,
				edge: false
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
		return 'Crosshairs';
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
