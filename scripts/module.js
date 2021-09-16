import registerSettings from "./settings.js";
import { registerSocket } from "./sockets.js";
import registerLayers from "./layers.js";
import Sequence from "./module/sequencer.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/sequencer-database-viewer.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";
import { registerEase } from "./module/canvas-effects/ease.js";
import Section from "./module/sections/section.js";
import SequencerSectionManager from "./module/sequencer-section-manager.js";

Hooks.once('init', async function () {
    registerLayers();

    window.Sequence = Sequence;
    window.Sequencer = {
        Database: SequencerDatabase,
        DatabaseViewer: SequencerDatabaseViewer,
        Preloader: SequencerPreloader,
        EffectManager: SequencerEffectManager,
        SectionManager: new SequencerSectionManager(),
        registerEase: registerEase,
        BaseSection: Section
    }

    window.SequencerPreloader = Sequencer.Preloader;
    window.SequencerDatabase = Sequencer.Database;
    window.SequencerDatabaseViewer = Sequencer.DatabaseViewer;
    window.SequencerEffectManager = Sequencer.EffectManager;
});

Hooks.on("canvasReady", () => {
    Sequencer.EffectManager._setUpPersists();
});

Hooks.on("updateScene", () => {
    setTimeout(() => {
        Sequencer.EffectManager._setUpPersists();
    }, 100);
});

Hooks.once('ready', async function () {
    registerSettings();
    registerSocket();
    setTimeout(() => {
        console.log("Sequencer | Ready to go!")
        Hooks.call('sequencer.ready')
    }, 100);
});


/**
 * Creation & delete hooks for persistent effects
 */

Hooks.on("createToken", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createTile", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createMeasuredTemplate", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("preDeleteToken", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteTile", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteMeasuredTemplate", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});