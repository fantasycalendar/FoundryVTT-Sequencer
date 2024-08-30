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

	const [tile] = await canvas.scene.createEmbeddedDocuments("Tile", [
		{ texture: { src: "cards/dark-gold/clubs-02.webp" }, x: 1500, y: 1400, width: 400, height: 600 },
	]);

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({x: 1700, y: 1400})
		.text("control", textStyle)
		.play();

	await new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({x: 1700, y: 2000})
		.belowTiles()
		.text("below tiles", textStyle)
		.waitUntilFinished()
		.play();

	await tile.delete()
})();
