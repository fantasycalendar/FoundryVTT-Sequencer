import registerSettings from "./settings.js";
import { registerSocket } from "./sockets.js";
import registerLayers from "./layers.js";
import Sequence from "./module/sequencer.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/sequencer-database-viewer.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";

Hooks.once('init', async function() {
    registerLayers();
    window.SequencerEffectManager = SequencerEffectManager;
});

Hooks.once("canvasPan", () => {
    SequencerEffectManager._setUpPersists();
});

Hooks.once("updateScene", () => {
    setTimeout(() => {
        SequencerEffectManager._setUpPersists();
    }, 100);
});

Hooks.once('ready', async function() {
	window.Sequence = Sequence;
	window.SequencerPreloader = SequencerPreloader;
	window.SequencerDatabase = SequencerDatabase;
	window.SequencerDatabaseViewer = SequencerDatabaseViewer;
    registerSettings();
    registerSocket();
    console.log("Sequencer | Ready to go!")
    setTimeout(() => {
        Hooks.call('sequencer.ready')
    }, 100);
});

Hooks.on("preDeleteToken", (obj) => {
    SequencerEffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteTile", (obj) => {
    SequencerEffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteMeasuredTemplate", (obj) => {
    SequencerEffectManager._tearDownPersists(obj.id);
});