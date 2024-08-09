(async() => {
	ui.notifications.info('TEST simple effect, rotating fire jet. Used as control later on.')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1500}).play()
})()