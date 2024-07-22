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

	//TODO
	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1300, y: 1300 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1500, y: 1200 })
		.anchor({ x: 0, y: 0 })
		.text("anchor({x: 0, y: 0})", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1700, y: 1200 })
		.anchor({ x: 1, y: 0 })
		.text("anchor({x: 1, y: 0})", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1900, y: 1200 })
		.anchor({ x: -1, y: 0 })
		.text("anchor({x: -1, y: 0})", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2100, y: 1200 })
		.anchor({ x: 0, y: 1 })
		.text("anchor({x: 0, y: 1})", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2300, y: 1200 })
		.anchor({ x: 0, y: -1 })
		.text("anchor({x: 0, y: -1})", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 1100 })
		.text("control", { ...textStyle, fill: 0xffff00 })
		.tint(0xffff00)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 1400 })
		.spriteAnchor({ x: 0, y: 0 })
		.text("spriteAnchor({x: 0, y: 0})", { ...textStyle, fill: 0xff00ff })
		.tint(0xff00ff)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 1700 })
		.spriteAnchor({ x: 1, y: 0 })
		.text("spriteAnchor({x: 1, y: 0})", { ...textStyle, fill: 0x00ffff })
		.tint(0x00ffff)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 2000 })
		.spriteAnchor({ x: -1, y: 0 })
		.text("spriteAnchor({x: -1, y: 0})", { ...textStyle, fill: 0x0000ff })
		.tint(0x0000ff)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 2300 })
		.spriteAnchor({ x: 0, y: 1 })
		.text("spriteAnchor({x: 0, y: 1})", { ...textStyle, fill: 0x00ff00 })
		.tint(0x00ff00)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1600, y: 2500 })
		.spriteAnchor({ x: 0, y: -1 })
		.text("spriteAnchor({x: 0, y: -1})", { ...textStyle, fill: 0xff0000 })
		.tint(0xff0000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 2600, y: 2000 })
		.stretchTo({ x: 3200, y: 2000 })
		.text("26x11 -> 32x11 control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 2600, y: 2300 })
		.stretchTo({ x: 3200, y: 2300 })
		.anchor({ x: 0, y: 0 })
		.text("26x23 -> 32x23 {x: 0, y: 0}", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.energy_beam.normal.bluepink.03")
		.atLocation({ x: 2600, y: 2600 })
		.stretchTo({ x: 3200, y: 2600 })
		.anchor({ x: 1, y: 1 })
		.text("26x15 -> 32x26 {x: 1, y: 1}", textStyle)
		.play();
})();
