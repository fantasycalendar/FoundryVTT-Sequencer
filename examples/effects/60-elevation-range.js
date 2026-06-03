// .elevation([bottom, top]): give an effect a vertical range that stays
// visible on every scene level the range reaches (Foundry v14+).
(async () => {
	if (!canvas?.scene) {
		ui.notifications.error("Open a scene before running this macro.");
		return;
	}

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.circle.02.evocation.intro.blue")
		.atLocation({ x: canvas.scene.dimensions.width / 2, y: canvas.scene.dimensions.height / 2 })
		.elevation([10, 30], { absolute: true })
		.persist()
		.name("levels-demo-range")
		.play();
})();
