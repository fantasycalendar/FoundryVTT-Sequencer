import SequencerEffectsUI from "./module/formapplications/sequencer-effects-ui.js";

export default function registerSettings() {

    // Define a settings submenu which handles advanced configuration needs
    game.settings.registerMenu("sequencer", "openSequencerDatabaseViewer", {
        name: "Open Sequencer Database Viewer",
        hint: "This opens the sequencer database viewer ",
        label: "Open Database Viewer",
        icon: "fas fa-bars",
        type: Sequencer.DatabaseViewer,
        restricted: true
    });

    game.settings.register("sequencer", "debug", {
        name: "Enable debugging",
        hint: "This will make the sequencer log into the console what it is doing.",
        scope: "client",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "effectsEnabled", {
        name: "Enable Effects",
        hint: "Enables effects to be played on this client",
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register("sequencer", "soundsEnabled", {
        name: "Enable Sounds",
        hint: "Enables sounds to be played on this client",
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register("sequencer", "toolButtonsEnabled", {
        name: "Enable Tool-menu Buttons",
        hint: "Enables the buttons in the left-hand control menu to open the database viewer and effect manager",
        scope: "client",
        config: true,
        default: true,
        onChange: debouncedReload,
        type: Boolean
    });

    game.settings.register("sequencer", "user-effect-opacity", {
        name: "Player only effect opacity for GM",
        hint: "If users create effects visible only for other players, this setting allows you to set an opacity that these effects will be visible for you as a GM, making sure they're not abusing each other's computers.",
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

    game.settings.register("sequencer", "effectPresets", {
        scope: "client",
        default: {},
        type: Object
    });

    Hooks.on("getSceneControlButtons", (controls) => {

        const playTool = {
            icon: "fas fa-play",
            name: "play-effect",
            title: "Play Effect"
        };

        const player = {
            icon: "fas fa-play-circle",
            name: "effectplayer",
            title: "Show Sequencer Effects Player",
            button: true,
            visible: game.user.isGM,
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: 1 });
            },
        };

        const viewer = {
            icon: "fas fa-film",
            name: "effectviewer",
            title: "Show Sequencer Effects Viewer",
            button: true,
            visible: game.user.isTrusted,
            onClick: () => {
                SequencerEffectsUI.show({ inFocus: true, tab: 2 });
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
            visible: game.user.isGM,
            activeTool: "play-effect",
            tools: [
                playTool,
                player,
                viewer,
                database
            ]
        })

        if(!game.settings.get("sequencer", "toolButtonsEnabled")) return;
        const bar = controls.find(c => c.name === "token");
        bar.tools.push(database);
        bar.tools.push(viewer);

    });

    console.log("Sequencer | Registered settings");

}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)