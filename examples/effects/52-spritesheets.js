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
		.file("modules/sequencer/samples/spritesheets/fire.json")
		.atLocation({ x: 1200, y: 1100 })
		.scale(2)
		.text("spritesheet", {...textStyle, anchor: {x: 0.5, y: -2.5}})
		.duration(5000)
		.play();
})();
