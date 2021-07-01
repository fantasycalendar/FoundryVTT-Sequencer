// Requires the ____PAID____ JB2A module
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of any spell in the "On Use Macro" field

// You can also run this directly on a selected token, or if you have targets, you can run it on them

let error = false;
if(!game.modules.get("jb2a_patreon")){
    error = `You need to have the full (patreon) version of JB2A installed to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}


let targets = [];
if(typeof args !== "undefined" && args.length !== 0){
    targets = args[0].targets;
}else{
    if(token) targets.push(token);
    let userTargets = Array.from(game.user.targets);
    if(userTargets.length){
        for(let target of userTargets){
            if(!targets.includes(target)) targets.push(target);
        }
    }
}

let sequence = new Sequence()
for(let target of targets){
    sequence.effect()
        .baseFolder("modules/jb2a_patreon/Library/Generic/Template/Circle/OutPulse")
        .file("OutPulse_02_Regular_{{color}}_Burst_600x600.webm")
        .atLocation(target)
        .JB2A()
        .scale(0.3)
        .randomRotation()
        .setMustache({
            "color": () => {
                return ['BlueWhite', 'GreenOrange', 'PurplePink', 'TealYellow'][Math.floor(Math.random() * 4)]
            }
        })
}
sequence.play();