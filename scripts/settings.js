export default function setupSettings(){

    game.settings.register("sequencer", "debug", {
        name: "Enable debugging",
        hint: "This will make the sequencer log into the console what it is doing.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });

    game.settings.register("sequencer", "fileCache", {
        name: "fileCache",
        scope: "client",
        config: false,
        default: {},
        type: Object
    });

    game.settings.set('sequencer', 'fileCache', {});

    console.log("Sequencer | Set up settings");

}