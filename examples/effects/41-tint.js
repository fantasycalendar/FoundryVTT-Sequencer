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

	await new Sequence()
		.effect()
		.file("jb2a.extras.tmfx.inflow.circle.01")
		.atLocation({ x: 1400, y: 1100 })
		.text("control", textStyle)

		.effect()
		.file("jb2a.extras.tmfx.inflow.circle.01")
		.atLocation({ x: 2000, y: 1100 })
		.tint(0xff0000)
		.text("tint red", textStyle)

		.effect()
		.file("jb2a.extras.tmfx.inflow.circle.01")
		.atLocation({ x: 2600, y: 1100 })
		.tint(0x00ff00)
		.text("tint green", textStyle)

		.effect()
		.file("jb2a.extras.tmfx.inflow.circle.01")
		.atLocation({ x: 3200, y: 1100 })
		.tint(0x0000ff)
		.text("tint blue", textStyle)

		.effect()
		.file("jb2a.extras.tmfx.inflow.circle.01")
		.atLocation({ x: 1400, y: 1700 })
		.animateProperty("sprite", "tint", { from: 0xffffff, to: 0xffff00, duration: 2500 })
		.text("animated to red", textStyle)

		.waitUntilFinished()
		.play();
})();
