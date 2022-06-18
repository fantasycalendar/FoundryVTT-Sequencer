// Requires the JB2A module (free or patreon)
// Select a token, then target a set of tokens, and run this macro

let error = false;
if(!(game.modules.get("jb2a_patreon")?.active || game.modules.get("JB2A_DnD5e")?.active)){
    error = `You need to have JB2A installed and activated to run this macro!`;
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
let [firstTarget] = targets.splice(0, 1); // This removes the first target from the list, and makes it the first target

let sequence = new Sequence(); // Create a new sequence

sequence.effect()
    .file("jb2a.chain_lightning.primary.blue")
    .atLocation(origin) // Going from origin
    .stretchTo(firstTarget) // To the current loop's target
    .wait(600)

// then it jumps from the first target, to the next target, and so on
origin = firstTarget;

for(let target of targets){
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