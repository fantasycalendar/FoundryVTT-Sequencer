(async() => {
	ui.notifications.info('Left played only locally. Right is control.')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1500}).locally(true).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 3100, y: 1500}).play()
})()