import CONSTANTS from "./constants.js";
import { debug, user_can_do } from "./lib/lib.js";
import { DatabaseViewerApp } from "./formapplications/database/database-viewer-app.js";
import { EffectsUIApp } from "./formapplications/effects-ui/effects-ui-app.js";

export function registerSettings() {
  game.settings.register(CONSTANTS.MODULE_NAME, "enable-fix-pixi", {
    name: "SEQUENCER.Setting.EnablePixiFix.Title",
    hint: "SEQUENCER.Setting.EnablePixiFix.Label",
    scope: "client",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "enable-global-fix-pixi", {
    name: "SEQUENCER.Setting.EnableGlobalPixiFix.Title",
    hint: "SEQUENCER.Setting.EnableGlobalPixiFix.Label",
    scope: "client",
    config: true,
    default: false,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "enable-above-ui-screenspace", {
    name: "SEQUENCER.Setting.EnableAboveUIScreenspace.Title",
    hint: "SEQUENCER.Setting.EnableAboveUIScreenspace.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "debug", {
    name: "SEQUENCER.Setting.Debug.Title",
    hint: "SEQUENCER.Setting.Debug.Label",
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "showSidebarTools", {
    name: "SEQUENCER.Setting.ShowTools.Title",
    hint: "SEQUENCER.Setting.ShowTools.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "showTokenSidebarTools", {
    name: "SEQUENCER.Setting.ShowTokenTools.Title",
    hint: "SEQUENCER.Setting.ShowTokenTools.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "effectsEnabled", {
    name: "SEQUENCER.Setting.EnableEffects.Title",
    hint: "SEQUENCER.Setting.EnableEffects.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "soundsEnabled", {
    name: "SEQUENCER.Setting.EnableSounds.Title",
    hint: "SEQUENCER.Setting.EnableSounds.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "user-effect-opacity", {
    name: "SEQUENCER.Setting.ExternalEffectOpacity.Title",
    hint: "SEQUENCER.Setting.ExternalEffectOpacity.Label",
    scope: "client",
    config: true,
    default: 50,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 1,
    },
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "db-list-view", {
    scope: "client",
    config: false,
    default: false,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "welcome-shown-version", {
    scope: "world",
    config: false,
    default: "0.0.0",
    type: String,
  });

  const permissionLevels = [
    game.i18n.localize("SEQUENCER.Permission.Player"),
    game.i18n.localize("SEQUENCER.Permission.Trusted"),
    game.i18n.localize("SEQUENCER.Permission.Assistant"),
    game.i18n.localize("SEQUENCER.Permission.GM"),
  ];

  game.settings.register(CONSTANTS.MODULE_NAME, "permissions-effect-create", {
    name: "SEQUENCER.Setting.Permission.EffectCreate.Title",
    hint: "SEQUENCER.Setting.Permission.EffectCreate.Label",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
    choices: permissionLevels,
    requiresReload: true,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "permissions-effect-delete", {
    name: "SEQUENCER.Setting.Permission.EffectDelete.Title",
    hint: "SEQUENCER.Setting.Permission.EffectDelete.Label",
    scope: "world",
    config: true,
    default: 2,
    type: Number,
    choices: permissionLevels,
    requiresReload: true,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "permissions-sound-create", {
    name: "SEQUENCER.Setting.Permission.SoundCreate.Title",
    hint: "SEQUENCER.Setting.Permission.SoundCreate.Label",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
    choices: permissionLevels,
    requiresReload: true,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "permissions-preload", {
    name: "SEQUENCER.Setting.Permission.PreloadClients.Title",
    hint: "SEQUENCER.Setting.Permission.PreloadClients.Label",
    scope: "world",
    config: true,
    default: 1,
    type: Number,
    choices: permissionLevels,
    requiresReload: true,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "permissions-sidebar-tools", {
    name: "SEQUENCER.Setting.Permission.UseSidebarTools.Title",
    hint: "SEQUENCER.Setting.Permission.UseSidebarTools.Label",
    scope: "world",
    config: true,
    default: 0,
    type: Number,
    choices: permissionLevels,
    requiresReload: true,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "effectPresets", {
    scope: "client",
    default: {},
    type: Object,
  });

  Hooks.on("getSceneControlButtons", (controls) => {

    if (!game.settings.get(CONSTANTS.MODULE_NAME, "showSidebarTools")) return;

	  const sidebarTools = {
		  [CONSTANTS.TOOLS.SELECT]: {
			  name: CONSTANTS.TOOLS.SELECT,
			  title: "SEQUENCER.SidebarButtons.Select",
			  icon: "fas fa-expand",
			  visible:
				  user_can_do("permissions-effect-create") &&
				  user_can_do("permissions-sidebar-tools"),
			  onChange: () => {}
		  },
		  [CONSTANTS.TOOLS.PLAY]: {
			  name: CONSTANTS.TOOLS.PLAY,
			  title: "SEQUENCER.SidebarButtons.Play",
			  icon: "fas fa-play",
			  visible:
				  user_can_do("permissions-effect-create") &&
				  user_can_do("permissions-sidebar-tools"),
			  onChange: (event, active) => {
				  if(active || !CONSTANTS.IS_V13){
						EffectsUIApp.show({ inFocus: true, tab: "player" });
				  }
			  },
		  },
		  [CONSTANTS.TOOLS.VIEWER]: {
			  name: CONSTANTS.TOOLS.VIEWER,
			  title: "SEQUENCER.SidebarButtons.Manager",
			  icon: "fas fa-film",
			  button: true,
			  visible:
				  user_can_do("permissions-effect-create") &&
				  user_can_do("permissions-sidebar-tools"),
			  onChange: (event, active) => {
				  if(active || !CONSTANTS.IS_V13) {
					  EffectsUIApp.show({ inFocus: true, tab: "manager" });
				  }
			  },
		  },
		  [CONSTANTS.TOOLS.DATABASE]: {
			  name: CONSTANTS.TOOLS.DATABASE,
			  title: "SEQUENCER.SidebarButtons.Database",
			  icon: "fas fa-database",
			  button: true,
			  visible: user_can_do("permissions-sidebar-tools"),
			  onChange: (event, active) => {
				  if(active || !CONSTANTS.IS_V13) {
					  DatabaseViewerApp.show();
				  }
			  },
		  }
	  }

		if(CONSTANTS.IS_V13){
			return setupSidebarToolsV13(controls, sidebarTools);
		}

		Object.values(sidebarTools).forEach(button => {
			button.onClick = button.onChange;
		})

		return setupSidebarToolsV12(controls, sidebarTools);

  });

  debug("Sequencer | Registered settings");
}

function setupSidebarToolsV13(controls, sidebarTools){

	controls[CONSTANTS.MODULE_NAME] = {
		name: CONSTANTS.MODULE_NAME,
		title: "Sequencer Layer",
		icon: "fas fa-list-ol",
		layer: CONSTANTS.INTERFACE_LAYER,
		visible:
			user_can_do("permissions-effect-create") &&
			user_can_do("permissions-sidebar-tools"),
		activeTool: CONSTANTS.TOOLS.PLAY,
		onChange: (event, active) => {
			if ( active ) canvas.sequencerInterfaceLayer.activate({ tool: CONSTANTS.TOOLS.PLAY });
		},
		tools: sidebarTools,
	}

	if (!game.settings.get(CONSTANTS.MODULE_NAME, "showTokenSidebarTools")) {
		return;
	}

	controls["tokens"].tools[CONSTANTS.TOOLS.DATABASE] = sidebarTools[CONSTANTS.TOOLS.DATABASE];
	controls["tokens"].tools[CONSTANTS.TOOLS.VIEWER] = sidebarTools[CONSTANTS.TOOLS.VIEWER];
}

function setupSidebarToolsV12(controls, sidebarTools){

	controls.push({
		name: CONSTANTS.MODULE_NAME,
		title: "Sequencer Layer",
		icon: "fas fa-list-ol",
		layer: CONSTANTS.INTERFACE_LAYER,
		visible:
			user_can_do("permissions-effect-create") &&
			user_can_do("permissions-sidebar-tools"),
		activeTool: CONSTANTS.TOOLS.SELECT,
		tools: Object.values(sidebarTools)
	});

	if (!game.settings.get(CONSTANTS.MODULE_NAME, "showTokenSidebarTools")) {
		return;
	}

	const bar = controls.find((c) => c.name === "token");
	bar.tools.push(sidebarTools[CONSTANTS.TOOLS.DATABASE]);
	bar.tools.push(sidebarTools[CONSTANTS.TOOLS.VIEWER]);

}

export async function migrateSettings() {
  const oldScreenspaceSetting = game.settings.storage
    .get("client")
    .getItem("sequencer.disable-above-ui-screenspace");
  if (oldScreenspaceSetting) {
    const value = oldScreenspaceSetting === "true";
    game.settings.storage
      .get("client")
      .removeItem("sequencer.disable-above-ui-screenspace");
    await game.settings.set(
      CONSTANTS.MODULE_NAME,
      "enable-above-ui-screenspace",
      !value
    );
  }
}
