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

	ui.notifications.info("Scale. First regular, then scaleIn, with custom easing, and scaleOut");

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 1100 })
		.text('control', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 1100 })
		.scaleIn(0.5, 1000)
		.text('scaleIn 0.5, 1000', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 1100 })
		.scaleIn(2, 1000)
		.text('scaleIn 2, 1000', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 1100 })
		.scaleIn(2, 1000, { ease: "easeInOutBack" })
		.text('scaleIn 2, 2000, easing', textStyle)
		.play();

	// scale out
	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 1600 })
		.text('control', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 1600 })
		.scaleOut(0.5, 1000)
		.text('scaleOut 0.5, 1000', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 1600 })
		.scaleOut(2, 1000)
		.text('scaleOut 2, 1000', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 1600 })
		.scaleOut(2, 1000, { ease: "easeInOutBack" })
		.text('scaleOut 2, 1000, easing', textStyle)
		.play();

	// scale in and out
	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 2100 })
		.text('control', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 2100 })
		.scaleIn(2, 1000)
		.scaleOut(0.5, 1000)
		.text('inOut 2|0.5', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 2100 })
		.fadeIn(1000)
		.fadeOut(1000)
		.text('inOut 0.5|2', textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 2100 })
		.scaleIn(0.5, 1000, { ease: "easeInOutBack" })
		.scaleOut(2, 1000, { ease: "easeInOutBack" })
		.text('inOut 2|0.5 easing', textStyle)
		.play();
})();
