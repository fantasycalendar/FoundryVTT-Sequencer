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

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation(token1)
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation(token2)
		.belowTokens()
		.text("below tokens", textStyle)
		.play();
})();
