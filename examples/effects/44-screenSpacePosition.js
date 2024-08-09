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
	.file("jb2a.falling_rocks.side.1x1.grey.0")
	.atLocation({ x: 1200, y: 1200 })
	.text("control", textStyle)

	.effect()
	.file("jb2a.falling_rocks.side.1x1.grey.0")
	.screenSpace()
	.screenSpaceAnchor(0, 0)
	.screenSpacePosition({x: 500, y: 400})
	.text("screenSpacePosition", textStyle)
	
	.waitUntilFinished()
	.play();

})();
