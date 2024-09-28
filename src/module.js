import "./styles/module.scss";

import { registerSettings, migrateSettings } from "./settings.js";
import registerLayers from "./layers.js";
import registerBatchShader from "./batchShader.js";
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
import Crosshair from "./modules/sequencer-crosshair/sequencer-crosshair.js";

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
	CONSTANTS.IS_V12 = foundry.utils.isNewerVersion(game.version, "12");
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

const setupModule = foundry.utils.debounce(() => {
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
    SectionManager: SequencerSectionManager,
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
	  Crosshair: Crosshair
  };

  registerSettings();
  registerLayers();
  registerHotkeys();
  registerLibwrappers();
  registerBatchShader();

  SequencerEffectManager.setup();
  SequencerAboveUILayer.setup();
}

Hooks.once("ready", async () => {

	if(!game.user.isGM || game.settings.get(CONSTANTS.MODULE_NAME, "welcome-shown")) return;
	await game.settings.set(CONSTANTS.MODULE_NAME, "welcome-shown", true);

	const chatMessages = game.messages.filter(message => {
		return message.content.includes("sequencer-welcome")
	}).map(message => message.id);

	if(chatMessages.length){
		return ChatMessage.deleteDocuments(chatMessages.slice(0, -1))
	}

	await ChatMessage.create({
		content: `
<div class="sequencer-welcome">
<img src="modules/sequencer/images/sequencer.png"/>
<div class="sequencer-divider"></div>
<p>Sequencer remains open, free, and regularly updated with the support of the Foundry community.</p>
<p>Please consider supporting us if you enjoy Foundry & visual effects!</p>
<div class="sequencer-divider"></div>
<p><a target="_blank" href="https://fantasycomputer.works/">Website</a> | <a target="_blank" href="https://fantasycomputer.works/FoundryVTT-Sequencer/#/">Docs</a> | <a target="_blank" href="https://discord.gg/qFHQUwBZAz">Discord</a> | <a target="_blank" href="https://ko-fi.com/fantasycomputerworks">Donate</a></p>
</div>`,
	});

});

Hooks.once("monaco-editor.ready", registerTypes);
