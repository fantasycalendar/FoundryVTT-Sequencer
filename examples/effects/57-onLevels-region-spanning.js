// Effect on a region whose elevation range spans two levels is visible
// on each of them (Foundry v14+).
(async () => {
	const region = canvas.regions?.placeables?.find((r) => r.document.name === "Stairwell");
	if (!region) {
		ui.notifications.error('Please make sure a region named "Stairwell" with a multi-level elevation range exists');
		return;
	}

	new Sequence()
		.effect()
		.file("jb2a.magic_signs.rune.evocation.intro.bluepurple")
		.attachTo(region)
		.persist()
		.name("levels-demo-region")
		.play();
})();
