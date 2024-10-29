(async () => {
	ui.notifications.info("Stretched and/or rotated sprites with spriteOffset. Top is reference");

	new Sequence()
		.effect()
		.file("jb2a.zoning.ground.directional.line400.02")
		.atLocation({ x: 2200, y: 1800 })
		.rotate(45)
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.ground.directional.line400.02")
		.atLocation({ x: 2200, y: 1800 })
		.rotate(45)
		.spriteOffset({ x: 300 })
		.duration(5000)
		.tint(0xff0000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.ground.directional.line400.02")
		.atLocation({ x: 2200, y: 1800 })
		.tint(0x0000ff)
		.rotate(-45)
		.spriteOffset({ x: 600 }, { local: true })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.ground.directional.line400.02")
		.atLocation({ x: 2200, y: 1800 })
		.tint(0xff00ff)
		.spriteRotation(-45)
		.spriteOffset({ x: 300 }, { local: true })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.zoning.ground.directional.line400.02")
		.atLocation({ x: 2200, y: 1800 })
		.tint(0x00ffff)
		.spriteRotation(-45)
		.spriteOffset({ x: 600 })
		.duration(5000)
		.play();
})();
