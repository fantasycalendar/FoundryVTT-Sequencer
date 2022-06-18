// Requires the JB2A module (free or patreon)
// Select a token, then target a set of tokens in any order, and run this macro.

let error = false;
if(!(game.modules.get("jb2a_patreon")?.active || game.modules.get("JB2A_DnD5e")?.active)){
    error = `You need to have JB2A installed and activated to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

let origin = canvas.tokens.controlled[0];
let targets = Array.from(game.user.targets);

if(targets.indexOf(origin) > -1){
    targets = targets.filter(t => t !== origin);
}

// Sort the targeted tokens in from the shortest distance to the longest distance
let tokenOrder = [];
for(let i = 0; i < targets.length; i++){
    let potential_targets = targets.filter(item => tokenOrder.indexOf(item) === -1);
    let from = tokenOrder[tokenOrder.length-1] ?? origin;
    let closest = potential_targets.reduce((a, b) => findClosestTo(from, a, b));
    tokenOrder.push(closest);
}

let [firstTarget] = tokenOrder.splice(0, 1); // This removes the first target from the list, and makes it the first target

let sequence = new Sequence(); // Create a new sequence

sequence.effect()
    .file("jb2a.chain_lightning.primary.blue")
    .atLocation(origin) // Going from origin
    .stretchTo(firstTarget) // To the current loop's target
    .wait(600)

// then it jumps from the first target, to the next target, and so on
origin = firstTarget;

for(let target of tokenOrder){
    sequence.effect()
        .file("jb2a.chain_lightning.secondary.blue")
        .atLocation(origin) // Going from origin
        .stretchTo(target) // To the current loop's target
    .effect()
        .file("jb2a.static_electricity.02.blue02")
        .atLocation(target) // Static on the target
        .scaleToObject(1.5) // Scale so it fits the target
        .randomRotation() // Randomly rotate the effect so it's not the same for each token
    .wait(200) // Slight delay between each arc

    origin = target; // Then make current target the new origin
}

sequence.play()

// This function finds the closest token from a given origin token
function findClosestTo(from, a, b){
    let a_dist = canvas.grid.measureDistance(from, a);
    let b_dist = canvas.grid.measureDistance(from, b);
    // If the distances are the same, randomly pick one of the two
    if(a_dist === b_dist){
        return Math.random() > 0.5 ? a : b;
    }
    return a_dist < b_dist ? a : b;
}