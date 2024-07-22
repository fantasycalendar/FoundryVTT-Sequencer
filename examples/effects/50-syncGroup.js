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

	new Sequence()
		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation({ x: 1200, y: 1100 })
		.syncGroup("sync-groups-inspiration")
		.name("sync-groups-inspiration1")
		.persist()
		.text("synced 1", textStyle)
		.play();

	setTimeout(() => {
		new Sequence()
			.effect()
			.file("jb2a.bardic_inspiration.greenorange")
			.atLocation({ x: 1600, y: 1100 })
			.name("sync-groups-inspiration2")
			.syncGroup("sync-groups-inspiration")
			.text("synced 2", textStyle)
			.persist()
			.play();
	}, 500);

	setTimeout(() => {
		Sequencer.EffectManager.endEffects({name: 'sync-groups-inspiration*'})
	}, 6000)
})();
