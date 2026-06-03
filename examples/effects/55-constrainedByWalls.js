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

	const token = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");

	if (!token) {
		ui.notifications.error('Please make sure a token named "Tester (1)" exists, and place a few walls near it');
		return;
	}

	// Effect attached to a token, clipped by walls. As the token moves, the
	// sweep updates each refresh tick; as walls are edited, the sweep
	// recomputes on a short debounce.
	new Sequence()
		.effect()
		.file("jb2a.energy_field.02.below.blue")
		.attachTo(token)
		.scaleToObject(3)
		.constrainedByWalls()
		.text("constrained by walls", textStyle)
		.persist()
		.play();

	// Stand-alone helper usage: compute the same polygon yourself and pass
	// it as a raw mask. Useful when you want a fixed clip independent of the
	// effect's source position.
	const polygon = Sequencer.Helpers.computeWallPolygon(
		{ x: token.center.x, y: token.center.y },
		{ type: "sight", radius: 600 }
	);

	new Sequence()
		.effect()
		.file("jb2a.energy_field.02.below.orange")
		.atLocation({ x: token.center.x + 400, y: token.center.y })
		.scale(2)
		.mask(polygon)
		.text("masked by helper polygon", textStyle)
		.persist()
		.play();
})();
