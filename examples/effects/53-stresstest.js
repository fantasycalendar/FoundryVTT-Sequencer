(async () => {
	// WARNING: this is taxing on the system, executing this script with sequencer 3.2.11 on time of writing
	// will most likely make your world unresponsive. Safer values for cols and rows would be 10x15
	const assets = [
		{ name: "video", file: "modules/sequencer/samples/fire.webm", cols: 30, rows: 22 },
		{ name: "spritesheet", file: "modules/sequencer/samples/spritesheets/fire.json", cols: 30, rows: 22 },
	];

	const effectSize = 120;
	const effectGridSize = 120;

	for (const { name, file, cols, rows } of assets) {
		ui.notifications.info(`Now playing ${name} effects`);
		await Sequencer.Helpers.wait(250);

		const start = { x: 1200, y: 900 };
		const seq = new Sequence();
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				seq.effect()
					.file(file)
					.atLocation({
						x: start.x + col * effectGridSize,
						y: start.y + row * effectGridSize,
					})
					.size(effectSize)
					.duration(20 * 1000);
			}
		}

		await seq.play({ preload: true });
		await Sequencer.Helpers.wait(21 * 1000);
	}
})();
