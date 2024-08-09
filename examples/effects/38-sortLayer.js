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

	const tiles = await canvas.scene.createEmbeddedDocuments("Tile", [
		{ texture: { src: "cards/dark-gold/clubs-02.webp" }, x: 1500, y: 1300, width: 400, height: 600 },
		{ texture: { src: "cards/dark-gold/joker.webp" }, x: 2000, y: 1300, width: 400, height: 600, elevation: 20 },
	]);

	const [drawing] = await canvas.scene.createEmbeddedDocuments("Drawing", [
		{
			shape: { type: "r", width: 900, height: 600 },
			fillAlpha: 0.7,
			fillType: 1,
			fillColor: 0xff60f0,
			x: 1500,
			y: 2000,
		},
	]);

	// sort layer tiles
	await new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1500, y: 1300 })
		.text("regular", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1950, y: 1300 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.TILES)
		.elevation(40, { absolute: true })
		.text("tiles, elevation 40", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1950, y: 1500 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.TILES)
		.elevation(10, { absolute: true })
		.text("tiles, elevation 10", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1700, y: 1950 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.TILES)
		.text("tiles", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1700, y: 1950 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.TILES)
		.text("tiles", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2200, y: 1950 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.TILES)
		.elevation(30, { absolute: true })
		.text("tiles, elevation 30", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1950, y: 1950 })
		.sortLayer(PrimaryCanvasGroup.SORT_LAYERS.DRAWINGS)
		.text("drawings", textStyle)
		.waitUntilFinished()
		.play();

	await drawing.delete();
	await canvas.scene.deleteEmbeddedDocuments(
		"Tile",
		tiles.map((light) => light.id)
	);
})();
