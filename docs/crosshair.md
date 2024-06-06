## Global Reference

You can access the global Sequencer crosshair API through:

```js
Sequencer.crosshair
```

## Show

`Sequencer.crosshair.show(crosshair={}, callbacks={})`

```js
crosshair = {
	distance: String, // The radius of the crosshair
	borderColor: String, // The color of the border of the crosshair
	fillColor: String, // The fill color of the crosshair
  
	icon: {
		display: Boolean, // Whether to display the icon
		texture: String, // If so, which texture to use
	},
	snap: {
		position: CONST.GRID_SNAPPING_MODES,
		size: CONST.GRID_SNAPPING_MODES,
		angle: Number
	},
	distanceMinMax: {
		min: null | Number,
		max: null | Number
	},
	label: {
		display: Boolean,
		text: String,
		dx: Number,
		dy: Number,
	},
	lockLocation: {
		location: PlaceableObject | Object,
		offsetDistance: Number,
		edge: Boolean
	},
	lockManualRotation: boolean,
	textureTile: Number,
}
  
callbacks = { 
  show: Function,
  move: Function
}
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// Creates a crosshair that returns a position when placed
const location = await Sequencer.crosshair.show();

// Creates a crosshair that returns a position when placed
const location = await Sequencer.crosshair.show({
  
});
```
<strong>--------------------------------</strong>

</details>

This will return any sound(s) that match the given filters.

## End Sounds

`Sequencer.SoundManager.endSounds(inFilters)`

```js
inFilters = {
  name: String, // From the .name() method on sounds, can have wildcards in them (such as "fireball_*" to match anything that starts with "fireball_")
  sounds: Sound | String,  // The actual sound, or an ID of an sound
  sceneId: String, // Default to current scene ID
  origin: String, // From the .origin() method on effects
};
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js

// Ends every sound named "test_sound"
await Sequencer.SoundManager.endSounds({ name: "test_sound" })

// Ends sounds that have "test" in their name
await Sequencer.SoundManager.endSounds({ name: "*test*" })

```
<strong>--------------------------------</strong>

</details>

Functionally the same as `getSounds`, except this instead ends any sound(s) that match the given filters.

You can only end sounds you created, unless you are a GM.

## End All Sounds

`Sequencer.SoundManager.endAllSounds(inSceneId)`

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js

// Ends all sounds in the current scene
await Sequencer.SoundManager.endAllSounds()

// Ends all sounds in the scene with the ID of "ULohafjBlsTRST8F"
await Sequencer.SoundManager.endAllSounds("ULohafjBlsTRST8F")

```
<strong>--------------------------------</strong>

</details>

This will end _all_ sounds on the current scene (if no scene ID is provided), or on the given scene.

This is a GM only method.
