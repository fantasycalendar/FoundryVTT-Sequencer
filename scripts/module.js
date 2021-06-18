import setupSettings from "./settings.js";
import { registerSocket } from "./sockets.js";
import registerLayer from "./layers.js";

Hooks.once('init', async function() {
    console.log('hwat')
    registerLayer();
});

Hooks.once('ready', async function() {
    setupSettings();
    registerSocket();
    console.log("Sequencer | Ready to go!")
});