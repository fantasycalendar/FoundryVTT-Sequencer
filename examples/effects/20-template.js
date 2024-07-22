(async () => {
	ui.notifications.info("Looping effect. First without any template, other with and overriden ones");

	new Sequence()
		.effect()
		.file("modules/jb2a_patreon/Library/Generic/Energy/EnergyBeam_03_Regular_BluePink_15ft_1000x400.webm")
		.atLocation({ x: 1100, y: 1000 })
		.stretchTo({ x: 2000, y: 1000 })
		.play();

	new Sequence()
		.effect()
		.file("modules/jb2a_patreon/Library/Generic/Energy/EnergyBeam_03_Regular_BluePink_15ft_1000x400.webm")
		.atLocation({ x: 1100, y: 1200 })
		.stretchTo({ x: 2000, y: 1200 })
		.template({ gridSize: 200, startPoint: 200, endPoint: 200 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1400 })
		.stretchTo({ x: 2000, y: 1400 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1100, y: 1600 })
		.stretchTo({ x: 2000, y: 1600 })
		.template({ gridSize: 100, startPoint: 500, endPoint: 200 })
		.play();
})();
