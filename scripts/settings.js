import SequencerEffectsUI from "./module/formapplications/sequencer-effects-ui.js";

export default function registerSettings() {

    // Define a settings submenu which handles advanced configuration needs
    game.settings.registerMenu("sequencer", "openSequencerDatabaseViewer", {
        name: game.i18n.localize("SEQUENCER.SettingsDatabaseViewerTitle"),
        label: game.i18n.localize("SEQUENCER.SettingsDatabaseViewerLabel"),
        icon: "fas fa-bars",
        type: Sequencer.DatabaseViewer,
        restricted: true
    });

    game.settings.register("sequencer", "debug", {
        name: game.i18n.localize("SEQUENCER.SettingsDebugTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsDebugHint"),
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "effectsEnabled", {
        name: game.i18n.localize("SEQUENCER.SettingsEnableEffectsTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsEnableEffectsHint"),
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register("sequencer", "soundsEnabled", {
        name: game.i18n.localize("SEQUENCER.SettingsEnableSoundsTitle"),
        hint: game.i18n.localize("SEQUENCER.SettingsEnableSoundsHint"),
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register("sequencer", "user-effect-opacity", {
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

    game.settings.register("sequencer", "hyperspace-deprecation-warning", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "permissions-warning", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "effectPresets", {
        scope: "client",
        default: {},
        type: Object
    });

    Hooks.on("getSceneControlButtons", (controls) => {

        const playTool = {
            icon: "fas fa-play",
            name: "play-effect",
            title: "Play Effect",
            visible: game.user.can("SEQUENCER_EFFECT_CREATE") && game.settings.get('sequencer', 'effectsEnabled'),
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: "player" });
            }
        };

        const viewer = {
            icon: "fas fa-film",
            name: "effectviewer",
            title: "Show Sequencer Effects Viewer",
            button: true,
            visible: game.user.can("SEQUENCER_EFFECT_CREATE") && game.settings.get('sequencer', 'effectsEnabled'),
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: "manager" });
            },
        };

        const database = {
            icon: "fas fa-database",
            name: "effectdatabase",
            title: "Show Sequencer Database",
            button: true,
            onClick: () => {
                Sequencer.DatabaseViewer.show(true);
            },
        };

        controls.push({
            name: "sequencer",
            title: "Sequencer Layer",
            icon: "fas fa-list-ol",
            layer: "sequencerEffectsAboveTokens",
            visible: game.user.can("SEQUENCER_EFFECT_CREATE") && game.settings.get('sequencer', 'effectsEnabled'),
            activeTool: "play-effect",
            tools: [
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

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)