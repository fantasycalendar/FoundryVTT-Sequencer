// Token-attached effect follows the token's level on Foundry v14+.
(async () => {
	const token = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");
	if (!token) {
		ui.notifications.error('Please make sure a token named "Tester (1)" exists');
		return;
	}

	new Sequence()
		.effect()
		.file("jb2a.aura_themed.01.orbit.loop.cold.01.blue")
		.attachTo(token)
		.persist()
		.name("levels-demo-token")
		.play();
})();
