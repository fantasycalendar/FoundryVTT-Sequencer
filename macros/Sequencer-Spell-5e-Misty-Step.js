// Requires the JB2A module - if you're using their free version, change the path to point to the right location
// Then add this macro's name to the bottom of the Misty Step spell in the "On Use Macro" field

let error = false;
if(!(game.modules.get("jb2a_patreon") || game.modules.get("JB2A_DnD5e"))){
    error = `You need to have JB2A installed to run this macro!`;
}

if(!game.modules.get("warpgate")?.active){
    let installed = game.modules.get("warpgate") && !game.modules.get("warpgate").active ? "enabled" : "installed";
    error = `You need to have WarpGate ${installed} to run this macro!`;
}

const tokenD = typeof args !== "undefined" && args.length !== 0 ? canvas.tokens.get(args?.[0]?.tokenId) : token;

if(!tokenD){
    error = `Could not find the token to teleport!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

let range = await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{
    t: "circle",
    user: game.user._id,
    x: tokenD.x + canvas.grid.size / 2,
    y: tokenD.y + canvas.grid.size / 2,
    direction: 0,
    distance: 30,
    borderColor: "#FF0000"
}]);

let position = await warpgate.crosshairs.show({
    size: 1,
    tag: randomID(),
    label: "Teleport to",
    drawOutline: false,
    drawIcon: false
}, { show: async (crosshair) => {

    new Sequence()
        .effect()
            .from(tokenD)
            .attachTo(crosshair)
            .persist()
            .opacity(0.5)
        .play();

}})

await range[0].delete();

new Sequence()
    .effect()
        .file("jb2a.misty_step.01.blue")
        .atLocation(tokenD)
        .randomRotation()
        .scaleToObject(2)
    .wait(750)
    .animation()
        .on(tokenD)
        .opacity(0.0)
        .waitUntilFinished()
    .animation()
        .on(tokenD)
        .teleportTo(position)
        .snapToGrid()
        .waitUntilFinished()
    .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(tokenD)
        .randomRotation()
        .scaleToObject(2)
    .wait(1500)
    .animation()
        .on(tokenD)
        .opacity(1.0)
    .play();