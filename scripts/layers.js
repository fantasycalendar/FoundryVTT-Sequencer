import {
    BaseEffectsLayer,
    BelowTokensEffectsLayer,
    AboveLightingEffectsLayer
} from "./module/canvas-effects/effects-layer.js";

export default function registerLayers() {

    CONFIG.Canvas.layers = foundry.utils.mergeObject(Canvas.layers, {
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
            group: "primary"
        }
    });

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