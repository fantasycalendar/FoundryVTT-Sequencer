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

	ui.notifications.info("Flurry of blows moving to the right. Top is linear, bottom is with easing");

	new Sequence()
		.effect()
		.file("jb2a.flurry_of_blows.magical.02.blue")
		.atLocation({ x: 1200, y: 1000 })
		.moveTowards({ x: 1800, y: 1000 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.flurry_of_blows.magical.02.blue")
		.atLocation({ x: 1200, y: 1200 })
		.moveTowards({ x: 1800, y: 1200 }, { ease: "easeInOutBack" })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.blue.bordered.01.05x05ft")
		.atLocation({ x: 1200, y: 1400 })
		.moveTowards({ x: 1800, y: 1400 })
		.text("movint tile with text", textStyle)
		.play();
})();
