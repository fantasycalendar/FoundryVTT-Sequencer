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
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1400 })
		.text("rotate(90)", textStyle)
		.rotate(90)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 1800 })
		.text("rotate(180)", textStyle)
		.rotate(180)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 2200 })
		.text("rotate(180).anchor(0,0.5)", textStyle)
		.rotate(180)
		.anchor(0, 0.5)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 2600 })
		.text("rotate(90).spriteRotation(-90)", textStyle)
		.rotate(90)
		.spriteRotation(-90)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.directional.loop.bluegreen.line400.02")
		.atLocation({ x: 1400, y: 3000 })
		.text("rotate(90).spriteRotation(-90).anchor(1,0.5)", textStyle)
		.rotate(90)
		.spriteRotation(-90)
		.anchor(1, 0.5)
		.play();
})();
