## Global Reference

You can access the global Sequencer Sound Manager through:

```js
Sequencer.SoundManager
```

## Show Sound Manager

You can either call this method:
```js
Sequencer.SoundManager.show()
```
Or press this button

![Image showing the button to open the Sound Manager](images/effect-viewer-button.jpg)

This will open this UI, where you can end any of your own sounds currently playing on the canvas, and GMs can end any sounds that are currently playing.

## Get Sounds

`Sequencer.SoundManager.getSounds(inFilters)`

```js
inFilters = {
  name: String, // From the .name() method on sounds, can have wildcards in them (such as "fireball_*" to match anything that starts with "fireball_")
  sounds: Sound | String, // The actual sound, or an ID of an sound
  sceneId: String, // Default to current scene ID
  origin: String // From the .origin() method on effects
}
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// Retrieves every sound named "test_sound"
const sounds = Sequencer.SoundManager.getSounds({ name: "test_sound" })

// Retrieves sounds that have "test" in their name
const sounds = Sequencer.SoundManager.getSounds({ name: "*test*" })
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
