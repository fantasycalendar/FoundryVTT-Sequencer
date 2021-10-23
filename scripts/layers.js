import {
    BaseEffectsLayer,
    BelowTokensEffectsLayer
} from "./module/canvas-effects/effects-layer.js";

export default function registerLayers() {

    const layers = isNewerVersion((game?.version ?? game.data.version), "9.00")
        ? {
            sequencerEffectsBelowTokens: {
                layerClass: BelowTokensEffectsLayer,
                group: "primary"
            },
            sequencerEffectsAboveTokens: {
                layerClass: BaseEffectsLayer,
                group: "primary"
            }
        }
        : {
            sequencerEffectsBelowTokens: BelowTokensEffectsLayer,
            sequencerEffectsAboveTokens: BaseEffectsLayer
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