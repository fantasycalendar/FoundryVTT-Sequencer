import { Sequence } from './sequencer.js';
import { EffectsLayer } from "./canvas-effects/effects-layer.js";
import Version from "./version.js";

function registerLayer() {

    let mergeFunc = new Version().onOrAfter("0.8.6") ? foundry.utils.mergeObject : mergeObject;

    const layers = mergeFunc(Canvas.layers, {
        sequencereffects: EffectsLayer
    });

    Object.defineProperty(Canvas, 'layers', {
        get: function () {
            return layers
        }
    });
}

Hooks.once('init', async function() {
    registerLayer();
});

Hooks.once('ready', async function() {

    window.Sequence = Sequence;

    game.settings.register("sequencer", "fileCache", {
        name: "fileCache",
        scope: "client",
        config: false,
        default: {},
        type: Object
    });

    game.settings.set('sequencer', 'fileCache', {});

    console.log("Sequencer | Ready to go!")

});