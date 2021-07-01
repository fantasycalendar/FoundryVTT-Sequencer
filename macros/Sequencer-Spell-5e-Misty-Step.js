// Requires the JB2A module - if you're using their free version, change the path to point to the right location
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of the Misty Step spell in the "On Use Macro" field

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

const lastArg = args[args.length - 1];
let tactor;
if (lastArg.tokenId) tactor = canvas.tokens.get(lastArg.tokenId).actor;
else tactor = game.actors.get(lastArg.actorId);
const target = canvas.tokens.get(lastArg.tokenId) || token;

let range = MeasuredTemplate.create({
    t: "circle",
    user: game.user._id,
    x: target.x + canvas.grid.size / 2,
    y: target.y + canvas.grid.size / 2,
    direction: 0,
    distance: 30,
    borderColor: "#FF0000",
    flags: {
        world: {
            MistyStep: {
                ActorId: tactor.id
            }
        }
    }
});

range.then(result => {

    let templateData = {
        t: "circle",
        user: game.user._id,
        distance: 2.5,
        direction: 45,
        x: 0,
        y: 0,
        fillColor: game.user.color,
        flags: {
            world: {
                MistyStep: {
                    ActorId: tactor.id
                }
            }
        }
    };


    Hooks.once("createMeasuredTemplate", deleteTemplatesAndMove);

    const doc = new MeasuredTemplateDocument(templateData, {parent: canvas.scene});
    let template = new game.dnd5e.canvas.AbilityTemplate(doc);
    template.actorSheet = tactor.sheet;
    template.drawPreview();

    async function deleteTemplatesAndMove(template) {

        let removeTemplates = canvas.templates.placeables.filter(i => i.data.flags.world?.MistyStep?.ActorId === tactor.id);
        removeTemplates = removeTemplates.map(template => template.id);
        if(removeTemplates) await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", removeTemplates);

        new Sequence()
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/2nd_Level/Misty_Step")
                .file("MistyStep_01_Regular_Blue_400x400.webm")
                .atLocation(target)
                .JB2A()
                .scale(0.6)
                .randomRotation()
            .wait(750)
            .thenDo(async () => {
                await target.document.update({
                    x: template.data.x - (canvas.grid.size * 0.5),
                    y: template.data.y - (canvas.grid.size * 0.5),
                    hidden: true
                }, { animate: false });
            })
            .effect()
                .baseFolder("modules/jb2a_patreon/Library/2nd_Level/Misty_Step")
                .file("MistyStep_02_Regular_Blue_400x400.webm")
                .atLocation(template)
                .JB2A()
                .scale(0.6)
                .randomRotation()
            .wait(1500)
            .thenDo(async () => {
                await target.document.update({
                    hidden: false
                }, { animate: false });
            })
            .play();


    };
});