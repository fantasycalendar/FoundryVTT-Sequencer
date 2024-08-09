(async () => {
	ui.notifications.info("SpriteScale vs normal scale. First with rotateTowards, then stretchTo");

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1000 })
		.rotateTowards({ x: 1500, y: 1000 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1100 })
		.rotateTowards({ x: 1500, y: 1100 })
		.scale(2)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1200 })
		.rotateTowards({ x: 1500, y: 1200 })
		.spriteScale(2)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1400 })
		.stretchTo({ x: 1500, y: 1400 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1500 })
		.stretchTo({ x: 1500, y: 1500 })
		.scale(2)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1600 })
		.stretchTo({ x: 1500, y: 1600 })
		.spriteScale(2)
		.play();
})();
