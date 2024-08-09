(async() => {
	ui.notifications.info('Left timeRange(1500, 3500). Right is control.')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').timeRange(1500, 3500).atLocation({x: 1700, y: 1500}).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 3100, y: 1500}).play()
})()