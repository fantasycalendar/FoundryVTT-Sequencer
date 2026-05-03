import "./styles/module.scss";

import { registerSettings, migrateSettings } from "./settings.js";
import registerLayers from "./layers.js";
import registerBatchShader from "./batchShader.js";
import registerHotkeys from "./hotkeys.js";
import registerTypes from "../typings/typings.js";
import { registerSocket, sequencerSocket } from "./sockets.js";
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
import PluginsManager from "./utils/plugins-manager.js";
import SvelteDialog from "./formapplications/dialog/SvelteDialog.js"
import ChangelogDialog from "./formapplications/dialog/changelog-dialog.svelte";
import flagManager from "./utils/flag-manager.js";

const PATREON_URL = "https://patreon.com/cw/fantasycomputerworks";
const DISCORD_URL = "https://discord.gg/qFHQUwBZAz";

function showChangelog() {
	return SvelteDialog.show({
		component: ChangelogDialog,
		classes: ["sequencer-changelog-dialog"],
		window: { title: "Sequencer Changelog", icon: "fas fa-clipboard-list", resizable: true },
		position: { width: 720, height: 600 },
	});
}

let moduleValid = false;
let moduleReady = false;
let canvasReady = false;

Hooks.once("init", async function() {
  // CONFIG.debug.hooks = true;
  moduleValid = true;
	CONSTANTS.IS_V14 = foundry.utils.isNewerVersion(game.version, "14");
  initializeModule();
  registerSocket();
	flagManager.setup();
	// CONFIG.debug.hooks = true;
});

Hooks.once("ready", async function() {
  for (const [name, func] of Object.entries(easeFunctions)) {
    if (!foundry.canvas.animation.CanvasAnimation[name]) {
      foundry.canvas.animation.CanvasAnimation[name] = func;
    }
  }

  if (game.user.isGM) {
    await runMigrations();
    await migrateSettings();
    await PlayerSettings.migrateOldPresets();
	  await lib.createJournalDatabase();
  }

  SequencerFoundryReplicator.registerHooks();
  InteractionManager.initialize();
});

Hooks.on("canvasTearDown", () => {
  canvasReady = false;
  SequencerEffectManager.tearDownPersistentEffects();
	SequencerSoundManager.tearDownPersistentSounds();
});

const setupModule = foundry.utils.debounce(() => {
  if (!moduleValid) return;
  if (!moduleReady) {
    moduleReady = true;
    lib.debug("Ready to go!");
    Hooks.callAll("sequencer.ready");
    Hooks.callAll("sequencerReady");
  }
  if (!canvasReady && game.canvas?.ready) {
    canvasReady = true;
    SequencerEffectManager.initializePersistentEffects();
	  SequencerSoundManager.initializePersistentSounds();
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
	  Crosshair: Crosshair,
    showChangelog: showChangelog,
  };

  registerSettings();
  registerLayers();
  registerHotkeys();
  registerLibwrappers();
  registerBatchShader();

  SequencerEffectManager.setup();
  SequencerSoundManager.setup();
  SequencerAboveUILayer.setup();

	PluginsManager.initialize();

	Hooks.on("renderChatMessageHTML", (_message, html) => {
		const links = html.querySelectorAll('[data-action="sequencer-show-changelog"]');
		links.forEach((el) => {
			if (el.dataset.sequencerWired === "1") return;
			el.dataset.sequencerWired = "1";
			el.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				showChangelog();
			});
			el.addEventListener("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					event.stopPropagation();
					showChangelog();
				}
			});
		});
	});
}


Hooks.once("ready", async () => {
  displaySequencerUpdateNotice();
});

function getMajorMinor(version) {
	if (typeof version !== "string") return null;
	const match = version.match(/^(\d+)\.(\d+)/);
	if (!match) return null;
	return `${match[1]}.${match[2]}`;
}

async function displaySequencerUpdateNotice() {

  if (!game.user.isGM) return;

  const currentVersion = game.modules.get(CONSTANTS.MODULE_NAME)?.version;
  if (!currentVersion) return;

  const lastShown = game.settings.get(CONSTANTS.MODULE_NAME, "update-notice-shown-version") ?? "0.0.0";

  const currentMM = getMajorMinor(currentVersion);
  const lastMM = getMajorMinor(lastShown);

  if (!currentMM) return;
  if (lastMM && !foundry.utils.isNewerVersion(currentMM, lastMM)) {
    if (lastShown !== currentVersion) {
      await game.settings.set(CONSTANTS.MODULE_NAME, "update-notice-shown-version", currentVersion);
    }
    return;
  }

  await game.settings.set(CONSTANTS.MODULE_NAME, "update-notice-shown-version", currentVersion);

  // Clean up older Sequencer update cards (keep only this newest one)
  const oldMessageIds = game.messages.filter(message => {
    return message.content.includes("sequencer-welcome");
  }).map(message => message.id);

  if (oldMessageIds.length) {
    await ChatMessage.deleteDocuments(oldMessageIds);
  }

  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);

  await ChatMessage.create({
    whisper: gmIds,
    content: `
<div class="sequencer-welcome">
<img class="sequencer-welcome-image" src="modules/sequencer/images/sequencer.png"/>
<div class="sequencer-welcome-divider"></div>
<p class="sequencer-welcome-title">Sequencer updated to v${currentVersion}</p>
<div class="sequencer-welcome-divider"></div>
<div class="sequencer-welcome-links">
<span class="sequencer-welcome-link" role="button" tabindex="0" data-action="sequencer-show-changelog"><i class="fas fa-clipboard-list"></i> View changelog</span>
<a target="_blank" rel="noopener noreferrer" href="${DISCORD_URL}"><i class="fab fa-discord"></i> Discord</a>
<a target="_blank" rel="noopener noreferrer" href="${PATREON_URL}"><i class="fab fa-patreon"></i> Support on Patreon</a>
</div>
</div>`,
  });

}


Hooks.once("monaco-editor.ready", registerTypes);
