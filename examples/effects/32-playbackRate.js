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
		.file("jb2a.token_stage.round.blue.01.01")
		.atLocation({ x: 1200, y: 1100 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.token_stage.round.blue.01.01")
		.atLocation({ x: 1600, y: 1100 })
		.text("playbackRate(0.5)", textStyle)
		.playbackRate(0.5)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.token_stage.round.blue.01.01")
		.atLocation({ x: 2000, y: 1100 })
		.text("playbackRate(2.0)", textStyle)
		.playbackRate(2)
		.play();
})();
