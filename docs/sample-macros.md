## Acid Splash

Uses [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)

![Acid splash hitting two tokens with random rotation and scales](images/acid_splash.gif)

```js
new Sequence()
	.effect("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
		.atLocation(canvas.tokens.controlled[0])
		.scale(0.3, 0.6)
		.randomRotation()
	.effect("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
		.atLocation(canvas.tokens.controlled[1])
		.scale(0.3, 0.6)
		.randomRotation()
	.play();
```

## Lightning Teleport

Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)

![Animation showing the Sequencer](images/Animation2.gif)

```js
let position = await Sequencer.Crosshair.show({
	size: 1,
	tag: randomID(),
	label: "Teleport to",
	drawOutline: false,
	drawIcon: false
}, { show: async (crosshair) => {

	new Sequence()
		.effect()
			.from(token)
			.attachTo(crosshair)
			.persist()
			.opacity(0.5)
		.play();

}})

if(!position){
	return;
}

new Sequence()
	.effect()
		.from(token)
		.fadeIn(50)
		.duration(550)
		.fadeOut(250)
		.filter("Blur")
		.elevation(0)
	.effect()
		.file("jb2a.chain_lightning.secondary.blue")
		.atLocation(token)
		.stretchTo(position)
		.elevation(0)
	.wait(100)
	.animation()
		.on(token)
		.teleportTo(position)
		.snapToGrid()
		.waitUntilFinished()
	.effect()
		.file("jb2a.static_electricity.03.blue")
		.atLocation(token)
		.scaleToObject()
	.play();
```

## Magic Missile

Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)

![One token firing three magic missiles on another token](images/magic_missile.gif)
```js
new Sequence()
	.effect()
		.atLocation(canvas.tokens.controlled[0])
		.stretchTo(canvas.tokens.controlled[1])
		.file("jb2a.magic_missile")
		.repeats(3, 200, 300)
		.randomizeMirrorY()
	.play();
```

## Magic Circle

![A magic circle fading, rotating, and scaling in, then fading, rotating, and scaling out](images/scalerotationfade.gif)

```js
new Sequence()
	.effect()
		.file("modules/jb2a_patreon/Library/Generic/Magic_Signs/Abjuration_01_Blue_Circle_800x800.webm")
		.atLocation(canvas.tokens.controlled[0])
		.scaleToObject(2)
		.belowTokens()
		.fadeIn(1500, {ease: "easeOutCubic", delay: 500})
		.fadeOut(1500)
		.rotateIn(90, 2500, {ease: "easeInOutCubic"})
		.rotateOut(350, 1500, {ease: "easeInCubic"})
		.scaleIn(2, 2500, {ease: "easeInOutCubic"})
		.scaleOut(0, 1500, {ease: "easeInCubic"})
	.play()
```

*Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)*

## Lightning Strike

Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)

![Random lightning strikes on a token](images/lightning_strike.gif)

```js
new Sequence()
	.effect()
		.atLocation(canvas.tokens.controlled[0])
		.file('Images/Effects/Lightning/LightningStrike_01{{letter}}_800x800.webm')
		.setMustache({
			// random letter between a to f
			"letter": () => {
				const letters = ['a', 'b', 'c', 'd', 'e', 'f']; 
				return letters[Math.floor(Math.random() * letters.length)];
			}
		})
		.scale(2)
		.randomizeMirrorX()
	.play();
```
