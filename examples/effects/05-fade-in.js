(async() => {
	ui.notifications.info('Left fadeIn(1500). Right is control.')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').fadeIn(1500).atLocation({x: 1700, y: 1500}).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 3100, y: 1500}).play()
})()