(async () => {
	ui.notifications.info("Rotate towards different positions. Left is original scale, right are scaled variants");
	const buildStar = (center, scale = 1) => {
		for (let row = -1; row <= 1; row++) {
			for (let col = -1; col <= 1; col++) {
				if (!col && !row) {
					continue;
				}
				new Sequence()
					.effect()
					.file("jb2a.energy_beam.normal.bluepink.03.15ft")
					.atLocation(center)
					.rotateTowards({ x: center.x + col, y: center.y + row })
					.scale(scale)
					.play();
			}
		}
	};
	buildStar({ x: 1400, y: 1400 });
	buildStar({ x: 2100, y: 1400 }, 0.75);
	buildStar({ x: 2900, y: 1400 }, 1.25);

	ui.notifications.info(
		"Below, rotation straight to the right (control) and offset by +/- 45 deg. Right is offset by +/- 100 units"
	);
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1400, y: 2000 })
		.rotateTowards({ x: 1500, y: 2000 }, { rotationOffset: 45 })
		.play();
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1400, y: 2000 })
		.rotateTowards({ x: 1500, y: 2000 }, { rotationOffset: -45 })
		.play();
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 1400, y: 2000 })
		.rotateTowards({ x: 1500, y: 2000 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 2000, y: 2000 })
		.rotateTowards({ x: 2300, y: 2000 }, { offset: { y: -100 } })
		.play();
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 2000, y: 2000 })
		.rotateTowards({ x: 2300, y: 2000 }, { offset: { y: 100 } })
		.play();
	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation({ x: 2000, y: 2000 })
		.rotateTowards({ x: 2300, y: 2000 })
		.play();
})();
