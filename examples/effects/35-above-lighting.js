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

	const lights = await canvas.scene.createEmbeddedDocuments("AmbientLight", [
		{ x: 1600, y: 1200, config: { bright: 20, dim: 20, color: 0xff0000 } },
		{ x: 1600, y: 1900, config: { bright: 20, dim: 20, color: 0xff0000 } },
	]);

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({x: 1600, y: 1200})
		.text("control", textStyle)
		.play();

	await new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.abjuration.complete.blue")
		.atLocation({x: 1600, y: 1900})
		.aboveLighting()
		.text("above lighting", textStyle)
		.waitUntilFinished()
		.play();

		await canvas.scene.deleteEmbeddedDocuments('AmbientLight', lights.map(light => light.id))
})();
