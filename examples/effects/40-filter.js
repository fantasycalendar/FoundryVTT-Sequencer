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
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1000 })
		.text("control", textStyle)

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1900, y: 1000 })
		.filter("ColorMatrix", { hue: 120 })
		.text("ColorMatrix")

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 2400, y: 1000 })
		.filter("Blur", { strength: 10, blur: 5, quality: 2 })
		.text("Blur")

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 2900, y: 1000 })
		.filter("Noise", { noise: 2, seed: Math.random() })
		.text("Noise 2")

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 3400, y: 1000 })
		.filter("Noise", { noise: 0.5, seed: Math.random() })
		.text("Noise 0.5")

		// second row

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1200 })
		.filter("Glow", {
			distance: 15,
			outerStrength: 3,
			innerStrength: 1,
			color: 0x00ffff,
			quality: 3,
			knockout: false,
		})
		.text("Glow 1", textStyle)

		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1900, y: 1200 })
		.filter("Glow", {
			distance: 15,
			outerStrength: 1,
			innerStrength: 4,
			color: 0xffffff,
			quality: 3,
			knockout: true,
		})
		.text("Glow 2")
		
		.waitUntilFinished()
		.play();
})();
