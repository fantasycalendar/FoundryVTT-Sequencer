import {
    BaseEffectsLayer,
    BelowTokensEffectsLayer,
    AboveLightingEffectsLayer,
    UIEffectsLayer
} from "./module/canvas-effects/effects-layer.js";
import { isVersion9 } from "./module/lib/lib.js";

export default function registerLayers() {

    const layers = isVersion9()
        ? {
            sequencerEffectsBelowTokens: {
                layerClass: BelowTokensEffectsLayer,
                group: "primary"
            },
            sequencerEffectsAboveTokens: {
                layerClass: BaseEffectsLayer,
                group: "primary"
            },
            sequencerEffectsAboveLighting: {
                layerClass: AboveLightingEffectsLayer,
                group: "effects"
            },
            // dev7355608: 2. This is where the layer is instantiated onto the canvas, through the interface group
            uiEffectsLayer: {
                layerClass: UIEffectsLayer,
                group: "interface"
            }
        }
        : {
            sequencerEffectsBelowTokens: BelowTokensEffectsLayer,
            sequencerEffectsAboveTokens: BaseEffectsLayer,
            sequencerEffectsAboveLighting: AboveLightingEffectsLayer,
            uiEffectsLayer: UIEffectsLayer
        }

    CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, layers);

    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        const layers = Canvas.layers;
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return foundry.utils.mergeObject(layers, CONFIG.Canvas.layers)
            }
        })
    }

    console.log("Sequencer | Registered Layers");

}