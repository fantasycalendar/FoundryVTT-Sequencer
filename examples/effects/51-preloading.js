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

	ui.notifications.info('Control effects should be appearing in random batches. Preloaded should appear practically at the same time.')

	new Sequence()
		.effect()
		.file("jb2a.aura_themed")
		.atLocation({ x: 1200, y: 1100 })
		.text("control", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.aura_themed")
		.atLocation({ x: 1400, y: 1100 })
		.text("control", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.aura_themed")
		.atLocation({ x: 1600, y: 1100 })
		.text("control", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.aura_themed")
		.atLocation({ x: 1800, y: 1100 })
		.text("control", textStyle)
		.size(350)
		.duration(3000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.circle")
		.atLocation({ x: 1200, y: 1500 })
		.text("preloaded", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.magic_signs.circle")
		.atLocation({ x: 1400, y: 1500 })
		.text("preloaded", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.magic_signs.circle")
		.atLocation({ x: 1600, y: 1500 })
		.text("preloaded", textStyle)
		.size(350)
		.duration(3000)
		.effect()
		.file("jb2a.magic_signs.circle")
		.atLocation({ x: 1800, y: 1500 })
		.text("preloaded", textStyle)
		.size(350)
		.duration(3000)
		.play({ preload: true });
})();
