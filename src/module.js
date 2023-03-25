import "./styles/module.scss";

import { registerSettings, migrateSettings } from "./settings.js";
import registerLayers from "./layers.js";
import registerHotkeys from "./hotkeys.js";
import registerTypes from "../typings/typings.js";
import { registerSocket } from "./sockets.js";
import { registerEase } from "./canvas-effects/ease.js";

import Sequence from "./modules/sequencer.js";
import SequencerDatabase from "./modules/sequencer-database.js";
import SequencerPreloader from "./modules/sequencer-preloader.js";
import SequencerEffectManager from "./modules/sequencer-effect-manager.js";
import SequencerSectionManager from "./modules/sequencer-section-manager.js";
import { EffectPlayer, InteractionManager } from "./modules/sequencer-interaction-manager.js";
import Section from "./sections/section.js";
import * as lib from "./lib/lib.js";
import { SequencerAboveUILayer } from "./canvas-effects/effects-layer.js";
import SequencerPresets from "./modules/sequencer-presets.js";
import registerLibwrappers from "./libwrapper.js";
import { DatabaseViewerApp } from "./formapplications/database/database-viewer-app.js";
import SequencerEffectsUI from "./formapplications/sequencer-effects-ui.js";
import { EffectsUIApp } from "./formapplications/effects-ui/effects-ui-app.js";

Hooks.once('init', async function () {
  if (!game.modules.get("socketlib")?.active) return;
  initialize_module();
});

Hooks.once("socketlib.ready", () => {
  registerSocket();
})

Hooks.once('ready', async function () {

  if (!game.modules.get("socketlib")?.active) {
    ui.notifications.error("Sequencer requires the SocketLib module to be active and will not work without it!", { console: false });
    throw new Error("Sequencer requires the SocketLib module to be active and will not work without it!");
  }

  setTimeout(() => {
    console.log("Sequencer | Ready to go!")
    Hooks.callAll('sequencer.ready')
    Hooks.callAll('sequencerReady')

    SequencerEffectManager.setUpPersists();
    InteractionManager.initialize();

    Hooks.on("canvasReady", () => {
      SequencerEffectManager.setUpPersists();
    });

    setTimeout(() => {
      //EffectsUIApp.show({ tab: "player" });
    }, 200)

    migrateSettings();

  }, 100);
});

/**
 * Creation & delete hooks for persistent effects
 */
function initialize_module() {

  window.Sequence = Sequence;
  window.Sequencer = {
    Player: EffectPlayer,
    Presets: SequencerPresets,
    Database: SequencerDatabase,
    DatabaseViewer: DatabaseViewerApp,
    Preloader: SequencerPreloader,
    EffectManager: SequencerEffectManager,
    SectionManager: new SequencerSectionManager(),
    registerEase: registerEase,
    BaseSection: Section,
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

  registerSettings();
  registerLayers();
  registerHotkeys();
  registerLibwrappers();

  SequencerAboveUILayer.setup();

  Hooks.on("preCreateToken", (...args) => Sequencer.EffectManager.patchCreationData(...args));
  Hooks.on("preCreateDrawing", (...args) => Sequencer.EffectManager.patchCreationData(...args));
  Hooks.on("preCreateTile", (...args) => Sequencer.EffectManager.patchCreationData(...args));
  Hooks.on("preCreateMeasuredTemplate", (...args) => Sequencer.EffectManager.patchCreationData(...args));

  Hooks.on("createToken", (...args) => Sequencer.EffectManager.documentCreated(...args));
  Hooks.on("createDrawing", (...args) => Sequencer.EffectManager.documentCreated(...args));
  Hooks.on("createTile", (...args) => Sequencer.EffectManager.documentCreated(...args));
  Hooks.on("createMeasuredTemplate", (...args) => Sequencer.EffectManager.documentCreated(...args));

}

Hooks.once('monaco-editor.ready', registerTypes)
