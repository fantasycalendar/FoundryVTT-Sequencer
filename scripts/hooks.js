import { SequencerDatabaseApplication } from "./templates.js";

export default function registerHooks(){
    Hooks.on("sequencer.database.view", () => {
        return new SequencerDatabaseApplication().render(true);
    });
    console.log("Sequencer | Hooks registered!")
    setTimeout(() => {
        Hooks.call('sequencer.ready')
    }, 250);
}