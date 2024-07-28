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
		.atLocation({ x: 1200, y: 1100 })
		.shape("circle", {
			lineSize: 4,
			lineColor: "#FF0000",
			radius: 1.5,
			gridUnits: true,
			name: "test",
		})
		.loopProperty("shapes.test", "scale.x", {
			from: 0.9,
			to: 1.1,
			duration: 1000,
			pingPong: true,
			ease: "easeInOutSine",
		})
		.loopProperty("shapes.test", "scale.y", {
			from: 0.9,
			to: 1.1,
			duration: 1000,
			pingPong: true,
			ease: "easeInOutSine",
		})
		.duration(5000)
		.play();
})();
