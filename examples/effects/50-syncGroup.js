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

	// regular playback rate
	new Sequence()
		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation({ x: 1200, y: 1100 })
		.syncGroup("sync-groups-inspiration")
		.name("sync-groups-inspiration1")
		.playbackRate(1)
		.persist()
		.text("sync1, pbrate 1", textStyle)
		.play();

	setTimeout(() => {
		new Sequence()
			.effect()
			.file("jb2a.bardic_inspiration.greenorange")
			.atLocation({ x: 1600, y: 1100 })
			.name("sync-groups-inspiration2")
			.syncGroup("sync-groups-inspiration")
			.text("sync1, pbrate 1", textStyle)
			.playbackRate(1)
			.persist()
			.play();
	}, 1000);


	// slower playback rate
	new Sequence()
		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation({ x: 1200, y: 1600 })
		.syncGroup("sync-groups-inspiration")
		.name("sync-groups-inspiration1")
		.playbackRate(0.5)
		.persist()
		.text("sync2, pbrate 0.5", textStyle)
		.play();

	setTimeout(() => {
		new Sequence()
			.effect()
			.file("jb2a.bardic_inspiration.greenorange")
			.atLocation({ x: 1600, y: 1600 })
			.name("sync-groups-inspiration2")
			.syncGroup("sync-groups-inspiration")
			.text("sync2, pbrate 0.5", textStyle)
			.playbackRate(0.5)
			.persist()
			.play();
	}, 1000);

	
	// faster playback rate
	new Sequence()
		.effect()
		.file("jb2a.bardic_inspiration.greenorange")
		.atLocation({ x: 1200, y: 2100 })
		.syncGroup("sync-groups-inspiration")
		.name("sync-groups-inspiration1")
		.playbackRate(1.5)
		.persist()
		.text("sync1, pbrate 1.5", textStyle)
		.play();

	setTimeout(() => {
		new Sequence()
			.effect()
			.file("jb2a.bardic_inspiration.greenorange")
			.atLocation({ x: 1600, y: 2100 })
			.name("sync-groups-inspiration2")
			.syncGroup("sync-groups-inspiration")
			.text("sync1, pbrate 1.5", textStyle)
			.playbackRate(1.5)
			.persist()
			.play();
	}, 1000);

	setTimeout(() => {
		Sequencer.EffectManager.endEffects({name: 'sync-groups-inspiration*'})
	}, 9000)
})();
