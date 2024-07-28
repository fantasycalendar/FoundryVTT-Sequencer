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
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 1200, y: 1100 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 1600, y: 1100 })
		.text("rotateIn(180, 2000)", textStyle)
		.rotateIn(180, 2000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 2000, y: 1100 })
		.text("easing", textStyle)
		.rotateIn(180, 2000, { ease: "easeInOutBack" })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 1200, y: 1800 })
		.text("anchor control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 1600, y: 1800 })
		.text("anchor(0, 0)", textStyle)
		.rotateIn(180, 2000)
		.anchor(0, 0)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.loop.blue")
		.atLocation({ x: 2000, y: 1800 })
		.text("anchor(1, 1)", textStyle)
		.rotateIn(180, 2000, { ease: "easeInOutBack" })
		.anchor(1, 1)
		.play();
})();
