// Requires the Jack Kerouac's Animated Spell Effects: Cartoon module
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of the Acid Splash spell in the "On Use Macro" field

let error = false;
if(!game.modules.get("animated-spell-effects-cartoon")){
    error = `You need to have the module "Jack Kerouac's Animated Spell Effects: Cartoon" installed to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

let targets = [];
if(typeof args !== "undefined" && args.length !== 0){
    targets = Array.from(args[0]?.failedSaves);
}else{
    if(token) targets.push(token);
    let userTargets = Array.from(game.user.targets);
    if(userTargets.length){
        for(let target of userTargets){
            if(!targets.includes(target)) targets.push(target);
        }
    }
}

if(targets.length){
    new Sequence()
        .effect()
            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
            .atLocation(targets[0])
            .scale(0.3, 0.6)
            .center()
            .randomRotation()
        .effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
            .atLocation(targets[1] ?? false)
            .scale(0.3, 0.6)
            .center()
            .randomRotation()
            .delay(300)
            .playIf(targets.length === 2)
        .play()
}