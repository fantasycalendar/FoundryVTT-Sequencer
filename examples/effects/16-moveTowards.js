(async () => {
	ui.notifications.info("Flurry of blows moving to the right. Top is linear, bottom is with easing");

	new Sequence()
		.effect()
		.file("jb2a.flurry_of_blows.magical.02.blue")
		.atLocation({ x: 1200, y: 1000 })
		.moveTowards({ x: 1800, y: 1000 })
		.play();

	new Sequence()
		.effect()
		.file("jb2a.flurry_of_blows.magical.02.blue")
		.atLocation({ x: 1200, y: 1200 })
		.moveTowards({ x: 1800, y: 1200 }, { ease: "easeInOutBack" })
		.play();
})();
