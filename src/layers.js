import {
  BaseEffectsLayer,
  SequencerInterfaceLayer,
  UIEffectsLayer,
} from "./canvas-effects/effects-layer.js";
import { debug } from "./lib/lib.js";
import FoundryShim from "./utils/foundry-shim.js";

export default function registerLayers() {
  CONFIG.Canvas.layers = foundry.utils.mergeObject(FoundryShim.Canvas.layers, {
    sequencerEffects: {
      layerClass: BaseEffectsLayer,
      group: "primary",
    },
    sequencerInterfaceLayer: {
      layerClass: SequencerInterfaceLayer,
      group: "interface",
    },
    sequencerEffectsUILayer: {
      layerClass: UIEffectsLayer,
      group: "interface",
    },
  });

  if (!Object.is(FoundryShim.Canvas.layers, CONFIG.Canvas.layers)) {
    const layers = FoundryShim.Canvas.layers;
    Object.defineProperty(FoundryShim.Canvas, "layers", {
      get: function () {
        return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers);
      },
    });
  }

  debug("Registered Layers");
}
