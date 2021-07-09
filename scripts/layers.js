import {
    BaseEffectsLayer,
    BelowTokensEffectsLayer
} from "./module/canvas-effects/effects-layer.js";
import * as lib from './module/lib.js';

export default function registerLayer() {

    let mergeFunc = new lib.Version().onOrAfter("0.8.6") ? foundry.utils.mergeObject : mergeObject;

    CONFIG.Canvas.layers = mergeFunc(Canvas.layers, {
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