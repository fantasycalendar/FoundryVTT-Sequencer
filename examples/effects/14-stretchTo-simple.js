(async () => {
	ui.notifications.info("rays stretched from top to bottom to 5, 15, 30, 60, 90ft and some inbetween.");

	// rows of rays
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1000 })
		.stretchTo({ x: 1300, y: 1000 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1100 })
		.stretchTo({ x: 1500, y: 1100 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1200 })
		.stretchTo({ x: 1650, y: 1200 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1300 })
		.stretchTo({ x: 1800, y: 1300 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1400 })
		.stretchTo({ x: 2100, y: 1400 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1500 })
		.stretchTo({ x: 2400, y: 1500 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1600 })
		.stretchTo({ x: 2700, y: 1600 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1200, y: 1700 })
		.stretchTo({ x: 3000, y: 1700 })
		.play();

	ui.notifications.info("Bottom two: overscaled variants. Top regular scaling, bottom only-x scaling");

	// diagonal, overscaled
	new Sequence()
		.effect()
		.file("modules/jb2a_patreon/Library/Generic/Energy/EnergyBeam_03_Regular_BluePink_15ft_1000x400.webm")
		.atLocation({ x: 1000, y: 1900 })
		.stretchTo({ x: 3500, y: 1900 }, { onlyX: false })
		.play();

	// diagonal, only x overscaled
	new Sequence()
		.effect()
		.file("modules/jb2a_patreon/Library/Generic/Energy/EnergyBeam_03_Regular_BluePink_15ft_1000x400.webm")
		.atLocation({ x: 1000, y: 2100 })
		.stretchTo({ x: 3500, y: 2100 }, { onlyX: true })
		.play();
})();
