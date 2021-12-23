import SequencerEffectsUI from "./module/formapplications/sequencer-effects-ui.js";
import CONSTANTS from "./module/constants.js";
import { user_can_do } from "./module/lib/lib.js";
import { InteractionManager } from "./module/sequencer-interaction-manager.js";

export function registerSettings() {

    // Define a settings submenu which handles advanced configuration needs
    game.settings.registerMenu(CONSTANTS.MODULE_NAME, "openSequencerDatabaseViewer", {
        name: game.i18n.localize("SEQUENCER.SettingsDatabaseViewerTitle"),
        label: game.i18n.localize("SEQUENCER.SettingsDatabaseViewerLabel"),
        icon: "fas fa-bars",
        type: Sequencer.DatabaseViewer,
        restricted: true
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "debug", {
        name: game.i18n.localize("SEQUENCER.SettingsDebugTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsDebugHint"),
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "effectsEnabled", {
        name: game.i18n.localize("SEQUENCER.SettingsEnableEffectsTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsEnableEffectsHint"),
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "soundsEnabled", {
        name: game.i18n.localize("SEQUENCER.SettingsEnableSoundsTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsEnableSoundsHint"),
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "user-effect-opacity", {
        name: game.i18n.localize("SEQUENCER.SettingsExternalEffectOpacityTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsExternalEffectOpacityHint"),
        scope: "client",
        config: true,
        default: 50,
        type: Number,
        range: {
            min: 0,
            max: 100,
            step: 1
        }
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "permissions-effect-create", {
        name: game.i18n.localize("SEQUENCER.PermissionEffectCreate"),
        hint: game.i18n.localize("SEQUENCER.PermissionEffectCreateHint"),
        scope: "world",
        config: true,
        default: 0,
        type: Number,
        choices: [
            "Players and above",
            "Trusted Players and above",
            "Assistant GMs",
        ],
        onChange: debouncedReload
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "permissions-effect-delete", {
        name: game.i18n.localize("SEQUENCER.PermissionEffectDelete"),
        hint: game.i18n.localize("SEQUENCER.PermissionEffectDeleteHint"),
        scope: "world",
        config: true,
        default: 2,
        type: Number,
        choices: [
            "Players and above",
            "Trusted Players and above",
            "Assistant GMs",
        ],
        onChange: debouncedReload
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "permissions-sound-create", {
        name: game.i18n.localize("SEQUENCER.PermissionSoundCreate"),
        hint: game.i18n.localize("SEQUENCER.PermissionSoundCreateHint"),
        scope: "world",
        config: true,
        default: 0,
        type: Number,
        choices: [
            "Players and above",
            "Trusted Players and above",
            "Assistant GMs",
        ],
        onChange: debouncedReload
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "permissions-_preload", {
        name: game.i18n.localize("SEQUENCER.PermissionPreloadClients"),
        hint: game.i18n.localize("SEQUENCER.PermissionPreloadClientsHint"),
        scope: "world",
        config: true,
        default: 1,
        type: Number,
        choices: [
            "Players and above",
            "Trusted Players and above",
            "Assistant GMs",
        ],
        onChange: debouncedReload
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "permissions-sidebar-tools", {
        name: game.i18n.localize("SEQUENCER.PermissionUseSidebarTools"),
        hint: game.i18n.localize("SEQUENCER.PermissionUseSidebarToolsHint"),
        scope: "world",
        config: true,
        default: 0,
        type: Number,
        choices: [
            "Players and above",
            "Trusted Players and above",
            "Assistant GMs",
        ],
        onChange: debouncedReload
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "hyperspace-deprecation-warning", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "effect-tools-permissions-tools-warning", {
        scope: "client",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(CONSTANTS.MODULE_NAME, "effectPresets", {
        scope: "client",
        default: {},
        type: Object
    });

    Hooks.on("getSceneControlButtons", (controls) => {

        const selectTool = {
            icon: "fas fa-expand",
            name: "select-effect",
            title: "Select Effect",
            visible: user_can_do("permissions-effect-create") && user_can_do('permissions-sidebar-tools'),
        };

        const playTool = {
            icon: "fas fa-play",
            name: "play-effect",
            title: "Play Effect",
            visible: user_can_do("permissions-effect-create") && user_can_do('permissions-sidebar-tools'),
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: "player" });
            }
        };

        const viewer = {
            icon: "fas fa-film",
            name: "effectviewer",
            title: "Show Sequencer Effects Viewer",
            button: true,
            visible: user_can_do("permissions-effect-create") && user_can_do('permissions-sidebar-tools'),
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: "manager" });
            }
        };

        const database = {
            icon: "fas fa-database",
            name: "effectdatabase",
            title: "Show Sequencer Database",
            button: true,
            visible: user_can_do('permissions-sidebar-tools'),
            onClick: () => {
                Sequencer.DatabaseViewer.show(true);
            }
        };

        controls.push({
            name: CONSTANTS.MODULE_NAME,
            title: "Sequencer Layer",
            icon: "fas fa-list-ol",
            layer: "sequencerEffectsAboveTokens",
            visible: user_can_do("permissions-effect-create") && user_can_do("permissions-sidebar-tools"),
            activeTool: "select-effect",
            tools: [
                selectTool,
                playTool,
                viewer,
                database
            ]
        })

        const bar = controls.find(c => c.name === "token");
        bar.tools.push(database);
        bar.tools.push(viewer);

    });

    console.log("Sequencer | Registered settings");

}

export function registerHotkeys(){

    game.keybindings.register(CONSTANTS.MODULE_NAME, "hotkey-shift", {
        name: "LEFT SHIFT",
        editable: [
            { key: "ShiftLeft" },
        ],
        onDown: InteractionManager.hotkeyDown.bind(InteractionManager),
        onUp: InteractionManager.hotkeyDown.bind(InteractionManager),
        reservedModifiers: [ "CONTROL", "ALT" ]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "hotkey-control", {
        name: "LEFT CONTROL",
        editable: [
            { key: "ControlLeft" },
        ],
        onDown: InteractionManager.hotkeyDown.bind(InteractionManager),
        onUp: InteractionManager.hotkeyDown.bind(InteractionManager),
        reservedModifiers: [ "SHIFT", "ALT" ]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "hotkey-alt", {
        name: "LEFT ALT",
        editable: [
            { key: "AltLeft" },
        ],
        onDown: InteractionManager.hotkeyDown.bind(InteractionManager),
        onUp: InteractionManager.hotkeyDown.bind(InteractionManager),
        reservedModifiers: [ "CONTROL", "SHIFT" ]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "hotkey-delete", {
        name: "Delete Effect",
        editable: [
            { key: "Delete" },
        ],
        onDown: InteractionManager.hotkeyDown.bind(InteractionManager),
        onUp: InteractionManager.hotkeyDown.bind(InteractionManager),
    });


}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)