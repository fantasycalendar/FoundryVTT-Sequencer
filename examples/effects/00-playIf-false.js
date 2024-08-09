(async () => {
	ui.notifications.info('TEST no .play(). Should not appear. Location 1700x1500')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1500})
	
	await Sequencer.Helpers.wait(1500)

	ui.notifications.info('TEST falsy .playIf with .play(). Should not appear. Location 1700x1500')

	new Sequence().effect().file('jb2a.fire_trap.02.single.orange').atLocation({x: 1700, y: 1500}).playIf(() => false).play()
})()