(async () => {

	ui.notifications.info('playIf(() => true). Should play normally. Right is control')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1500}).playIf(() => true).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 3100, y: 1500}).play()
})()