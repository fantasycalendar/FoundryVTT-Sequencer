import { Sequence } from './sequencer.js';

Hooks.once('init', async function() {

    window.Sequence = Sequence;

    game.settings.register("sequencer", "fileCache", {
        name: "fileCache",
        scope: "world",
        config: false,
        default: {},
        type: Object
    });

    game.settings.set('sequencer', 'fileCache', {});

    console.log("Sequencer | Ready to go!")

});