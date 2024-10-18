(async () => {
	const token1 = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");

	if (!token1) {
		ui.notifications.error('Please make sure tokens named "Tester (1)" and "Tester (2)" exist');
		return;
	}

	await token1.document.update({ x: 1200, y: 1200 }, { animate: false });

	let seq = new Sequence()
		.effect()
		.file("jb2a.aura_themed.01.orbit.loop.cold.01.blue")
		.text("moves with token")
		.attachTo(token1)
		.waitUntilFinished()
		.play();

	await Sequencer.Helpers.wait(500);

	await token1.document.update({ x: 1600, y: 1200 }, { animate: true });

	await seq;

	seq = new Sequence()
		.effect()
		.file("jb2a.aura_themed.01.orbit.loop.cold.01.blue")
		.text("scales with token")
		.scaleToObject(2)
		.attachTo(token1, { bindScale: true })
		.waitUntilFinished()
		.play();

	await Sequencer.Helpers.wait(500);

	const flags = token1.document.flags.pf2e;
	await token1.document.update(
		{ width: 2, height: 2, "flags.pf2e.linkToActorSize": false, "flags.pf2e.autoscale": false },
		{ animate: true }
	);

	await seq;

	await token1.document.update({ width: 1, height: 1, "flags.pf2e": flags }, { animate: true });
})();
