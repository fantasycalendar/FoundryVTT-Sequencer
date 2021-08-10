// Requires the JB2A module - if you're using their free version, change the path to point to the right location
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of the Faerie Fire spell in the "On Use Macro" field

let error = false;
if(typeof args !== 'undefined' && args.length === 0){
    error = `You can't run this macro from the hotbar! This is a callback macro. To use this, enable MidiQOL settings in "Workflow" -> "Add macro to call on use", then add this macro's name to the bottom of the Misty Step spell in the "On Use Macro" field.`;
}

if(!(game.modules.get("jb2a_patreon") || game.modules.get("JB2A_DnD5e"))){
    error = `You need to have JB2A installed to run this macro!`;
}

if(!game.modules.get("advanced-macros")?.active){
    let installed = game.modules.get("advanced-macros") && !game.modules.get("advanced-macros").active ? "enabled" : "installed";
    error = `You need to have Advanced Macros ${installed} to run this macro!`;
}

if(!game.modules.get("midi-qol")?.active){
    let installed = game.modules.get("midi-qol") && !game.modules.get("midi-qol").active ? "enabled" : "installed";
    error = `You need to have MidiQOL ${installed} to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

let configSettings = game.settings.get("midi-qol", "ConfigSettings");
if(configSettings.autoTarget === "none"){
    Hooks.once("createMeasuredTemplate", runMacro);
}else{
    runMacro({_id: args[0].templateId});
}

async function runMacro(template){

    let templateC = canvas.templates.placeables.find(t => t.id === template._id);

    if(template){
        new Sequence()
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/Generic/Fireflies")
                .file("Fireflies_01_Green_Few01_400x400.webm")
                .atLocation(templateC)
				.scale(2)
                .JB2A()
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/Generic/Fireflies")
                .file("Fireflies_01_Green_Few02_400x400.webm")
                .atLocation(templateC)
				.scale(2)
                .JB2A()
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/Generic/Fireflies")
                .file("Fireflies_01_Green_Many01_400x400.webm")
                .atLocation(templateC)
				.scale(2)
                .JB2A()
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/Generic/Fireflies")
                .file("Fireflies_01_Green_Many02_400x400.webm")
                .atLocation(templateC)
				.scale(2)
                .JB2A()
            .waitUntilFinished()
            .thenDo(() => {
                try {
                    canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [template._id]);
                }catch(err){}
            })
            .play()
    }
}