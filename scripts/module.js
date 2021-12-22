import registerSettings from "./settings.js";
import registerLayers from "./layers.js";
import registerLibwrappers from "./libwrapper.js";
import { registerSocket } from "./sockets.js";
import { registerEase } from "./module/canvas-effects/ease.js";

import Sequence from "./module/sequencer.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/formapplications/sequencer-database-viewer-ui.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";
import SequencerSectionManager from "./module/sequencer-section-manager.js";
import { EffectPlayer, InteractionManager } from "./module/sequencer-interaction-manager.js";
import Section from "./module/sections/section.js";
import SequencerUILayer from "./module/canvas-effects/ui-layer.js";
import * as warnings from "./warnings.js";
import * as lib from "./module/lib/lib.js";

Hooks.once('init', async function () {

    window.Sequence = Sequence;
    window.Sequencer = {
        Player: EffectPlayer,
        Database: SequencerDatabase,
        DatabaseViewer: SequencerDatabaseViewer,
        Preloader: SequencerPreloader,
        EffectManager: SequencerEffectManager,
        SectionManager: new SequencerSectionManager(),
        registerEase: registerEase,
        BaseSection: Section,
        UILayer: new SequencerUILayer(),
        Helpers: {
            wait: lib.wait,
            clamp: lib.clamp,
            interpolate: lib.interpolate,
            random_float_between: lib.random_float_between,
            random_int_between: lib.random_int_between,
            shuffle_array: lib.shuffle_array,
            random_array_element: lib.random_array_element,
            random_object_element: lib.random_object_element,
            make_array_unique: lib.make_array_unique
        }
    }

    window.SequencerDatabase = Sequencer.Database;

    registerLayers();
    registerSettings();
    registerLibwrappers();

});

Hooks.once("socketlib.ready", () => {
    registerSocket();
})

Hooks.once('ready', async function () {
    setTimeout(() => {
        console.log("Sequencer | Ready to go!")
        Hooks.call('sequencer.ready')
        Hooks.call('sequencerReady')
        runReadyMethods();
    }, 100);
});

function runReadyMethods(){
    warnings.check();

    SequencerEffectManager.setUpPersists();
    InteractionManager.initialize();

    Hooks.on("canvasReady", () => {
        SequencerEffectManager.setUpPersists();
    });
}

/**
 * Creation & delete hooks for persistent effects
 */
Hooks.on("createToken", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = SequencerEffectManager.patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createTile", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = SequencerEffectManager.patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createMeasuredTemplate", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = SequencerEffectManager.patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("preDeleteToken", (document) => {
    SequencerEffectManager.tearDownPersists(document.uuid);
});

Hooks.on("preDeleteTile", (document) => {
    SequencerEffectManager.tearDownPersists(document.uuid);
});

Hooks.on("preDeleteMeasuredTemplate", (document) => {
    SequencerEffectManager.tearDownPersists(document.uuid);
});