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

    game.settings.register("sequencer", "hyperspace-deprecation-warning", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });

    Hooks.on("getSceneControlButtons", (controls) => {
        if(!game.settings.get("sequencer", "toolButtonsEnabled")) return;
        const bar = controls.find(c => c.name === "token");
        bar.tools.push({
            icon: "fas fa-database",
            name: "effectdatabase",
            title: "Show Sequencer Database",
            button: true,
            onClick: () => {
                Sequencer.DatabaseViewer.show(true);
            },
        });
        if (!game.user.isTrusted) return;
        bar.tools.push({
            icon: "fas fa-film",
            name: "effectviewer",
            title: "Show Sequencer Effects Viewer",
            button: true,
            onClick: () => {
                Sequencer.EffectManager.show(true);
            },
        });
    });

    console.log("Sequencer | Registered settings");

}

const debouncedReload = debounce(() => {
    window.location.reload()
}, 100)