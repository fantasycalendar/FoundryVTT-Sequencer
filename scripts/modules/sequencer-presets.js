import { custom_error, is_function } from "../lib/lib.js";

const presetMap = new Map();

export default class SequencerPresets {

  static add(inName, inFunction, overwrite = false){

    if(typeof inName !== "string"){
      throw custom_error("Sequencer", `SequencerPresets | inName must be of type string`);
    }

    if(!is_function(inFunction)){
      throw custom_error("Sequencer", `SequencerPresets | inFunction must be of type function`);
    }

    if(presetMap.get(inName) && !overwrite){
      throw custom_error("Sequencer", `SequencerPresets | Preset "${inName}" already exists`);
    }

    presetMap.set(inName, inFunction);
    console.log(`Sequencer | Presets | Added "${inName}" preset`);
    return presetMap;

  }

  /**
   * @param {string} name
   * @returns {function}
   */
  static get(name){
    return presetMap.get(name);
  }

}
