import setupSettings from "./settings.js";
import { registerSocket } from "./sockets.js";
import registerLayer from "./layers.js";
import registerHooks from "./hooks.js";
import Sequence from "./module/sequencer.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/sequencer-database-viewer.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";

Hooks.once('init', async function() {
    registerLayer();
});

Hooks.once('ready', async function() {
	window.Sequence = Sequence;
	window.SequencerPreloader = SequencerPreloader;
	window.SequencerDatabase = SequencerDatabase;
	window.SequencerDatabaseViewer = SequencerDatabaseViewer;
    window.SequencerEffectManager = SequencerEffectManager;
    setupSettings();
    SequencerEffectManager._setUpPersists();
    registerSocket();
    registerHooks();
    console.log("Sequencer | Ready to go!")
});