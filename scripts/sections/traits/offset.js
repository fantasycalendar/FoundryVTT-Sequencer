import * as lib from "../../lib/lib.js";

export default {

  _offset: null,
  _randomOffset: null,

  _validateOffset(functionName, inOffset, inOptions = {}) {
    inOffset = foundry.utils.mergeObject({
      x: 0,
      y: 0,
    }, inOffset);
    inOptions = foundry.utils.mergeObject({
      gridUnits: false,
      local: false
    }, inOptions)
    if (typeof inOptions.gridUnits !== "boolean") throw this.sequence._customError(this, functionName, "inOptions.gridUnits must be of type boolean");
    if (typeof inOptions.local !== "boolean") throw this.sequence._customError(this, functionName, "inOptions.local must be of type boolean");
    if (!lib.is_real_number(inOffset.x)) throw this.sequence._customError(this, functionName, `inOffset.x must be of type number!`);
    if (!lib.is_real_number(inOffset.y)) throw this.sequence._customError(this, functionName, `inOffset.y must be of type number!`);
    return {
      ...inOffset,
      ...inOptions
    };
  }

}
