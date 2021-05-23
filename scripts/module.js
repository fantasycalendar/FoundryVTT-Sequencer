import { Sequence } from './module/sequence.js';

Hooks.once('init', async function() {

    window.Sequence = Sequence;

});