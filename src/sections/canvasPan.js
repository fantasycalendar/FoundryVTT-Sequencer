import Section from "./section.js";
import traits from "./traits/_traits.js";
import * as lib from "../lib/lib.js";
import { is_real_number } from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import SequencerFoundryReplicator from "../modules/sequencer-foundry-replicator.js";

export default class CanvasPanSection extends Section {
  constructor(inSequence, target, duration, scale) {
    super(inSequence);
    this._deserializedData = null;
    this._source = null;
    this._duration = duration ?? 250;
    this._speed = null;
    this._scale = scale ?? 1.0;
    this._lockView = null;
    this._seed = lib.get_hash(randomID());
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
    return (
      lib.get_object_identifier(this._source) ??
      canvaslib.get_object_canvas_data(this._source)
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
