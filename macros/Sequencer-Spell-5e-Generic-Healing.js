// Requires the JB2A module - if you're using their free version, change the path to point to the right location
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of any spell in the "On Use Macro" field

// You can also run this directly on a selected token, or if you have targets, you can run it on them

let error = false;
if(!(game.modules.get("jb2a_patreon") || game.modules.get("JB2A_DnD5e"))){
    error = `You need to have JB2A installed to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}


let targets = [];
if(typeof args !== "undefined" && args.length !== 0){
    targets = args[0].targets;
}else{
    let userTargets = Array.from(game.user.targets);
    if(userTargets.length){
        for(let target of userTargets){
            if(!targets.includes(target)) targets.push(target);
        }
    }else{
		if(token) targets.push(token);
	}
}

let sequence = new Sequence()
for(let target of targets){
    sequence.effect()
        .atLocation(target)
        .JB2A()
        .baseFolder("modules/jb2a_patreon/Library/Generic/Healing")
        .file("HealingAbility_01_Green_200x200.webm")
}
sequence.play();