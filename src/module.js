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
import CONSTANTS from "./constants.js";
import { PlayerSettings } from "./formapplications/effects-ui/effect-player-store.js";
import runMigrations from "./migrations.js";
import SequencerFoundryReplicator from "./modules/sequencer-foundry-replicator.js";

import SequencerSoundManager from "./modules/sequencer-sound-manager.js";

let moduleValid = false;
let moduleReady = false;
let canvasReady = false;

Hooks.once("init", async function() {
  // CONFIG.debug.hooks = true;
  if (!game.modules.get("socketlib")?.active) return;
  moduleValid = true;
  CONSTANTS.INTEGRATIONS.ISOMETRIC.ACTIVE = !!game.modules.get(
    CONSTANTS.INTEGRATIONS.ISOMETRIC.MODULE_NAME,
  )?.active;
  initializeModule();
  registerSocket();
});

Hooks.once("socketlib.ready", registerSocket);

Hooks.once("ready", async function() {
  if (!game.modules.get("socketlib")?.active) {
    ui.notifications.error(
      "Sequencer requires the SocketLib module to be active and will not work without it!",
      { console: true },
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
  SequencerEffectManager.tearDownPersists();
});

const setupModule = debounce(() => {
  if (!moduleValid) return;
  if (!moduleReady) {
    moduleReady = true;
    lib.debug("Ready to go!");
    Hooks.callAll("sequencer.ready");
    Hooks.callAll("sequencerReady");
  }
  if (!canvasReady) {
    canvasReady = true;
    SequencerEffectManager.initializePersistentEffects();
    SequencerEffectManager.initializePersistentSounds();
  }
}, 25);

Hooks.on("canvasReady", () => {
  setTimeout(() => {
    setupModule();
  }, 450);
});

Hooks.on("refreshToken", setupModule);
Hooks.on("refreshDrawing", setupModule);
Hooks.on("refreshTile", setupModule);
Hooks.on("refreshMeasuredTemplate", setupModule);

/**
 * Creation & delete hooks for persistent effects
 */
function initializeModule() {
  window.Sequence = Sequence;
  window.Sequencer = {
    Player: EffectPlayer,
    Presets: SequencerPresets,
    Database: SequencerDatabase,
    DatabaseViewer: DatabaseViewerApp,
    Preloader: SequencerPreloader,
    EffectManager: SequencerEffectManager,
    SoundManager: SequencerSoundManager,
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
  SequencerEffectManager.setup();
}

Hooks.once("monaco-editor.ready", registerTypes);
