import Section from "./section.js";
import traits from "./traits/_traits.js";
import * as lib from "../lib/lib.js";
import { is_real_number } from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import SequencerFoundryReplicator from "../modules/sequencer-foundry-replicator.js";
import CrosshairsPlaceable from "../modules/sequencer-crosshair/CrosshairsPlaceable.js";
import CrosshairsDocument from "../modules/sequencer-crosshair/CrosshairsDocument.js";

export default class CanvasPanSection extends Section {
  constructor(inSequence, target, duration, scale) {
    super(inSequence);
    this._deserializedData = null;
    this._source = null;
    this._duration = duration ?? 250;
    this._speed = null;
    this._scale = scale ?? 1.0;
    this._lockView = null;
    this._shake = null;
    this._seed = lib.get_hash(foundry.utils.randomID());
    if (target) {
      this.atLocation(target);
    }
  }

  static niceName = "Canvas Pan";

  /**
   * @private
   */
  _applyTraits() {
    Object.assign(this.constructor.prototype, traits.users);
    Object.assign(this.constructor.prototype, traits.location);
    Object.assign(this.constructor.prototype, traits.offset);
  }

  /**
   * Sets the speed (pixels per frame) of the canvas pan
   *
   * @param {number} inSpeed
   * @returns this
   */
  speed(inSpeed) {
    if (!is_real_number(inSpeed))
      throw this.sequence._customError(
        this,
        "speed",
        "inSpeed must be of type number"
      );
    if (inSpeed < 0) {
      throw this.sequence._customError(
        this,
        "speed",
        "inSpeed must be greater or equal to 0"
      );
    }
    this._speed = inSpeed;
    return this;
  }

  /**
   * Sets the zoom level of the canvas pan
   *
   * @param {number} inScale
   * @returns this
   */
  scale(inScale) {
    if (!is_real_number(inScale))
      throw this.sequence._customError(
        this,
        "scale",
        "inScale must be of type number"
      );
    if (inScale <= 0) {
      throw this.sequence._customError(
        this,
        "scale",
        "inScale must be greater than 0"
      );
    }
    this._scale = inScale;
    return this;
  }

  /**
   * Locks the canvas at the given location for the given duration
   *
   * @param {number} inDuration
   * @returns this
   */
  lockView(inDuration) {
    if (!is_real_number(inDuration))
      throw this.sequence._customError(
        this,
        "lockView",
        "inDuration must be of type number"
      );
    if (inDuration < 0) {
      throw this.sequence._customError(
        this,
        "lockView",
        "inDuration must be greater or equal to 0"
      );
    }
    this._lockView = inDuration;
    return this;
  }

  /**
   * Shakes the canvas
   *
   * @param {number} duration
   * @param {number} strength
   * @param {number} frequency
   * @param {number} fadeInDuration
   * @param {number} fadeOutDuration
   * @param {boolean} rotation
   * @returns this
   */
  shake({
    duration = 250,
    strength = 20,
    frequency = 10,
    fadeInDuration = 0,
    fadeOutDuration = 200,
    rotation = true,
  } = {}) {
    if (!is_real_number(duration)) {
      throw this.sequence._customError(
        this,
        "shake",
        "duration must be of type number"
      );
    }
    if (!is_real_number(strength)) {
      throw this.sequence._customError(
        this,
        "shake",
        "strength must be of type number"
      );
    }
    if (!is_real_number(strength)) {
      throw this.sequence._customError(
        this,
        "shake",
        "frequency must be of type number"
      );
    }
    if (!is_real_number(fadeInDuration)) {
      throw this.sequence._customError(
        this,
        "shake",
        "fadeInDuration must be of type number"
      );
    }
    if (!is_real_number(fadeOutDuration)) {
      throw this.sequence._customError(
        this,
        "shake",
        "fadeOutDuration must be of type number"
      );
    }
    if (typeof rotation !== "boolean") {
      throw this.sequence._customError(
        this,
        "shake",
        "rotation must be of type boolean"
      );
    }
    this._shake = {
      duration,
      strength,
      frequency,
      fadeInDuration,
      fadeOutDuration,
      rotation,
    };
    return this;
  }

	async preRun() {
		const oldSource = this._source;
		const crosshairSource = this.sequence?.crosshairs?.[this._source];
		if (typeof this._source === "string" && crosshairSource) {
			this._source = crosshairSource.uuid;
		}
		if (this._name && oldSource !== this._source) {
			this.sequence.nameOffsetMap[this._name].source = this._getSourceObject();
		}
	}

  async run() {
    const data = await this._sanitizeData();
    if (Hooks.call("preCanvasPan", data) === false) return;
    const push =
      !(data?.users?.length === 1 && data?.users?.includes(game.userId)) &&
      !this.sequence.localOnly;
    const duration = SequencerFoundryReplicator.panCanvas(data, push);
    await new Promise((resolve) =>
      setTimeout(resolve, this._currentWaitTime + duration)
    );
  }

  _getSourceObject() {
    if (!this._source || typeof this._source !== "object") return this._source;
	  if(this._source instanceof CrosshairsPlaceable || this._source instanceof CrosshairsDocument){
		  const doc = this._source?.document ?? this._source;
		  return doc.getOrientation().source;
	  }
    return (
      lib.get_object_identifier(this._source) ??
      canvaslib.get_object_canvas_data(this._source, { uuid: false })
    );
  }

  async _sanitizeData() {
    if (this._deserializedData) {
      return this._deserializedData;
    }

    return {
      sceneId: game.user.viewedScene,
      seed: this._seed,
      sequenceId: this.sequence.id,
      creatorUserId: game.userId,
      users: this._users ? Array.from(this._users) : false,
      moduleName: this.sequence.moduleName,
      source: this._getSourceObject(),
      offset: this._offset?.source ?? false,
      randomOffset: this._randomOffset?.source ?? false,
      duration: this._duration,
      speed: this._speed,
      scale: this._scale,
      lockView: this._lockView,
      shake: this._shake,
	    nameOffsetMap: this.sequence.nameOffsetMap,
    };
  }

  async _serialize() {
    const data = await super._serialize();
    const sectionData = await this._sanitizeData();
    return {
      ...data,
      type: "canvasPan",
      sectionData,
    };
  }

  async _deserialize(data) {
    this._deserializedData = data.sectionData;
    return super._deserialize(data);
  }
}
