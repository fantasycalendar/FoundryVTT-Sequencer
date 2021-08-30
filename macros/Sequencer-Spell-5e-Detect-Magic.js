// Requires the JB2A patreon module
// Requires Advanced Macros and MidiQOL with Workflow -> Add macro to call on use
// Then add this macro's name to the bottom of the Detect Magic spell in the "On Use Macro" field

let error = false;
if(typeof args !== 'undefined' && args.length === 0){
    error = `You can't run this macro from the hotbar! This is a callback macro. To use this, enable MidiQOL settings in "Workflow" -> "Add macro to call on use", then add this macro's name to the bottom of the Detect Magic spell in the "On Use Macro" field.`;
}

if(!(game.modules.get("jb2a_patreon"))){
    error = `You need to have JB2A's patreon only module installed to run this macro!`;
}

if(!game.modules.get("advanced-macros")?.active){
    let installed = game.modules.get("advanced-macros") && !game.modules.get("advanced-macros").active ? "enabled" : "installed";
    error = `You need to have Advanced Macros ${installed} to run this macro!`;
}

if(!game.modules.get("midi-qol")?.active){
    let installed = game.modules.get("midi-qol") && !game.modules.get("midi-qol").active ? "enabled" : "installed";
    error = `You need to have MidiQOL ${installed} to run this macro!`;
}

const actorD = game.actors.get(args[0].actor._id);
const tokenD = canvas.tokens.get(args[0].tokenId);
const itemD = actorD.items.getName(args[0].item.name);

if(error){
    ui.notifications.error(error);
    return;
}

let magicalObjects = [];

if(game.modules.get("tagger")?.active){

	let magicalSchools = Object.values(CONFIG.DND5E.spellSchools).map(school => school.toLowerCase());
	let magicalColors = ["blue", "green", "pink", "purple", "red", "yellow"];

	let objects = await Tagger.getByTag("magical", { ignore: [tokenD] });

	magicalObjects = objects.map(o => {
			let distance = canvas.grid.measureDistance(tokenD, o);
			return {
				delay: distance * 55,
				distance: distance,
				obj: o,
				school: Tagger.getTags(o).find(t => magicalSchools.includes(t.toLowerCase())) || false,
				color: Tagger.getTags(o).find(t => magicalColors.includes(t.toLowerCase())) || "blue"
			}
		})
		.filter(o => o.distance <= 32.5)

}

let sequence = new Sequence()
	.effect("jb2a.detect_magic.circle.blue")
		.atLocation(tokenD)
		.belowTiles()
		.size(13.75 * canvas.grid.size)

for(let magical of magicalObjects){

	if(!magical.school) continue;

	new Sequence()
		.effect("jb2a.magic_signs.rune.{{school}}.intro.{{color}}")
			.atLocation(magical.obj)
			.scale(0.25)
			.delay(magical.delay)
			.setMustache(magical)
			.waitUntilFinished(-800)
			.zIndex(0)
		.effect("jb2a.magic_signs.rune.{{school}}.loop.{{color}}")
			.atLocation(magical.obj)
			.scale(0.25)
			.setMustache(magical)
			.fadeOut(500)
			.waitUntilFinished(-800)
			.zIndex(1)
		.effect("jb2a.magic_signs.rune.{{school}}.outro.{{color}}")
			.atLocation(magical.obj)
			.scale(0.25)
			.setMustache(magical)
			.zIndex(0)
		.play()

}

sequence.play();