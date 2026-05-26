// Positional sound attenuates across scene levels on Foundry v14+.
// Requires walls between levels for Foundry's surface-collision check to
// muffle listeners on other levels.
(async () => {
	const token = canvas.tokens.placeables.find((t) => t.name === "Tester (1)");
	if (!token) {
		ui.notifications.error('Please make sure a token named "Tester (1)" exists');
		return;
	}

	new Sequence()
		.sound()
		.file("sounds/notify.wav")
		.atLocation(token)
		.attachTo(token, { bindElevation: true })
		.radius(30)
		.constrainedByWalls(false)
		.play();
})();
