import * as lib from "../lib/lib.js";
import Section from "./section.js";
import CrosshairsDocument from "../modules/sequencer-crosshair/CrosshairsDocument.js";
import traits from "./traits/_traits.js";

export default class CrosshairSection extends Section {
	constructor(inSequence, inName = "") {
		super(inSequence);
		this._name = inName;
		this._type = CONST.MEASURED_TEMPLATE_TYPES.CIRCLE;
		this._distance = 0.5;
		this._angle = 90;
		this._direction = 0;
		this._borderColor = null;
		this._gridHighlight = null;
		this._fillColor = null;
		this._persist = false;
		this._config = CrosshairsDocument.defaultConfig;
		this._waitUntilFinished = true;
	}

	type(inType = "") {
		if (typeof inType !== "string")
			throw this.sequence._customError(
				this,
				"type",
				"inType must be of type string",
			);
		if (!Object.values(CONST.MEASURED_TEMPLATE_TYPES).includes(inType))
			throw this.sequence._customError(
				this,
				"type",
				`inType must be one of valid types: ${Object.values(CONST.MEASURED_TEMPLATE_TYPES).join(" ")} (see CONST.MEASURED_TEMPLATE_TYPES)`,
			);
		this._type = inType;
		return this;
	}

	snapPosition(inSnap) {
		if (typeof inSnap !== "number")
			throw this.sequence._customError(
				this,
				"snapPosition",
				"inSnap must be of type number, see CONST.GRID_SNAPPING_MODES",
			);
		this._config["snap"]["position"] = inSnap;
		return this;
	}

	distance(inDistance, inOptions={}) {
		inOptions = foundry.utils.mergeObject(
			{ locked: true, min: null, max: null},
			inOptions,
		);
		if (typeof inDistance !== "number")
			throw this.sequence._customError(
				this,
				"distance",
				"inDistance must be of type number",
			);
		if (typeof inOptions.locked !== "boolean")
			throw this.sequence._customError(
				this,
				"distance",
				"inOptions.locked must be of type boolean",
			);
		if(!inOptions.locked) {
			if (inOptions.min !== null && typeof inOptions.min !== "number")
				throw this.sequence._customError(
					this,
					"distance",
					"inOptions.min must be of type number",
				);
			if (inOptions.max !== null && typeof inOptions.max !== "number")
				throw this.sequence._customError(
					this,
					"distance",
					"inOptions.max must be of type number",
				);
			if(inOptions.min <= 0)
				throw this.sequence._customError(
					this,
					"distance",
					"inOptions.min must be a non-zero number",
				);
			if(inOptions.max <= 0)
				throw this.sequence._customError(
					this,
					"distance",
					"inOptions.max must be a non-zero number",
				);
			if(inOptions.min > inOptions.max)
				throw this.sequence._customError(
					this,
					"distance",
					"inOptions.min cannot be larger than inOptions.max",
				);
		}else{
			inOptions.min = inDistance;
			inOptions.max = inDistance;
		}
		this._distance = inDistance;
		this._config["distanceMinMax"] = inOptions;
		return this;
	}

	angle(inAngle) {
		if (typeof inAngle !== "number")
			throw this.sequence._customError(
				this,
				"angle",
				"inAngle must be of type number",
			);
		this._angle = inAngle;
		return this;
	}

	direction(inDirection) {
		if (typeof inDirection !== "number")
			throw this.sequence._customError(
				this,
				"direction",
				"inDirectionSnap must be of type number",
			);
		this._direction = inDirection;
		return this;
	}

	snapDirection(inDirectionSnap) {
		if (typeof inDirectionSnap !== "number")
			throw this.sequence._customError(
				this,
				"snapDirection",
				"inDirectionSnap must be of type number",
			);
		this._config["snap"]["direction"] = inDirectionSnap;
		return this;
	}

	lockManualRotation(inBool = true){
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"preventUserRotation",
				"inBool must be of type number",
			);
		this._config["lockManualRotation"] = inBool;
		return this;
	}

	borderColor(inColor) {
		this._borderColor = lib.parseColor(inColor);
		return this;
	}

	fillColor(inColor) {
		this._fillColor = lib.parseColor(inColor);
		return this;
	}

	location(inLocation, inOptions = {}) {
		if (!inLocation || typeof inLocation !== "object") {
			throw this.sequence._customError(
				this,
				"location",
				"inLocation is invalid, and must be of type of placeable object, or document"
			);
		}
		if (typeof inOptions !== "object")
			throw this.sequence._customError(
				this,
				"location",
				"inOptions must be of type object"
			);
		inOptions = foundry.utils.mergeObject(
			{
				limit: false,
				limitMinRange: null,
				limitMaxRange: null,
				showRange: false,
				lock: false,
				lockToEdge: false,
				lockToEdgeDirection: false,
				lockOffsetDistance: 0,
				offset: { x: 0, y: 0 }
			},
			inOptions,
		);
		inLocation = this._validateLocation(inLocation);
		if (inLocation === undefined)
			throw this.sequence._customError(
				this,
				"location",
				"could not find position of given object"
			);
		if (inOptions.limitMinRange && !lib.is_real_number(inOptions.limitMinRange))
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.limitMinRange must be of type number",
			);
		if (inOptions.limitMaxRange && !lib.is_real_number(inOptions.limitMaxRange))
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.limitMaxRange must be of type number",
			);
		if (!lib.is_real_number(inOptions.lockOffsetDistance))
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.lockOffsetDistance must be of type number",
			);
		if (typeof inOptions.lock !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.lock must be of type boolean",
			);
		if (typeof inOptions.lockToEdge !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.lockToEdge must be of type boolean",
			);
		if (typeof inOptions.limit !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.limit must be of type boolean",
			);
		if (typeof inOptions.showRange !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.showRange must be of type boolean",
			);
		if (typeof inOptions.lockToEdgeDirection !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.lockToEdgeDirection must be of type boolean",
			);
		if (typeof inOptions.offset !== "object") {
			throw this.sequence._customError(
				this,
				"location",
				"inOptions.offset must be of type of object"
			);
		}
		if (!lib.is_real_number(inOptions.offset.x)) {
			throw this.sequence._customError(
				this,
				"location",
				"inOptions.offset.x must be of type of number"
			);
		}
		if (!lib.is_real_number(inOptions.offset.y)) {
			throw this.sequence._customError(
				this,
				"location",
				"inOptions.offset.y must be of type of number"
			);
		}
		this._config["location"] = {
			obj: inLocation?.object ?? inLocation,
			limitMinRange: inOptions.limitMinRange,
			limitMaxRange: inOptions.limitMaxRange,
			lock: inOptions.lock,
			lockToEdge: inOptions.lockToEdge,
			lockOffsetDistance: inOptions.lockOffsetDistance,
			lockToEdgeDirection: inOptions.lockToEdgeDirection,
			limit: inOptions.limit,
			showRange: inOptions.showRange,
			offset: inOptions.offset
		};
		return this;
	}

	persist(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"persist",
				"inBool must be of type number",
			);
		this._persist = inBool;
		return this;
	}

	gridHighlight(inBool = true) {
		if (typeof inBool !== "boolean")
			throw this.sequence._customError(
				this,
				"gridHighlight",
				"inBool must be of type number",
			);
		this.config['gridHighlight'] = inBool;
		return this;
	}

	async run() {

		const reticle = new CrosshairsDocument({
			t: this._type,
			distance: this._distance,
			direction: this._direction,
			angle: this._angle,
			borderColor: this._borderColor,
			fillColor: this._fillColor,
		}, {
			parent: canvas.scene
		}, this._config);

		return reticle.show().then(async () => {

			const position = reticle.getOrientation();

			if(this._name){
				if (!this.sequence.nameOffsetMap) {
					this.sequence.nameOffsetMap = {};
				}
				this.sequence.nameOffsetMap[this._name] = {
					seed: `${this._name}-${foundry.utils.randomID()}`,
					source: position.source,
					target: position.target
				}
			}

			if(this._persist) {
				await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [reticle.toObject()]);
			}

		}).catch(() => {
			this.sequence._abort();
		});
	}

	async _execute(){
		await this.run();
	}

	/**
	 * @private
	 */
	_applyTraits() {
		Object.assign(this.constructor.prototype, traits.name);
	}

}
