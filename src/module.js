import "./styles/module.scss";

import { registerSettings, migrateSettings } from "./settings.js";
import registerLayers from "./layers.js";
import registerHotkeys from "./hotkeys.js";
import registerTypes from "../typings/typings.js";
import { registerSocket } from "./sockets.js";
import { EASE, easeFunctions, registerEase } from "./canvas-effects/ease.js";

import Sequence from "./modules/sequencer.js";
import SequencerDatabase from "./modules/sequencer-database.js";
import SequencerPreloader from "./modules/sequencer-preloader.js";
import SequencerEffectManager from "./modules/sequencer-effect-manager.js";
import SequencerSectionManager from "./modules/sequencer-section-manager.js";
import {
  EffectPlayer,
  InteractionManager,
} from "./modules/sequencer-interaction-manager.js";
import Section from "./sections/section.js";
import * as lib from "./lib/lib.js";
import { SequencerAboveUILayer } from "./canvas-effects/effects-layer.js";
import SequencerPresets from "./modules/sequencer-presets.js";
import registerLibwrappers from "./libwrapper.js";
import { DatabaseViewerApp } from "./formapplications/database/database-viewer-app.js";
import { EffectsUIApp } from "./formapplications/effects-ui/effects-ui-app.js";
import CONSTANTS from "./constants.js";
import { PlayerSettings } from "./formapplications/effects-ui/effect-player-store.js";
import runMigrations from "./migrations.js";
import SequencerFoundryReplicator from "./modules/sequencer-foundry-replicator.js";

let moduleValid = false;
let moduleReady = false;
let canvasReady = false;

Hooks.once("init", async function () {
  // CONFIG.debug.hooks = true;
  if (!game.modules.get("socketlib")?.active) return;
  moduleValid = true;
  CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE = false;
  //   !!game.modules.get(
  //   CONSTANTS.INTEGRATIONS.ISOMETRIC.MODULE_NAME
  // )?.active;
  initialize_module();
});

Hooks.once("socketlib.ready", () => {
  registerSocket();
});

Hooks.once("ready", async function () {
  if (!game.modules.get("socketlib")?.active) {
    ui.notifications.error(
      "Sequencer requires the SocketLib module to be active and will not work without it!",
      { console: true }
    );
    return;
  }

  for (const [name, func] of Object.entries(easeFunctions)) {
    if (!CanvasAnimation[name]) {
      CanvasAnimation[name] = func;
    }
  }

  if (game.user.isGM) {
    await runMigrations();
    await migrateSettings();
    await PlayerSettings.migrateOldPresets();
  }

  SequencerFoundryReplicator.registerHooks();
  InteractionManager.initialize();
});

Hooks.on("canvasTearDown", () => {
  canvasReady = false;
});

Hooks.on("refreshToken", async () => {
  if (!moduleValid) return;
  if (!moduleReady) {
    moduleReady = true;
    console.log("Sequencer | Ready to go!");
    Hooks.callAll("sequencer.ready");
    Hooks.callAll("sequencerReady");
  }
  if (!canvasReady) {
    canvasReady = true;
    setTimeout(() => {
      SequencerEffectManager.setUpPersists();
    }, 25);
  }
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
    CONSTANTS: {
      EASE,
    },
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
    },
  };

  registerSettings();
  registerLayers();
  registerHotkeys();
  registerLibwrappers();

  SequencerAboveUILayer.setup();

  Hooks.on("preCreateToken", (...args) =>
    Sequencer.EffectManager.patchCreationData(...args)
  );
  Hooks.on("preCreateDrawing", (...args) =>
    Sequencer.EffectManager.patchCreationData(...args)
  );
  Hooks.on("preCreateTile", (...args) =>
    Sequencer.EffectManager.patchCreationData(...args)
  );
  Hooks.on("preCreateMeasuredTemplate", (...args) =>
    Sequencer.EffectManager.patchCreationData(...args)
  );

  Hooks.on("createToken", (...args) =>
    Sequencer.EffectManager.documentCreated(...args)
  );
  Hooks.on("createDrawing", (...args) =>
    Sequencer.EffectManager.documentCreated(...args)
  );
  Hooks.on("createTile", (...args) =>
    Sequencer.EffectManager.documentCreated(...args)
  );
  Hooks.on("createMeasuredTemplate", (...args) =>
    Sequencer.EffectManager.documentCreated(...args)
  );
}

Hooks.once("monaco-editor.ready", registerTypes);
