export default function registerSettings(){

    game.settings.register("sequencer", "debug", {
        name: "Enable debugging",
        hint: "This will make the sequencer log into the console what it is doing.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "effectsEnabled", {
        name: "Enable Effects",
        hint: "Enables effects to be played on this client",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("sequencer", "soundsEnabled", {
        name: "Enable Sounds",
        hint: "Enables sounds to be played on this client",
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });

	// Define a settings submenu which handles advanced configuration needs
	game.settings.registerMenu("sequencer", "openSequencerDatabaseViewer", {
		name: "Open Sequencer Database Viewer",
		hint: "This opens the sequencer database viewer ",
		label: "Open Database Viewer",
		icon: "fas fa-bars",
		type: SequencerDatabaseViewer,
		restricted: true
	});

    game.settings.register("sequencer", "fileCache", {
        name: "fileCache",
        scope: "client",
        config: false,
        default: {},
        type: Object
    });

    game.settings.set('sequencer', 'fileCache', {});

    console.log("Sequencer | Registered settings");

}