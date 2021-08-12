export default function registerHooks(){
    setTimeout(() => {
        Hooks.call('sequencer.ready')
    }, 250);
}