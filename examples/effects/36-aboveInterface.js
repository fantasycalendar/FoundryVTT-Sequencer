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

	ui.notifications.info("Please make sure tokens have nameplate, elevation and/or hp bars visible");

	new Sequence()
		.effect()
		.file("jb2a.arms_of_hadar.dark_purple")
		.atLocation(token1)
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.arms_of_hadar.dark_purple")
		.atLocation(token2)
		.aboveLighting()
		.text("above interface", textStyle)
		.aboveInterface()
		.play();
})();
