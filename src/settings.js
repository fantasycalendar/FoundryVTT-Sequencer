import CONSTANTS from "./constants.js";
import { user_can_do } from "./lib/lib.js";
import { DatabaseViewerApp } from "./formapplications/database/database-viewer-app.js";
import { EffectsUIApp } from "./formapplications/effects-ui/effects-ui-app.js";

export function registerSettings() {
  game.settings.register(CONSTANTS.MODULE_NAME, "enable-pixi-fix", {
    name: "SEQUENCER.Setting.EnablePixiFix.Title",
    hint: "SEQUENCER.Setting.EnablePixiFix.Label",
    scope: "client",
    config: true,
    default: true,
    requiresReload: true,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_NAME, "enable-global-pixi-fix", {
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

    const selectTool = {
      icon: "fas fa-expand",
      name: "select-effect",
      title: "SEQUENCER.SidebarButtons.Select",
      visible:
        user_can_do("permissions-effect-create") &&
        user_can_do("permissions-sidebar-tools"),
    };

    const playTool = {
      icon: "fas fa-play",
      name: "play-effect",
      title: "SEQUENCER.SidebarButtons.Play",
      visible:
        user_can_do("permissions-effect-create") &&
        user_can_do("permissions-sidebar-tools"),
      onClick: () => {
        EffectsUIApp.show({ inFocus: true, tab: "player" });
      },
    };

    const viewer = {
      icon: "fas fa-film",
      name: "effectviewer",
      title: "SEQUENCER.SidebarButtons.Manager",
      button: true,
      visible:
        user_can_do("permissions-effect-create") &&
        user_can_do("permissions-sidebar-tools"),
      onClick: () => {
        EffectsUIApp.show({ inFocus: true, tab: "manager" });
      },
    };

    const database = {
      icon: "fas fa-database",
      name: "effectdatabase",
      title: "SEQUENCER.SidebarButtons.Database",
      button: true,
      visible: user_can_do("permissions-sidebar-tools"),
      onClick: () => {
        DatabaseViewerApp.show();
      },
    };

    controls.push({
      name: CONSTANTS.MODULE_NAME,
      title: "Sequencer Layer",
      icon: "fas fa-list-ol",
      layer: "sequencerInterfaceLayer",
      visible:
        user_can_do("permissions-effect-create") &&
        user_can_do("permissions-sidebar-tools"),
      activeTool: "select-effect",
      tools: [selectTool, playTool, database, viewer],
    });

    if (!game.settings.get(CONSTANTS.MODULE_NAME, "showTokenSidebarTools"))
      return;

    const bar = controls.find((c) => c.name === "token");
    bar.tools.push(database);
    bar.tools.push(viewer);
  });

  console.log("Sequencer | Registered settings");
}

export async function migrateSettings() {
  const oldPixiFixSetting = game.settings.storage
    .get("client")
    .getItem("sequencer.disable-pixi-fix");

  if (oldPixiFixSetting) {
    const value = oldPixiFixSetting === "true";
    game.settings.storage
      .get("client")
      .removeItem("sequencer.disable-pixi-fix");
    await game.settings.set(CONSTANTS.MODULE_NAME, "enable-pixi-fix", !value);
  }

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
