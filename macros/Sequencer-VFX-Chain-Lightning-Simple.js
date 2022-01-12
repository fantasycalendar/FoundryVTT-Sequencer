// Requires the Jack Kerouac's Animated Spell Effects: Cartoon module
// Select a token, then target a set of tokens, and run this macro

let error = false;
if(!game.modules.get("animated-spell-effects-cartoon")){
    error = `You need to have the module "Jack Kerouac's Animated Spell Effects: Cartoon" installed to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

let current_target = canvas.tokens.controlled[0];
let targets = Array.from(game.user.targets);

if(targets.indexOf(current_target) > -1){
    targets = targets.filter(t => t !== current_target);
}

let origin = current_target;

let sequence = new Sequence(); // Create a new sequence
for(let target of targets){
    sequence.effect()
            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_03.webm")
            .atLocation(origin) // Going from origin
            .stretchTo(target) // To the current loop's target
        .effect()
            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
            .atLocation(target) // Static on the target
            .gridSize(100)
            .scale(0.5)
            .wait(10) // Slight delay between each arc
    origin = target; // Then make current target the new origin
}
sequence.play()