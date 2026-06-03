// Point effect at elevation 5. On a multi-level scene, visible only on
// whichever level's elevation range contains it. (Foundry v14+.)
(async () => {
	if (!canvas?.scene) {
		ui.notifications.error("Open a scene before running this macro.");
		return;
	}

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.circle.02.evocation.intro.blue")
		.atLocation({ x: canvas.scene.dimensions.width / 2, y: canvas.scene.dimensions.height / 2 })
		.elevation(5, { absolute: true })
		.persist()
		.name("levels-demo-point")
		.play();
})();
