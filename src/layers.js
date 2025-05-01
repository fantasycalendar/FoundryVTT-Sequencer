import {
  BaseEffectsLayer,
  SequencerInterfaceLayer,
  UIEffectsLayer,
} from "./canvas-effects/effects-layer.js";
import { debug } from "./lib/lib.js";

export default function registerLayers() {
  CONFIG.Canvas.layers = foundry.utils.mergeObject(foundry.canvas.Canvas.layers, {
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

  if (!Object.is(foundry.canvas.Canvas.layers, CONFIG.Canvas.layers)) {
    const layers = foundry.canvas.Canvas.layers;
    Object.defineProperty(foundry.canvas.Canvas, "layers", {
      get: function () {
        return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers);
      },
    });
  }

  debug("Registered Layers");
}
