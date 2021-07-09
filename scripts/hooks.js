import SequencerDatabase from "./module/database.js";

export default function registerHooks(){
    window.SequencerDatabase = new SequencerDatabase();
    console.log("Sequencer | Hooks registered!")
    setTimeout(() => {
        Hooks.call('sequencer.ready')
    }, 250);
}