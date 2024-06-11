import * as lib from "../lib/lib.js";
import { is_real_number, parseColor } from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";
import flagManager from "../utils/flag-manager.js";
import SequencerFileCache from "../modules/sequencer-file-cache.js";
import CONSTANTS from "../constants.js";
import Crosshairs from "../modules/sequencer-crosshair/Crosshairs.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";

export default class CrosshairSection extends Section {
	constructor(inSequence, inName = "") {
		super(inSequence);
		this._name = inName;
		this._type = CONST.MEASURED_TEMPLATE_TYPES.CIRCLE;
		this._distance = 0.5;
		this._angle = 90;
		this._direction = 0;
		this._borderColor = null;
		this._fillColor = null;
		this._persist = false;
		this._config = Crosshairs.defaultConfig();
		this._waitUntilFinished = true;
	}

	snap(inSnap) {
		if (typeof inSnap !== "number")
			throw this.sequence._customError(
				this,
				"snap",
				"inSnap must be of type number, see CONST.GRID_SNAPPING_MODES",
			);
		this._config["snap"]["position"] = inSnap;
		return this;
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

	distance(inDistance, inOptions={}) {
		inOptions = foundry.utils.mergeObject(
			{ lock: false, min: null, max: null},
			inOptions,
		);
		if (typeof inDistance !== "number")
			throw this.sequence._customError(
				this,
				"distance",
				"inDistance must be of type number",
			);
		if (typeof inOptions.lock !== "boolean")
			throw this.sequence._customError(
				this,
				"distance",
				"inOptions.lock must be of type boolean",
			);
		if(!inOptions.lock) {
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

	directionSnap(inDirectionSnap) {
		if (typeof inDirectionSnap !== "number")
			throw this.sequence._customError(
				this,
				"directionSnap",
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

	lockLocation(inLocation, inOptions = {}) {
		inOptions = foundry.utils.mergeObject(
			{
				offsetDistance: 0,
				minDistance: null,
				maxDistance: null,
				edge: false
			},
			inOptions,
		);
		if (typeof inOptions.offsetDistance !== "number")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.offsetDistance must be of type number",
			);
		if (typeof inOptions.edge !== "boolean")
			throw this.sequence._customError(
				this,
				"lockLocation",
				"inOptions.edge must be of type boolean",
			);
		this._config["lockLocation"] = {
			lock: true,
			limit: false,
			obj: inLocation?.object ?? inLocation,
			offsetDistance: inOptions.offsetDistance,
			minDistance: inOptions.minDistance,
			maxDistance: inOptions.maxDistance,
			edge: inOptions.edge
		};
		return this;
	}

	limitLocation(inLocation, inOptions = {}) {
		inOptions = foundry.utils.mergeObject(
			{
				minDistance: null,
				maxDistance: null
			},
			inOptions,
		);
		if (typeof inOptions.minDistance !== "number")
			throw this.sequence._customError(
				this,
				"limitLocation",
				"inOptions.minDistance must be of type number",
			);
		if (typeof inOptions.maxDistance !== "number")
			throw this.sequence._customError(
				this,
				"limitLocation",
				"inOptions.maxDistance must be of type number",
			);
		this._config["location"] = {
			lock: false,
			limit: true,
			obj: inLocation?.object ?? inLocation,
			minDistance: inOptions.minDistance,
			maxDistance: inOptions.maxDistance
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

	async run() {

		const reticle = new Crosshairs({
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
					source: position,
					target: position?.end ?? null
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

}
