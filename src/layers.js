import {
  BaseEffectsLayer,
  SequencerInterfaceLayer,
  UIEffectsLayer,
} from "./canvas-effects/effects-layer.js";
import { debug } from "./lib/lib.js";

export default function registerLayers() {
  CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, {
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

  if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
    const layers = Canvas.layers;
    Object.defineProperty(Canvas, "layers", {
      get: function () {
        return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers);
      },
    });
  }

  debug("Registered Layers");
}
