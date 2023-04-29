import * as lib from "../lib/lib.js";
import Section from "./section.js";

export default class WaitSection extends Section {
  constructor(inSequence, msMin, msMax) {
    super(inSequence);
    this._waitUntilFinished = true;
    this._waitDuration = lib.random_int_between(msMin, Math.max(msMin, msMax));
  }

  static niceName = "Wait";

  /**
   * @returns {Promise<void>}
   */
  async run() {
    lib.debug("Running wait");
    await new Promise(async (resolve) => {
      setTimeout(resolve, this._waitDuration);
    });
  }

  /**
   * @returns {Promise}
   * @private
   */
  async _execute() {
    await this.run();
  }

  async _serialize() {
    const data = await super._serialize();
    return {
      ...data,
      type: "wait",
      sectionData: {
        waitDuration: this._waitDuration,
      },
    };
  }

  async _deserialize(data) {
    this._waitDuration = data.sectionData.waitDuration;
    return super._deserialize(data);
  }
}
