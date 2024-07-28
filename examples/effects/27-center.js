(async () => {
	const textStyle = {
		dropShadow: true,
		dropShadowAngle: 0,
		dropShadowBlur: 10,
		dropShadowDistance: 0,
		fill: "#ffffff",
		fontStyle: "oblique",
		miterLimit: 2,
		strokeThickness: 5,
	};

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1500, y: 1000 })
		.rotateTowards({ x: 2000, y: 1000 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1500, y: 1200 })
		.rotateTowards({ x: 2000, y: 1200 })
		.center()
		.text("centered ", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 1500, y: 1400 })
		.rotate(0)
		.text("rotate(0) + centered", textStyle)
		.play();
})();
