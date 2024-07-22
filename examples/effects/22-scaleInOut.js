(async () => {
	ui.notifications.info("Scale. First regular, then scaleIn, with custom easing, and scaleOut");

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 1100 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 1100 })
		.scaleIn(0.5, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 1100 })
		.scaleIn(2, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 1100 })
		.scaleIn(2, 1000, { ease: "easeInOutBack" })
		.play();

	// scale out
	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 1600 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 1600 })
		.scaleOut(0.5, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 1600 })
		.scaleOut(2, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 1600 })
		.scaleOut(2, 1000, { ease: "easeInOutBack" })
		.play();

	// scale in and out
	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 2100 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 2100 })
		.scaleIn(2, 1000)
		.scaleOut(0.5, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 2100 })
		.scaleIn(0.5, 1000)
		.scaleOut(2, 1000)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 2300, y: 2100 })
		.scaleIn(0.5, 1000, { ease: "easeInOutBack" })
		.scaleOut(2, 1000, { ease: "easeInOutBack" })
		.play();
})();
