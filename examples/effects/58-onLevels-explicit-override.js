// .onLevels() override: skip the automatic elevation-based derivation and
// place the effect on the listed levels only (Foundry v14+). Replace the
// level ids below with real ones from your scene.
(async () => {
	if (!canvas?.scene) {
		ui.notifications.error("Open a scene before running this macro.");
		return;
	}

	const LEVEL_A_ID = "REPLACE_WITH_LEVEL_A_ID";
	const LEVEL_C_ID = "REPLACE_WITH_LEVEL_C_ID";
	if (LEVEL_A_ID.startsWith("REPLACE_") || LEVEL_C_ID.startsWith("REPLACE_")) {
		ui.notifications.error("Edit this macro and replace LEVEL_A_ID / LEVEL_C_ID with real ids from this scene");
		return;
	}

	new Sequence()
		.effect()
		.file("jb2a.markers.runes.05.bluepurple")
		.atLocation({ x: canvas.scene.dimensions.width / 2, y: canvas.scene.dimensions.height / 2 })
		.elevation(25, { absolute: true })
		.onLevels([LEVEL_A_ID, LEVEL_C_ID])
		.persist()
		.name("levels-demo-override")
		.play();
})();
