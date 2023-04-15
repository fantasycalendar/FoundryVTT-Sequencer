import * as lib from "../../lib/lib.js";
import { is_real_number } from "../../lib/lib.js";

export default {
  _tint: null,

  /**
   * Tints the target of this section by the color given to the
   *
   * @param {number|string} inColor
   * @returns this
   */
  tint(inColor) {
    if (!is_real_number(inColor) && typeof inColor !== "string")
      throw this.sequence._customError(
        this,
        "tint",
        `inColor must be of type string (hexadecimal) or number (decimal)!`
      );
    this._tint = lib.parseColor(inColor);
    return this;
  },
};
