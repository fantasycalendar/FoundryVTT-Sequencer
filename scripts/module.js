import registerSettings from "./settings.js";
import registerLayers from "./layers.js";
import registerLibwrappers from "./libwrapper.js";
import registerHotkeys from "./hotkeys.js";
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
    if(!game.modules.get("socketlib")?.active) return;
    initialize_module();
});

Hooks.once('ready', async function () {

    if(!game.modules.get("socketlib")?.active){
        ui.notifications.error("Sequencer requires the SocketLib module to be active and will not work without it!");
        throw new Error("Sequencer requires the SocketLib module to be active and will not work without it!");
    }

    setTimeout(() => {
        console.log("Sequencer | Ready to go!")
        Hooks.call('sequencer.ready')
        Hooks.call('sequencerReady')

        warnings.check();

        SequencerEffectManager.setUpPersists();
        InteractionManager.initialize();

        Hooks.on("canvasReady", () => {
            SequencerEffectManager.setUpPersists();
        });

    }, 100);
});

/**
 * Creation & delete hooks for persistent effects
 */
function initialize_module(){

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
            make_array_unique: lib.make_array_unique,
            from_uuid: lib.from_uuid_fast
        }
    }

    const warningDebounce = debounce(() => {
        lib.custom_warning("Sequencer", `Accessing the Sequencer Database through "SequencerDatabase" has been deprecated - please use "Sequencer.Database"`, true);
    }, 50);

    window.SequencerDatabase = new Proxy(window.Sequencer.Database, {
        get: function (target, prop) {
            warningDebounce();
            return window.Sequencer.Database[prop];
        }
    });

    registerLayers();
    registerSettings();
    registerHotkeys();
    registerLibwrappers();

    Hooks.once("socketlib.ready", () => {
        registerSocket();
    })

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
        SequencerEffectManager.objectDeleted(document.uuid);
    });

    Hooks.on("preDeleteTile", (document) => {
        SequencerEffectManager.objectDeleted(document.uuid);
    });

    Hooks.on("preDeleteMeasuredTemplate", (document) => {
        SequencerEffectManager.objectDeleted(document.uuid);
    });

}