export default {
  _text: null,

  /**
   *  Creates a text element, attached to the sprite. The options for the text are available here:
   *  https://pixijs.io/pixi-text-style/
   *
   * @param {String} inText
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  text(inText, inOptions = {}) {
    if (typeof inText !== "string")
      throw this.sequence._customError(
        this,
        "text",
        "inText must be of type string"
      );
    this._text = foundry.utils.mergeObject(
      {
        text: inText,
      },
      inOptions
    );
    return this;
  },
};
