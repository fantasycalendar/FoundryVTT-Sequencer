// Requires the Jack Kerouac's Animated Spell Effects: Cartoon module
// Select a token, then target a set of tokens in any order, and run this macro.

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

let tokenOrder = [];
for(let i = 0; i < targets.length; i++){
    let potential_targets = targets.filter(item => tokenOrder.indexOf(item) === -1);
    let from = tokenOrder[tokenOrder.length-1] ?? current_target;
    let closest = potential_targets.reduce((a, b) => findClosestTo(from, a, b));
    tokenOrder.push(closest);
}

let origin = current_target;

let sequence = new Sequence(); // Create a new sequence
for(let target of tokenOrder){
    sequence.effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_03.webm")
        .atLocation(origin) // Going from origin
        .stretchTo(target) // To the current loop's target
    sequence.effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
        .atLocation(target) // Static on the target
        .gridSize(100)
        .scale(0.5)
        .wait(10) // Slight delay between each arc
    origin = target; // Then make current target the new origin
}
sequence.play()

function findClosestTo(from, a, b){
    let a_dist = canvas.grid.measureDistance(from, a);
    let b_dist = canvas.grid.measureDistance(from, b);
    return a_dist < b_dist ? a : b;
}