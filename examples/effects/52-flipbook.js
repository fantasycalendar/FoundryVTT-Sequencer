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

	const database = {
		flipbook: {
			fire: {
				file: [
					"modules/sequencer/samples/flipbooks/fire/fire_01c-0.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-1.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-2.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-3.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-4.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-5.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-6.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-7.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-8.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-9.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-10.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-11.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-12.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-13.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-14.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-15.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-16.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-17.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-18.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-19.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-20.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-21.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-22.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-23.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-24.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-25.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-26.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-27.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-28.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-29.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-30.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-31.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-32.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-33.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-34.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-35.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-36.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-37.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-38.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-39.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-40.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-41.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-42.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-43.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-44.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-45.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-46.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-47.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-48.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-49.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-50.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-51.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-52.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-53.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-54.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-55.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-56.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-57.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-58.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-59.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-60.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-61.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-62.webp",
					"modules/sequencer/samples/flipbooks/fire/fire_01c-63.webp",
				],
				_flipbook: true,
				_fps: 20, // defaults to 24 if not set
			},
		},
	};
	Sequencer.Database.registerEntries("examples", database);

	new Sequence()
		.effect()
		.file("examples.flipbook.fire")
		.atLocation({ x: 1200, y: 1100 })
		.playbackRate(1.25)
		.scale(2)
		.text("flipbook", { ...textStyle, anchor: { x: 0.5, y: -2.5 } })
		.duration(5000)
		.play();
})();
