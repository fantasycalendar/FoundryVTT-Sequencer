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

	await new Sequence()
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1100, y: 1100 })
		.text("control", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1400, y: 1100 })
		.animateProperty('sprite', 'position.x', {from: 0, to: 100, duration: 2500})
		.text("position.x 0->100", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1800, y: 1100 })
		.animateProperty('sprite', 'position.x', {from: 0, to: 100, duration: 2500, ease: 'easeInOutBack'})
		.text("custom easing ", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2200, y: 1100 })
		.animateProperty('sprite', 'alpha', {from: 0, to: 1, duration: 2500})
		.text("sprite alpha", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2600, y: 1100 })
		.animateProperty('alphaFilter', 'alpha', {from: 0, to: 1, duration: 2500})
		.text("alphaFilter ", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1100, y: 1400 })
		.animateProperty('sprite', 'anchor.x', {from: 0, to: 1, duration: 2500})
		.text("anchor", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1400, y: 1400 })
		.moveTowards({ x: 1500, y: 1400 })
		.animateProperty('sprite', 'rotation', {from: 0, to: 360, duration: 2500})
		.text("moveTowards + rotation", textStyle)


		// Angle is currently the same as rotation, that is measured in degrees instead of radians?
		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 1800, y: 1400 })
		.animateProperty('sprite', 'angle', {from: 0, to: 2*Math.PI, duration: 2500})
		.text("angle", textStyle)

		.effect()
		.file("jb2a.braziers.orange.bordered.01.05x05ft")
		.atLocation({ x: 2200, y: 1400 })
		.anchor(1)
		.animateProperty('spriteContainer', 'rotation', {from: 0, to: 360, duration: 2500})
		.text("container rotation", textStyle)
		
		.waitUntilFinished()
		.play();
})();
