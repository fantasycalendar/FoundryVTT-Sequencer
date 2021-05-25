import { Sequence } from './sequencer.js';

Hooks.once('init', async function() {

    window.Sequence = Sequence;

    console.log("Sequencer | Ready to roll")

});