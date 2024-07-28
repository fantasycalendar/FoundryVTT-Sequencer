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
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1000 })
		.stretchTo({x: 1600, y: 1000})
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1300 })
		.stretchTo({x: 1600, y: 1300})
		.text("spriteRotation(90)", textStyle)
		.spriteRotation(90)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1600 })
		.stretchTo({x: 1600, y: 1600})
		.text("spriteRotation(180)", textStyle)
		.spriteRotation(180)
		.play();


		new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1800 })
		.stretchTo({x: 1600, y: 1800})
		.text("spriteRotation(180).anchor(0,0.5)", textStyle)
		.spriteRotation(180)
		.anchor(0, 0.5)
		.play();

		new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 2000 })
		.stretchTo({x: 1600, y: 2000})
		.text("spriteRotation(180).anchor(1,0.5)", textStyle)
		.spriteRotation(180)
		.anchor(0, 0.5)
		.play();
})();
