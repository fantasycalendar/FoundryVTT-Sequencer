import { is_real_number } from "../../lib/lib.js";

export default {
  /**
   * Base properties
   */
  _volume: null,
  _channel: "interface",
  _fadeInAudio: null,
  _fadeOutAudio: null,

  /**
   * Sets the volume of the sound.
   *
   * @param {number} inVolume
   * @returns this
   */
  volume(inVolume) {
    if (!is_real_number(inVolume))
      throw this.sequence._customError(
        this,
        "volume",
        "inVolume must be of type number"
      );
    this._volume = Math.max(0, Math.min(1.0, inVolume));
    return this;
  },

  /**
   * Causes the animated section to fade in its audio (if any) when played
   *
   * @param {number} duration     How long the fade should be
   * @param {object} [options]    Additional options, such as easing and delay
   * @returns this
   */
  fadeInAudio(duration, options = {}) {
    if (typeof options !== "object")
      throw this.sequence._customError(
        this,
        "fadeInAudio",
        "options must be of type object"
      );
    options = foundry.utils.mergeObject(
      {
        ease: "linear",
        delay: 0,
      },
      options
    );
    if (!is_real_number(duration))
      throw this.sequence._customError(
        this,
        "fadeInAudio",
        "duration must be of type number"
      );
    if (typeof options.ease !== "string")
      throw this.sequence._customError(
        this,
        "fadeInAudio",
        "options.ease must be of type string"
      );
    if (!is_real_number(options.delay))
      throw this.sequence._customError(
        this,
        "fadeInAudio",
        "options.delay must be of type number"
      );
    this._fadeInAudio = {
      duration: duration,
      ease: options.ease,
      delay: options.delay,
    };
    return this;
  },

  /**
   * Causes the audio to fade out at the end of the animated section's duration
   *
   * @param {number} duration     How long the fade should be
   * @param {object} [options]    Additional options, such as easing and delay
   * @returns this
   */
  fadeOutAudio(duration, options = {}) {
    if (typeof options !== "object")
      throw this.sequence._customError(
        this,
        "fadeOutAudio",
        "options must be of type object"
      );
    options = foundry.utils.mergeObject(
      {
        ease: "linear",
        delay: 0,
      },
      options
    );
    if (!is_real_number(duration))
      throw this.sequence._customError(
        this,
        "fadeOutAudio",
        "duration must be of type number"
      );
    if (typeof options.ease !== "string")
      throw this.sequence._customError(
        this,
        "fadeOutAudio",
        "ease must be of type string"
      );
    if (!is_real_number(options.delay))
      throw this.sequence._customError(
        this,
        "fadeOutAudio",
        "delay must be of type number"
      );
    this._fadeOutAudio = {
      duration: duration,
      ease: options.ease,
      delay: options.delay,
    };
    return this;
  },
};
