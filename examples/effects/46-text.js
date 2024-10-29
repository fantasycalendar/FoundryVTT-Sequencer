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
		.atLocation({ x: 1200, y: 1100 })
		.text("control", textStyle)

		.effect()
		.atLocation({ x: 1200, y: 1200 })
		.text("textAnchor {x: 0, y: 0}", {
			...textStyle,
			anchor: {x: 0, y: 0}
		})


		.effect()
		.atLocation({ x: 1200, y: 1400 })
		.text("textAnchor {x: 1, y: 1}", {
			...textStyle,
			anchor: {x: 1, y: 1}
		})

		.waitUntilFinished()
		.play();

})();
