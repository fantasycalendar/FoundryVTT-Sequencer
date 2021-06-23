import {
    BaseEffectsLayer,
    BelowTilesEffectsLayer,
    BelowTokensEffectsLayer
} from "./module/canvas-effects/effects-layer.js";
import Version from "./version.js";

export default function registerLayer() {

    let mergeFunc = new Version().onOrAfter("0.8.6") ? foundry.utils.mergeObject : mergeObject;

    CONFIG.Canvas.layers = mergeFunc(Canvas.layers, {
        sequencerEffectsBelowTiles: BelowTilesEffectsLayer,
        sequencerEffectsBelowTokens: BelowTokensEffectsLayer,
        sequencerEffectsAboveTokens: BaseEffectsLayer
    });

    if (!Object.is(Canvas.layers, CONFIG.Canvas.layers)) {
        const layers = Canvas.layers;
        Object.defineProperty(Canvas, 'layers', {
            get: function () {
                return mergeFunc(layers, CONFIG.Canvas.layers)
            }
        })
    }

    console.log("Sequencer | Registered Layers");

}