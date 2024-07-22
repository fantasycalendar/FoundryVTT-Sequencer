(async() => {
	ui.notifications.info('left shortened duration to 2s. Right is control.')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').duration(2000).atLocation({x: 1700, y: 1500}).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 3100, y: 1500}).play()
})()