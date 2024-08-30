import { is_real_number } from "../../lib/lib.js";
import { validateAnimation } from "../../lib/canvas-lib.js";
import * as canvaslib from "../../lib/canvas-lib.js";

export default {
  /**
   * Base properties
   */
  _animations: null,

  /**
   * Animates a property on the target of the animation.
   *
   * @param {string} inTarget
   * @param {string} inPropertyName
   * @param {object} inOptions
   *      @param {Number} inOptions.from       - a single number from which to animate
   *      @param {Number} inOptions.to         - a single number to which to animate
   *      @param {Number} inOptions.duration   - how long in ms the animation should take
   *      @param {Number} inOptions.delay      - inserts a delay in ms before the animation starts
   *      @param {String} inOptions.ease       - what type of easing the animation should use
   *      @param {Boolean} inOptions.gridUnits - if animating width or height, this will set it to work in the scene's grid units
   *      @param {Boolean} inOptions.fromEnd   - makes this animation play from the end, like fadeOut, scaleOut, etc
   *      @param {Boolean} inOptions.absolute  - makes this animation's values override the current value
   *
   * @returns this
   */
  animateProperty(inTarget, inPropertyName, inOptions = {}) {
    if (!this._animations) this._animations = [];

    const result = canvaslib.validateAnimation(
      inTarget,
      inPropertyName,
      inOptions
    );

    if (typeof result === "string") {
      throw this.sequence._customError(this, "animateProperty", result);
    }

    this._animations.push(result);

    return this;
  },

  /**
   * Loops a property between a set of values on the target
   *
   * @param {string} inTarget
   * @param {string} inPropertyName
   * @param {object} inOptions
   *      @param {Number} inOptions.from       - a single number from which to loop
   *      @param {Number} inOptions.to         - a single number to which to loop
   *      @param {Number} inOptions.values     - an array of values to loop between
   *      @param {Number} inOptions.duration   - how long in ms the loop should take
   *      @param {Number} inOptions.loops      - how many loops in total this animation should go through - if none are specified, the loop is indefinite
   *      @param {Number} inOptions.delay      - inserts a delay in ms before the animation starts
   *      @param {String} inOptions.ease       - what type of easing the animation should use
   *      @param {Boolean} inOptions.pingPong  - sets whether loop should interpolate to the first value after it reaches the first value, or simply set it to the first value
   *      @param {Boolean} inOptions.gridUnits - if animating width or height, this will set it to work in the scene's grid units
   *      @param {Boolean} inOptions.absolute  - makes this animation's values override the current value
   *
   * @returns this
   */
  loopProperty(inTarget, inPropertyName, inOptions = {}) {
    if (!this._animations) this._animations = [];

    const result = canvaslib.validateLoopingAnimation(
      inTarget,
      inPropertyName,
      inOptions
    );

    if (typeof result === "string") {
      throw this.sequence._customError(this, "loopProperty", result);
    }

    this._animations.push(result);

    return this;
  },
};
