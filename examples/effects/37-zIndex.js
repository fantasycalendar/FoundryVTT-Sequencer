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
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1300, y: 1200 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1300, y: 1400 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1300, y: 1600 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.text("control", textStyle)
		.play();

	// second set
	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1800, y: 1200 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.zIndex(5)
		.text("first card with higher zIndex", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1800, y: 1400 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 1800, y: 1600 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.play();

		// third set
	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 2300, y: 1200 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.zIndex(5)
		.text("reversed order with zIndex", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 2300, y: 1400 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.zIndex(4)
		.play();

	new Sequence()
		.effect()
		.file("cards/dark-gold/clubs-02.webp")
		.atLocation({ x: 2300, y: 1600 })
		.size({ width: 400, height: 600 })
		.duration(5000)
		.zIndex(3)
		.play();
})();
