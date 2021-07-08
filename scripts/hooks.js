import SequencerDatabase from "./module/database.js";

export default function registerHooks(){
    window.SequencerDatabase = new SequencerDatabase();
    Hooks.call('sequencer.ready');
    console.log("Sequencer | Hooks registered!")
}