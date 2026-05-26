### What is this?
This part of the Sequencer makes playing sounds easy, including fading the sound in or out, playing for specific players, etc.

### How do I use this?

When creating a sound section, you can assemble these methods like this:
```js
new Sequence()
    .sound()
        .file("Music/Sound_Effects/Phoenix_Cry.wav")
        .fadeInAudio(500)
        .fadeOutAudio(500)
    .play()
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the sound to finish running before starting the next section.

Passing a number as a parameter will cause the sound or sound to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the sound.

Passing a second number will randomize the wait duration between the two given numbers.

## Async

`.async()`

Calling this will make each part of the sound finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition (see `.repeats()` below), whilst `.waitUntilFinished()` is for the entire sound.

## Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the sound or sound to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

It is highly recommended that you do not load too many files at the same time, as Foundry might not be able to load all of them.

## Play if

`.playIf(truthy|falsey)` or `.playIf(inBool)` or `.playIf(inFunction)`

Causes the sound not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the sound or sound to play.

Below is an example of a function used in this method, which would cause this sound or sound to only be played about 50% of the time.
```js
.playIf(() => {
	return Math.random() < 0.5;
})
```

## Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the sound from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

## Preset

`.preset("name")`

Applies a preset to the current sound - read the [Sequencer Presets article](presets.md) for more information.

## Duration

`.duration(500)`

Sets the duration of the sound. If the duration is longer than the sound's original duration, it will loop.

## Volume

`.volume(0.5)`

A normalized value between `0.0` and `1.0` which determines the volume of the sound (if any). Defaults to `0.8`.

**Note:** This is affected by each client's volume settings in Foundry, so if you or your users cannot hear the sound, double check your Interface Volume.

## Fade In Audio

`.fadeInAudio(duration, options)`

`.fadeInAudio(500)` or `.fadeInAudio(250, {ease: "easeOutQuint"})` or `.fadeInAudio(400, {ease: "easeOutCirc", delay: 100})`

Causes the audio on the given sound fade in when played.

A second options parameter can set the ease of the fade, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Fade Out Audio

`.fadeOutAudio(duration, options)`

`.fadeOutAudio(500)` or `.fadeOutAudio(250, {ease: "easeOutQuint"})` or `.fadeOutAudio(400, {ease: "easeOutCirc", delay: -100})`

Causes the sound to fade out its audio as it finishes playing.

A second options parameter can set the ease of the fade, and a delay before it ends. E.g. a delay of -500 means the fade will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Start Time

`.startTime(200)`

Sets the start time of the sound.

This causes the sound to skip ahead by an amount of milliseconds.

![End time example image](../images/start_time.jpg)

## Start Time Percentage

`.startTimePerc(0.25)`

Sets the start time of the sound based on a percentage from its total duration.

This also causes the sound to skip ahead, but instead based on the total duration of the sound, which is useful if you don't know the exact duration.

![End time percentage example image](../images/start_perc.jpg)

## End Time

`.endTime(200)`

Sets the ending time of the sound.

This causes the sound to skip ahead by an amount of milliseconds.

![End time example image](../images/end_time.jpg)

## End Time Percentage

`.endTimePerc(0.25)`

Sets the ending time of the sound based on a percentage from its total duration.

This also causes the sound to skip ahead, but instead based on the total duration of the sound, which is useful if you don't know the exact duration.

![End time percentage example image](../images/end_perc.jpg)

## Time Range

`.timeRange(200, 700)`

Sets the start and end time of the section, playing only that range.

Unlike `.endTime()`, the last parameter is the absolute end time, not the time from end of the duration.

![Time range example image](../images/time_range.jpg)

## Locally

`.locally()` or `.locally(bool)`

Causes sound to be played only locally, and not push to other connected clients.

## For Users

`.forUsers(string)` or `.forUsers(array)`

Causes the sound to be played for only a set of users.

Accepts a single user ID or username (case-sensitive), or an array thereof.

## Base folder

`.baseFolder(inPath)`

Defines the base folder that will prepend to the file path. This is mainly just useful to make the file path easier to manage.

## File

```js
.file(inFilePath = string|array<string>)
```

- Filepath: `.file("Audio/Soundly_Assets/Combat/Blade/Miss1.wav")`
- Wildcard filepath: `.file("Audio/NeverWinter_Assets/Effects/Magic/Ice/*.wav")`
- Database Path: `.file("EffectAudioDB.Blade.hit")`

Declares which sound to be played, but you can also do that when first initializing the sound with `.sound("file/path/here.wav")`

This may also be an array of paths, which will be randomly picked from each time the sound is played.

If the path is a filepath, it may also contain a wildcard, which will cause the Sound to pick randomly between matching filepaths.

In addition, if the sound has been registered on the [Sequencer database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database), you can reference database files with a dot-notation like so: `your_module_name.sounds.generic.explosions`

We recommend users and creators alike read the documentation on the [Sequencer database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database).

## Add override

Adds a function that will run at the end of the sound serialization step, but before it is played. Allows direct modifications of sound's data. For example, it could be manipulated to change which file will be used based  on the distance to the target.

```js
.addOverride(async (sound, data) => {
    // Do things here
    return data;
})
```

`sound` is a reference to the sound in itself - interact with this at your own risk.

`data` is the sound's data that is going to be passed to canvas layer.

You _must_ define the function like above and return the data at the end of the function. See examples at the bottom of the [readme](https://github.com/fantasycalendar/FoundryVTT-Sequencer/blob/master/README.md#magic-missile) for more in depth usage.

## Set mustache

`.setMustache(inObj)`

Sets the [Mustache](https://handlebarsjs.com/guide/) of the filepath. This is applied _after_ the randomization of the filepath, if available.

An example would be to provide a path like this to the sound: `Explosion_{{type}}_{{number}}.wav`

By then calling this method and passing an object, Mustache will attempt to fill in `{{type}}` and `{{number}}` with that object. This means we can dynamically generate the string for the path. If you were to pass this into the method:

```js
{
    "type": "Electrical",
    "number": "5"
}
```

The final result would become: `Explosion_Electrical_5.wav`

You can also pass functions that will get evaluated during runtime by Mustache:

```js
{
    "color": () => {
        return ['Fire', 'Electrical', 'Underwater'][Math.floor(Math.random() * 3)] // Pick a random type from this list
    },
    "number": () => {
        return Math.floor(Math.random() * 9) + 1; // Pick between 1 and 9
    }
}
```

## At Location

`.atLocation(object|string, object)`

Examples:
```js
.atLocation(token)
.atLocation({ x: 0, y: 0 })
.atLocation(token)
.atLocation(token, { randomOffset: true })
```

A smart method that can take:
- Reference to a token
- Reference to a template
- Direct coordinate on the canvas

Also supports a second options object that accepts:
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the sound's scene's grid size

## Attach To

`.attachTo(object|string, object)`

Examples:
```js
.attachTo(token)
.attachTo(template)
.attachTo("stored_name")
.attachTo(token, { bindVisibility: false })
```

This method makes the sound attached to an object. If the object cannot have attached sounds, the sound will be created on the canvas.

A smart method that can take:
- Reference to a placeable object (tokens, templates, lights, etc)
- String reference (see [`.name()`](#name))

In addition, a secondary options parameter can be given to this method, which has the following options:

- `bindVisibility: boolean` - (default `true`) - causes the sound to become hidden when the attached object is hidden
- `bindElevation: boolean` - (default `true`) - causes the sound to match the elevation of the attached object


## To Location

`.toLocation(object|string, object)`

Examples:
```js
.toLocation(token)
.toLocation("stored_name")
.toLocation({ x: 0, y: 0 })
.toLocation(token, { cacheLocation: true })
```

Sets the target location of the sound. Used together with [`.atLocation()`](#at-location) to give the sound a direction, which is consumed by [`.panSound()`](#pan-sound) and distance-based volume/effects.

A smart method that can take:
- Reference to a token
- Reference to a template
- Direct coordinate on the canvas
- String reference (see [`.name()`](#name))

Also supports a second options object that accepts:
- `cacheLocation: boolean` (default `false`) - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `randomOffset: number|boolean` (default `false`) - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the sound's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number in `x` and `y` represent the sound's scene's grid size


## Move Towards

`.moveTowards(object|string, object)`

Examples:
```js
.moveTowards(token)
.moveTowards("stored_name")
.moveTowards({ x: 0, y: 0 })
.moveTowards(token, { rotate: false })
```

Causes the sound to move towards the given token, template, coordinates, or string reference (see [`.name()`](#name)). When combined with [`.panSound()`](#pan-sound), the sound's stereo position tracks the moving origin.

Also supports a second options object that accepts:
- `ease: string` (default `"linear"`) - sets the ease of the movement
- `delay: number` (default `0`) - delay in milliseconds before the movement begins
- `cacheLocation: boolean` (default `false`) - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `rotate: boolean` (default `true`) - causes the sound to rotate towards the target

Check out what easings are available here: https://easings.net/


## Move Speed

`.moveSpeed(500)`

Sets the speed (in pixels per frame) at which the sound moves when [`.moveTowards()`](#move-towards) has been called.


## Loop Options

`.loopOptions(inOptions)` or `.loopOptions({ loops: 1 })` or `.loopOptions({ loopDelay: 1000, loops: 5 })`

Allows you to control the number of loops and the delays between each loop.

Accepts an object that can contain
- `loopDelay: number` (default `0`) - adds a delay in milliseconds between each loop of the sound
- `loops: number` (default `0`) - makes the sound only loop this many times before ending
- `endOnLastLoop: boolean` (default `false`) - whether the sound should end when reaching the last loop (if persistent)


## Persist

`.persist()` or `.persist(boolean)` or `.persist(true, { persistTokenPrototype: true })`

Calling this method will cause the sound to become permanent on the canvas. You can end the sound with the [Sound Manager](https://fantasycomputer.works/FoundryVTT-Sequencer/#/sound-manager).

Also supports a second options object that accepts:
- `persistTokenPrototype: boolean` (default `false`) - makes the sound persist on the token's prototype data, useful for active sound-linked VFX


## Extra End Duration

`.extraEndDuration(inNumber)` or `.extraEndDuration(500)`

Only modifies [`.persist()`](#persist)ed sounds. Adds extra time (in milliseconds) before a persisted sound is considered ended after the Sound Manager ends it, so the sound's tail can finish playing instead of being cut off.


## Radius

`.radius(inNumber)`

Examples:
```js
.radius(15)
```

Radius in number of feet (or other units) this sound will be played within. The distance is determined by the scene's Grid Scale.

**Note:** Requires `.atLocation()` to be called as well, or the sound will still be global.


## On Levels

`.onLevels("levelIdOrName")` or `.onLevels([id1, "Name 2", level])` (a level id, level name, or Level document)

Restricts this sound to one or more scene levels on Foundry v14+. On older Foundry versions this is a no-op.

Without calling this method, the sound's level is inferred automatically from its position against the scene's level elevation ranges, and Foundry's surface-collision check attenuates listeners on other levels (matching how Foundry's own ambient sounds behave). Use this method to override that inference, for example to pin a sound to a specific level regardless of where the source token is.

Pass `null` to clear a previously set override.

See the matching [On Levels](./effect.md#on-levels) section in the effect API for the shared level scoping semantic.


## Elevation

`.elevation(N)` or `.elevation(N, { absolute: true })`

Overrides or offsets the sound's Z, which Foundry's positional sound source uses to compute distance attenuation across scene levels.

Options:
- `absolute: boolean` — when `true`, the value is used as-is. When `false` (the default), it's added to the attached source's or location's elevation.

Without this call, the sound's Z comes from the attached placeable (via `bindElevation`) or the location's elevation. Set explicitly when you need the sound to live at a different Z than its visual source — e.g. a sound attached to a token but logically belonging to a different floor.


## Constrained By Walls

`.constrainedByWalls(inBool)`

Examples:
```js
.constrainedByWalls(true)
.constrainedByWalls(false)
```

Whether the sound will be **completely** blocked by walls.

**Notes:**
- Defaults to `false`
- Requires `.atLocation()` to be called as well, or the sound will still be global.
- If set to `true`, `.muffledEffect()` (see below) will have no effect


## Distance Easing

`.distanceEasing(inBool)`

Examples:
```js
.distanceEasing(true)
.distanceEasing(false)
```

Whether the sound will have its volume eased by the distance from its origin.

**Notes:**
- Defaults to `true`
- Requires `.atLocation()` to be called as well, or the sound will still be global.

## Audio Channel

`.audioChannel(inString)`

Examples:
```js
.audioChannel("music")
.audioChannel("environment")
```

Set the sound output channel.

**Notes:**
- Defaults to `interface`


## Always for GMs

`.alwaysForGMs(inBool)`

Examples:
```js
.alwaysForGMs(true)
.alwaysForGMs(false)
```

Whether the sound will play for GMs as if they were hearing it at the origin of the sound.

**Notes:**
- Defaults to `false`
- Requires `.atLocation()` to be called as well, or the sound will still be global.


## Global Sound

`.globalSound()` or `.globalSound(inBool)`

Examples:
```js
.globalSound()
.globalSound(true)
.globalSound(false)
```

Forces the sound to be heard globally, bypassing `.atLocation()`, `.radius()`, walls, and distance easing. Useful when a sound was set up positionally but you want a specific repetition or override to play globally instead.

**Notes:**
- Defaults to `false`


## Pan Sound

`.panSound()` or `.panSound(inBool, options)`

Examples:
```js
.panSound()
.panSound(true)
.panSound(true, { innerEaseDistance: 200, outerEaseDistance: 1000 })
```

Causes the sound to pan stereo (left/right) based on the position of the sound relative to the listener. Combine with [`.atLocation()`](#at-location) and [`.toLocation()`](#to-location) (or [`.moveTowards()`](#move-towards)) to give the sound a meaningful direction.

The options object accepts:
- `innerEaseDistance: number` (default `0`) - distance (in pixels) within which the pan is at full strength
- `outerEaseDistance: number` (default `0`) - distance (in pixels) beyond which the pan stops easing; must be greater than `innerEaseDistance` when both are non-zero


## Base Effect

`.baseEffect(options)`

Examples:
```js
.baseEffect({ type: "lowpass", intensity: 4 })
```

An effect to be applied on the sound when it is heard as per normal, with no walls blocking the sound.

The options object this method accept can have the following two parameters:
- `type`: one of the effects in `CONFIG.soundEffects`:
  - `lowpass`
  - `highpass`
  - `reverb`
- `intensity`: how strong this type of effect will be

**Notes:**
- Requires `.atLocation()` to be called as well, as this is an effect only applicable to position-based sounds.


## Muffled Effect

`.muffledEffect(options)`

Examples:
```js
.muffledEffect({ type: "lowpass", intensity: 4 })
```

An effect to be applied on the sound when it is heard through a wall.

The options object this method accept can have the following two parameters:
- `type`: one of the effects in `CONFIG.soundEffects`:
  - `lowpass`
  - `highpass`
  - `reverb`
- `intensity`: how strong this type of effect will be

**Notes:**
- Requires `.atLocation()` to be called as well, as this is an effect only applicable to position-based sounds.
- Requires `.constrainedByWalls()` to be set to `false` (which is the default behavior).


## Name

`.name(inString)`

Causes the sound's position to be stored under the given name, which can then be referenced by later sections (effects or sounds) via [`.atLocation()`](#at-location), [`.toLocation()`](#to-location), [`.attachTo()`](#attach-to), or [`.moveTowards()`](#move-towards) by passing the name as a string.


## Origin

`.origin(inString)` or `.origin(document)`

Takes a UUID string, or a Foundry Document that contains a UUID.

Used for adding extra information to a sound, such as the originating item's UUID. Persistent sounds can later be looked up or ended by their origin via the [Sound Manager](https://fantasycomputer.works/FoundryVTT-Sequencer/#/sound-manager).
