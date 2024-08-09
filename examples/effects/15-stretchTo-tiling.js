(async () => {
	ui.notifications.info("top: static texture stretched, bottom: only-x and tiling");

	new Sequence()
		.effect()
		.file("modules/sequencer/samples/Bindings/chain.png")
		.atLocation({ x: 1200, y: 1000 })
		.stretchTo({ x: 3000, y: 1000 })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("modules/sequencer/samples/Bindings/chain.png")
		.atLocation({ x: 1200, y: 1200 })
		.stretchTo({ x: 3000, y: 1200 }, { onlyX: true })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("modules/sequencer/samples/Bindings/chain.png")
		.atLocation({ x: 1200, y: 1300 })
		.stretchTo({ x: 3000, y: 1300 }, { tiling: true })
		.duration(5000)
		.play();

	new Sequence()
		.effect()
		.file("modules/sequencer/samples/Bindings/chain.png")
		.atLocation({ x: 1200, y: 1500 })
		.stretchTo({ x: 3000, y: 1500 }, { tiling: true, offset: { y: 300 } })
		.duration(5000)
		.play();
})();
