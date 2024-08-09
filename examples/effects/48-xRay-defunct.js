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

	// this does not work since at least v11...
	new Sequence()
		.effect()
		.file("jb2a.token_stage.round.blue.01.01")
		.atLocation({ x: 1200, y: 1100 })
		.text("control", textStyle)
		.xray()
		.play();

})();
