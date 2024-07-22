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

	// TODO
	await new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1100, y: 1100 })
		.text("control", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1500, y: 1100 })
		.loopProperty("sprite", "rotation", { from: -15, to: 15, duration: 1000, ease: "easeInOutBack" })
		.text("loop rotation", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1900, y: 1100 })
		.loopProperty("sprite", "rotation", {
			from: -15,
			to: 15,
			duration: 1000,
			ease: "easeInOutBack",
			pingPong: true,
		})
		.text("ping pong", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2300, y: 1100 })
		.loopProperty("sprite", "position.x", { values: [0, -10, 10, -20, 20, -40, 40, 0], duration: 200 })
		.text("values", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2700, y: 1100 })
		.loopProperty("sprite", "position.x", { values: [0, 100, -100, 0], duration: 2000 })
		.loopProperty("sprite", "rotation", { values: [0, 360], duration: 2000 })
		.loopProperty("spriteContainer", "rotation", { values: [0, -360], duration: 2000 })
		.text("multiple", textStyle)

		.waitUntilFinished()
		.play();
})();
