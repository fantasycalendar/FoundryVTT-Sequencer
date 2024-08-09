(async() => {
	ui.notifications.info('Left endTime(1250), right endTimePerc(0.25). Should look the same')


	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').endTime(1250).atLocation({x: 1700, y: 1500}).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').endTimePerc(0.25).atLocation({x: 3100, y: 1500}).play()
})()