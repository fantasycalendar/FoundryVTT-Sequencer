(async() => {
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

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1400}).text('control').play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').duration(2000).atLocation({x: 3000, y: 1400}).text('2s').play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').duration(8000).atLocation({x: 1700, y: 2400}).text('8s').play()
})()