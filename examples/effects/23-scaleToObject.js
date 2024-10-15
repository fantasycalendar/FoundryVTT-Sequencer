(async () => {
	ui.notifications.info(
		"Tester 1 uses scaleToObject(1), Tester 2 scaleToObject(1). Reference plain image at 2000x1500"
	);

	const token1 = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");
	const token2 = canvas.tokens.placeables.find((t) => t.name === "Tester (2)");

	const token3 = canvas.tokens.placeables.find((t) => t.name === "Tester (3)");
	const token4 = canvas.tokens.placeables.find((t) => t.name === "Tester (4)");


	if (!token1 || !token2 || !token2 || !token4) {
		ui.notifications.error('Please make sure tokens named "Tester (1)", "Tester (2)", "Tester (3)" and "Tester (4)" exist');
		return;
	}

	new Sequence().effect().file("jb2a.token_border.circle.static.blue.001").atLocation({ x: 2000, y: 1500 }).play();

	new Sequence().effect().file("jb2a.token_border.circle.static.blue.001").atLocation(token1).scaleToObject().play();

	new Sequence().effect().file("jb2a.token_border.circle.static.blue.001").atLocation(token2).scaleToObject(2).play();

	new Sequence().effect().file("jb2a.token_border.circle.static.blue.001").atLocation(token3).scaleToObject().play();

	await new Sequence()
		.effect()
		.file("jb2a.token_border.circle.static.blue.001")
		.atLocation(token4)
		.scaleToObject()
		.waitUntilFinished()
		.play();

	ui.notifications.info("Now testing with consider token scale set to true");

	new Sequence()
		.effect()
		.file("jb2a.token_border.circle.static.blue.001")
		.atLocation(token1, { considerTokenScale: true })
		.scaleToObject()
		.play();

	new Sequence()
		.effect()
		.file("jb2a.token_border.circle.static.blue.001")
		.atLocation(token2, { considerTokenScale: true })
		.scaleToObject()
		.play();

	new Sequence()
		.effect()
		.file("jb2a.token_border.circle.static.blue.001")
		.atLocation(token3, { considerTokenScale: true })
		.scaleToObject()
		.play();

	await new Sequence()
		.effect()
		.file("jb2a.token_border.circle.static.blue.001")
		.atLocation(token4, { considerTokenScale: true })
		.scaleToObject()
		.waitUntilFinished()
		.play();

	ui.notifications.info("last set, non-uniform scaling");

	new Sequence().effect().file("jb2a.energy_beam.normal.bluepink.03.15ft").atLocation(token1).scaleToObject(3).play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03.15ft")
		.atLocation(token2)
		.scaleToObject(3, { uniform: true })
		.play();
})();
