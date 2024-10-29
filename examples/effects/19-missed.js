(async () => {
	ui.notifications.info("Missed effects. Top row is control, bottom should be offset from the target");

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1100, y: 1100 })
		.rotateTowards({ x: 1500, y: 1100 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1100, y: 1400 })
		.rotateTowards({ x: 1500, y: 1400 })
		.missed()
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 2000, y: 1100 })
		.stretchTo({ x: 2400, y: 1100 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 2000, y: 1400 })
		.stretchTo({ x: 2400, y: 1400 })
		.missed()
		.play();
})();
