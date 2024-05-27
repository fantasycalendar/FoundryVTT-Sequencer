import * as lib from "../../lib/lib.js";
import * as canvaslib from "../../lib/canvas-lib.js";

export default {
  /**
   * Base properties
   */
  _source: null,
	_offset: null,
	_randomOffset: null,

  /**
   *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
   *  or a string reference (see .name())
   *
   * @param {Object|String} inLocation
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  atLocation(inLocation, inOptions = {}) {
    if (!inLocation || !(typeof inLocation === "object" || typeof inLocation === "string")) {
      throw this.sequence._customError(
        this,
        "atLocation",
        `inLocation is invalid, and must be of type of object, string, placeable object, or document`
      );
    }
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "atLocation",
        `inOptions must be of type object`
      );
    inOptions = foundry.utils.mergeObject(
      {
        cacheLocation: false,
        offset: false,
        randomOffset: false,
        gridUnits: false,
        local: false,
      },
      inOptions
    );
    inLocation = this._validateLocation(inLocation);
    if (inLocation === undefined)
      throw this.sequence._customError(
        this,
        "atLocation",
        "could not find position of given object"
      );
    if (typeof inOptions.cacheLocation !== "boolean")
      throw this.sequence._customError(
        this,
        "atLocation",
        "inOptions.cacheLocation must be of type boolean"
      );
    if (
      !(
        typeof inOptions.randomOffset === "boolean" ||
        lib.is_real_number(inOptions.randomOffset)
      )
    )
      throw this.sequence._customError(
        this,
        "atLocation",
        "inOptions.randomOffset must be of type boolean or number"
      );

    if (inOptions.offset) {
      const offsetData = this._validateOffset(
        "atLocation",
        inOptions.offset,
        inOptions
      );
      this._offset = {
        source: offsetData,
        target: this._offset?.target ?? false,
      };
    }

    this._randomOffset = {
      source: inOptions.randomOffset,
      target: this._randomOffset?.target ?? false,
    };

    this._source =
      inOptions.cacheLocation && typeof inLocation !== "string"
        ? canvaslib.get_object_canvas_data(inLocation)
        : inLocation;
    return this;
  },
};
