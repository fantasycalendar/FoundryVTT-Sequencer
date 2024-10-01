import Section from "./section.js";
import traits from "./traits/_traits.js";
import SequencerFoundryReplicator from "../modules/sequencer-foundry-replicator.js";
import { is_real_number } from "../lib/lib.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";

export default class CreateSection extends Section {
	constructor(inSequence, type) {
		super(inSequence);
		this._type = type;
		this._count = 1;
		this._avoid = null;
		this._data = {};
	}

	static niceName = "Creation";

	/**
	 * @private
	 */
	_applyTraits() {
		Object.assign(this.constructor.prototype, traits.location);
		Object.assign(this.constructor.prototype, traits.name);
		Object.assign(this.constructor.prototype, traits.offset);
	}

	type(inType) {
		if (typeof inType !== "string"){
			throw this.sequence._customError(this, "type", "inType must be of type string");
		}
		this._type = inType;
		return this;
	}

	count(inCount) {
		if (!is_real_number(inCount) || inCount < 1){
			throw this.sequence._customError(this, "count", "inCount must be of type number greater than 0");
		}
		this._count = inCount;
		return this;
	}

	setAttribute(inPath, inValue) {
		if (typeof inPath !== "string"){
			throw this.sequence._customError(this, "setAttribute", "inPath must be of type string");
		}
		this._data["data." + inPath] = inValue;
		return this;
	}

	addEmbeddedDocument(inType, inData) {
		if (typeof inType !== "string"){
			throw this.sequence._customError(this, "addEmbeddedDocument", "inType must be of type string");
		}
		this._data["document." + inType] = inData;
		return this;
	}

	avoidCollisions(inOptions={}){
		if(typeof inOptions !== "object"){
			throw this.sequence._customError(this, "avoidCollisions", "inOptions must be of type object");
		}
		inOptions = foundry.utils.mergeObject({ walls: true, tokens: true }, inOptions)
		if (typeof inOptions.walls === "boolean"){
			throw this.sequence._customError(this, "avoidCollisions", "inOptions.walls must be of type boolean");
		}
		if (typeof inOptions.tokens === "boolean"){
			throw this.sequence._customError(this, "avoidCollisions", "inOptions.tokens must be of type boolean");
		}
		this._avoid = inOptions;
		return this;
	}

	_getSourceObject() {
		if (!this._source || typeof this._source !== "object"){
			const offsetMap = this.sequence.nameOffsetMap?.[this._source];
			return offsetMap?.target ?? offsetMap?.source ?? this._source;
		}
		return canvaslib.get_object_canvas_data(this._source);
	}

	async _sanitizeCreationData() {
		return {
			sceneId: game.user.viewedScene,
			sequenceId: this.sequence.id,
			creatorUserId: game.userId,
			moduleName: this.sequence.moduleName,
			source: this._getSourceObject(),
			offset: this._offset?.source ?? false,
			type: this._type,
			count: this._count,
			avoid: this._avoid,
			data: {
				...this._data,
			}
		};
	}


	async run() {
		const data = await this._sanitizeCreationData();
		if (Hooks.call("preCreateEmbeddedDocument", data) === false) return;
		return SequencerFoundryReplicator.createEmbeddedDocument(data);
	}
}
