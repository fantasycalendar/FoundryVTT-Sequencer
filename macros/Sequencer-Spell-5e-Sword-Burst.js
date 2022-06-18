// Requires the Jack Kerouac's Animated Spell Effects: Cartoon module
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of any spell in the "On Use Macro" field

let error = false;
if(!game.modules.get("animated-spell-effects-cartoon")){
    error = `You need to have the module "Jack Kerouac's Animated Spell Effects: Cartoon" installed to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

// You can also run this directly on a selected token
let tokenD = typeof args !== "undefined" && args.length !== 0 ? canvas.tokens.get(args?.[0]?.tokenId) : token;

if(tokenD) {
    new Sequence()
        .effect()
            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/magic/magic_sphere_1token_SQUARE.webm")
            .atLocation(tokenD)
            .scale(1.5)
            .template({ gridSize: 100 })
            .randomRotation()
        .play()
}