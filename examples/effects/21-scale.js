(async () => {
	ui.notifications.info("Scale. First regular, then 0.5 and 1.5");

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1100, y: 1100 })
		.play();

		new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1500, y: 1100 })
		.scale(0.5)
		.play();

		new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({ x: 1900, y: 1100 })
		.scale(1.5)
		.play();


})();
