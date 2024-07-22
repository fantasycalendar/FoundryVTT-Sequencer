(async() => {
	ui.notifications.info('TEST simple effect. startTime set to 1250 and startTimePerc. to 25%. Should look the same')


	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').startTime(1250).atLocation({x: 1700, y: 1500}).play()
	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').startTimePerc(0.25).atLocation({x: 3100, y: 1500}).play()
})()