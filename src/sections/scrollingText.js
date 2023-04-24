import Section from "./section.js";
import traits from "./traits/_traits.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import SequencerFoundryReplicator from "../modules/sequencer-foundry-replicator.js";

export default class ScrollingTextSection extends Section {
  constructor(inSequence, target, text, textOptions) {
    super(inSequence);
    this._deserializedData = null;
    this._source = null;
    this._text = "";
    this._duration = 2000;
    this._distance = null;
    this._jitter = 0;
    this._anchor = null;
    this._direction = null;
    this._seed = lib.get_hash(randomID());
    if (target) {
      this.atLocation(target);
    }
    if (text) {
      this.text(text, textOptions);
    }
  }

  static niceName = "Scrolling Text";

  /**
   * @private
   */
  _applyTraits() {
    Object.assign(this.constructor.prototype, traits.users);
    Object.assign(this.constructor.prototype, traits.location);
    Object.assign(this.constructor.prototype, traits.offset);
    Object.assign(this.constructor.prototype, traits.text);
  }

  direction(inDirection) {
    if (!(typeof inDirection === "string" || lib.is_real_number(inDirection))) {
      throw this.sequence._customError(
        this,
        "direction",
        "inDirection must be of type string (CONST.TEXT_ANCHOR_POINTS) or number"
      );
    }
    if (
      typeof inDirection === "string" &&
      !CONST.TEXT_ANCHOR_POINTS[inDirection]
    ) {
      throw this.sequence._customError(
        this,
        "direction",
        `${inDirection} does not exist in CONST.TEXT_ANCHOR_POINTS!`
      );
    } else if (typeof inDirection === "string") {
      this._direction = CONST.TEXT_ANCHOR_POINTS[inDirection];
    } else {
      this._direction = inDirection;
    }
    return this;
  }

  anchor(inAnchor) {
    if (!(typeof inAnchor === "string" || lib.is_real_number(inAnchor))) {
      throw this.sequence._customError(
        this,
        "direction",
        "inAnchor must be of type string (CONST.TEXT_ANCHOR_POINTS) or number"
      );
    }
    if (
      (typeof inAnchor === "string" && !CONST.TEXT_ANCHOR_POINTS[inAnchor]) ||
      (lib.is_real_number(inAnchor) &&
        !Object.values(CONST.TEXT_ANCHOR_POINTS).includes(inAnchor))
    ) {
      throw this.sequence._customError(
        this,
        "direction",
        `${inAnchor} does not exist in CONST.TEXT_ANCHOR_POINTS!`
      );
    } else if (typeof inAnchor === "string") {
      this._anchor = CONST.TEXT_ANCHOR_POINTS[inAnchor];
    } else {
      this._anchor = inAnchor;
    }
    return this;
  }

  jitter(inJitter) {
    if (!(lib.is_real_number(inJitter) && inJitter >= 0 && inJitter <= 1.0)) {
      throw this.sequence._customError(
        this,
        "jitter",
        "inJitter must be of type number between 0 and 1"
      );
    }
    this._jitter = inJitter;
    return this;
  }

  async run() {
    const data = await this._sanitizeTextData();
    if (Hooks.call("preCreateScrollingText", data) === false) return;
    const push =
      !(data?.users?.length === 1 && data?.users?.includes(game.userId)) &&
      !this.sequence.localOnly;
    const duration = SequencerFoundryReplicator.playScrollingText(data, push);
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

  async _sanitizeTextData() {
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
      content: this._text?.text ?? "",
      options: {
        anchor: this._anchor,
        direction: this._direction,
        duration: this._duration,
        distance: this._distance,
        jitter: this._jitter,
        ...this._text,
      },
    };
  }

  async _serialize() {
    const data = await super._serialize();
    const sectionData = await this._sanitizeTextData();
    return {
      ...data,
      type: "scrollingText",
      sectionData,
    };
  }

  async _deserialize(data) {
    this._deserializedData = data.sectionData;
    return super._deserialize(data);
  }
}
