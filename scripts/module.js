import registerSettings from "./settings.js";
import registerLayers from "./layers.js";
import registerLibwrappers from "./libwrapper.js";
import { registerSocket } from "./sockets.js";
import { registerEase } from "./module/canvas-effects/ease.js";
import { registerPermissions, patchPermissions } from "./permissions.js";

import Sequence from "./module/sequencer.js";
import SequencerPlayer from "./module/sequencer-effect-player.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/formapplications/sequencer-database-viewer-ui.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";
import SequencerSectionManager from "./module/sequencer-section-manager.js";
import Section from "./module/sections/section.js";
import SequencerUILayer from "./module/canvas-effects/ui-layer.js";
import * as warnings from "./warnings.js";

Hooks.once('init', async function () {

    window.Sequence = Sequence;
    window.Sequencer = {
        Player: SequencerPlayer,
        Database: SequencerDatabase,
        DatabaseViewer: SequencerDatabaseViewer,
        Preloader: SequencerPreloader,
        EffectManager: SequencerEffectManager,
        SectionManager: new SequencerSectionManager(),
        registerEase: registerEase,
        BaseSection: Section,
        UILayer: new SequencerUILayer()
    }

    window.SequencerDatabase = Sequencer.Database;

    registerLayers();
    registerSettings();
    registerSocket();
    registerLibwrappers();
    registerPermissions();

});

Hooks.on("canvasReady", () => {
    Sequencer.EffectManager._setUpPersists();
});

Hooks.once('ready', async function () {
    setTimeout(() => {
        runReadyMethods();
        console.log("Sequencer | Ready to go!")
        Hooks.call('sequencer.ready')
        Hooks.call('sequencerReady')
    }, 100);
});

function runReadyMethods(){
    patchPermissions();
    warnings.check();
}

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