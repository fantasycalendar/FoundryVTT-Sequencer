export default class ColorMatrixFilter extends globalThis.PIXI.filters
  .ColorMatrixFilter {
  /**
   * Properties & default values:
   *     - hue [false]
   *     - brightness [1]
   *     - contrast [1]
   *     - saturate [1]
   */
  constructor(inData) {
    super();
    this.isValid = true;
    this.values = new Map();
    for (let [key, value] of Object.entries(inData)) {
      this.setValue(key, value);
      if (!this.isValid) break;
    }
  }

  setValue(key, value) {
    try {
      this.values[key] = value;
      super[key](value, true);
    } catch (err) {
      ui.notifications.warn(
        `Sequencer | ${this.constructor.name} | Could not set property ${key}`
      );
    }
  }

  get hue() {
    return this.values?.hue ?? 0
  }
  set hue(value) {
    this.values.hue = value
    super.hue(value)
    this.setOthers('hue')
  }


  get contrast() {
    return this.values?.contrast ?? 0
  }
  set contrast(value) {
    this.values.contrast = value
    super.contrast(value)
  }


  get brightness() {
    return this.values?.brightness ?? 0
  }
  set brightness(value) {
    this.values.brightness = value
    super.brightness(value)
  }

  get saturate() {
    return this.values?.saturate ?? 0
  }
  set saturate(value) {
    this.values.saturate = value
    super.saturate(value)
  }

  setOthers(ignoreKey) {
    for (let [key, value] of this.values.entries) {
      if (key === ignoreKey) continue
      this.setValue(key, value)
    }
  }
}
