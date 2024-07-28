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
		.file("jb2a.magic_signs.rune.enchantment.complete.pink")
		.atLocation({ x: 1200, y: 1000 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.enchantment.complete.pink")
		.atLocation({ x: 1500, y: 1000 })
		.text("mirrorX", textStyle)
		.mirrorX()
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.enchantment.complete.pink")
		.atLocation({ x: 1800, y: 1000 })
		.text("mirrorY", textStyle)
		.mirrorY()
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.enchantment.complete.pink")
		.atLocation({ x: 2100, y: 1000 })
		.text("mirrorX, mirrorY", textStyle)
		.mirrorX()
		.mirrorY()
		.play();
})();
