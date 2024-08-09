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
	.file("jb2a.screen_overlay.01.bad_omen.yellow")
	.screenSpace()
	.screenSpaceScale({fitX: true, fitY: true})
	.text("screenSpacePosition", textStyle)
	
	.waitUntilFinished()
	.play();

})();
