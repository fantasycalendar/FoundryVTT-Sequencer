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

	const token1 = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");
	const token2 = canvas.tokens.placeables.find((t) => t.name === "Tester (2)");

	if (!token1 || !token2) {
		ui.notifications.error('Please make sure tokens named "Tester (1)" and "Tester (2)" exist');
		return;
	}

	await new Sequence()
		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation(token1)
		.text("control", textStyle)

		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation(token2)
		.mask(token2)
		.text("masked", textStyle)

		.waitUntilFinished()
		.play();
})();
