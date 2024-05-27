import * as lib from "../../lib/lib.js";

export default {

  _name: null,
  _origin: null,

  /**
   * Causes the effect or sound to be named, which affects them differently. In the case of effects, names can be used
   * in the place of 
   *
   * @param {String} inName
   * @returns {EffectSection}
   */
  name(inName) {
    if (typeof inName !== "string")
      throw this.sequence._customError(
        this,
        "name",
        "inName must be of type string"
      );
    this._name = lib.safe_str(inName);
    return this;
  },

  /**
   *  This is for adding extra information to an sound, like the origin of the sound in the form of the item's uuid.
   *  The method accepts a string or a Document that has an UUID.
   *
   * @param {string|document} inOrigin
   * @returns {Section}
   */
  origin(inOrigin) {
    inOrigin = lib.validate_document(inOrigin);
    if (inOrigin instanceof foundry.abstract.Document) {
      inOrigin = inOrigin?.uuid;
      if (!inOrigin)
        throw this.sequence._customError(
          this,
          "origin",
          "could not find the UUID for the given Document"
        );
    }
    if (typeof inOrigin !== "string")
      throw this.sequence._customError(
        this,
        "origin",
        "inOrigin must be of type string"
      );
    this._origin = inOrigin;
    return this;
  }

}
