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
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 1500, y: 1300 })
		.text("control", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 2600, y: 1300 })
		.loopOptions({ loops: 1.5 })
		.text("playing 1,5 loops", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 3700, y: 1300 })
		.loopOptions({ loops: 1 })
		.timeRange(250, 2000)
		.text("persisted, timerange, no delete", textStyle)
		.persist()
		.name("persistedTrap")
		.play();

	new Sequence()
		.effect()
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 1500, y: 2500 })
		.loopOptions({ loops: 2 })
		.startTime(2500)
		.text("2 loops, 2,5s start time", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 2600, y: 2500 })
		.loopOptions({ loops: 2 })
		.endTime(2500)
		.text("2 loops, 2,5s end time", textStyle)
		.play();

	new Sequence()
		.effect()
		.file("jb2a.fire_trap.01.orange")
		.atLocation({ x: 3700, y: 2500 })
		.loopOptions({ loops: 2, loopDelay: 2500 })
		.text("2 loops, 2,5s delay", textStyle)
		.play();

	setTimeout(() => {
		Sequencer.EffectManager.endEffects({ name: "persistedTrap" });
	}, 10000);
})();
