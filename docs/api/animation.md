# Animation

### What is this?

This part of the Sequencer acts **on** objects in the scene, such as tokens, tiles, etc, and it can do things like moving tokens, teleporting them, hiding them, fading them out, etc.

### How do I use this?

When creating an animation section, you can assemble these methods like this:
```js
new Sequence()
    .animation()
        .on(token)
        .fadeIn(500)
        .teleportTo({ x: 100, y: 0 })
    .play()
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the section to finish running before starting the next section.

Passing a number as a parameter will cause the effect or sound to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the animation.

Passing a second number will randomize the wait duration between the two given numbers.

## Async

`.async()`

Calling this will make each part of a section finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition (see `.repeats()` below), whilst `.waitUntilFinished()` is for the entire section.

## Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the effect or sound to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

It is highly recommended that you do not load too many files at the same time, as Foundry might not be able to load all of them.

## Play if

`.playIf(truthy|falsey)` or `.playIf(inBool)` or `.playIf(inFunction)`

Causes the section not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the effect or sound to play.

Below is an example of a function used in this method, which would cause this effect or sound to only be played about 50% of the time.
```js
.playIf(() => {
	return Math.random() < 0.5;
})
```

## Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the section from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

## Preset

`.preset("name")`

Applies a preset to the current animation - read the [Sequencer Presets article](docs/presets.md) for more information.

## Opacity

`.opacity(0.5)`

Sets the opacity of the animation target. If used with `.fadeIn()` and/or `.fadeOut()`, this defines what it will fade to/from.

## Fade in

`.fadeIn(duration, options)`

`.fadeIn(500)` or `.fadeIn(250, {ease: "easeOutQuint"})` or `.fadeIn(400, {ease: "easeOutCirc", delay: 100})`

Causes the animation target to fade in its opacity/alpha when played.

A second options parameter can set the ease of the fade, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Fade out

`.fadeOut(duration, options)`

`.fadeOut(500)` or `.fadeOut(250, {ease: "easeOutQuint"})` or `.fadeOut(400, {ease: "easeOutCirc", delay: -100})`

Causes the animation target to fade out its opacity/alpha when it has finished playing.

A second options parameter can set the ease of the fade, and a delay before it ends. E.g. a delay of -500 means the fade will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Duration

`.duration(500)`

Sets the duration of the animation, which determines how long the animation will take to complete.

## Volume

`.volume(0.5)`

A normalized value between `0.0` and `1.0` which determines the volume of the sound. Defaults to `0.0`.

**Note:** This is affected by each client's volume settings in Foundry, so if you or your users cannot hear the sound, double check your Interface Volume.

## Fade In Audio

`.fadeInAudio(duration, options)`

`.fadeInAudio(500)` or `.fadeInAudio(250, {ease: "easeOutQuint"})` or `.fadeInAudio(400, {ease: "easeOutCirc", delay: 100})`

Causes the audio on the given section fade in when played.

A second options parameter can set the ease of the fade, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Fade Out Audio

`.fadeOutAudio(duration, options)`

`.fadeOutAudio(500)` or `.fadeOutAudio(250, {ease: "easeOutQuint"})` or `.fadeOutAudio(400, {ease: "easeOutCirc", delay: -100})`

Causes the section to fade out its audio as it finishes playing.

A second options parameter can set the ease of the fade, and a delay before it ends. E.g. a delay of -500 means the fade will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## On

`.on(inToken)` or `.on(inTile)`

Sets the target object to be animated. Accepts a token or a tile.

## Move Towards

`.moveTowards(target, options)`

`.moveTowards(inToken)` or `.moveTowards(inTile)` or `.moveTowards({ x: 0, y: 0 })`

Sets the location to move the target object to over the course of the duration.

If no duration has been set, the target object will move towards the location at the default foundry speed.

A second options parameter can set the ease of the rotation, the delay before it starts, and whether the object should be centered on the given location.

Default parameters: `{ ease: "linear", delay: 0, relativeToCenter: false }`

Check out what easings are available here: https://easings.net/

## Move Speed

`.moveSpeed(500)`

Sets the speed of the animation if `.moveTowards()` has been called

## Rotate Towards

`.rotateTowards(target, options)`

`.rotateTowards(inToken)` or `.rotateTowards(inTile)` or `.rotateTowards({ x: 0, y: 0 })`

Causes the target object to rotate towards a given target.

A second options parameter can set the duration of the rotation (0 is instant), the ease, the delay before it starts, and any given offset.

Default parameters: `{ duration: 0, ease: "linear", delay: 0, offset: 0 }`

Check out what easings are available here: https://easings.net/

## Teleport To

`.teleportTo(target, options)`

`.teleportTo(inToken)` or `.teleportTo(inTile)` or `.teleportTo({ x: 0, y: 0 })`

Sets the location to teleport the target object to.

A second options parameter can set the delay before it starts, as well as if the object should be centered on the given location.

Default parameters: `{ delay: 0, relativeToCenter: false }`

## Offset

`.offset({ x: 0, y: 0 })`

Causes the movement or teleportation to be offset in the X and/or Y axis

## Closest Square

`.closestSquare()` or `.closestSquare(boolean)`

Causes the movement or teleportation to pick the closest non-intersecting square as the target location

## Snap to Grid

`.snapToGrid()` or `.snapToGrid(boolean)`

Causes the final location to be snapped to the grid

## Rotate

`.rotate(90)`

Sets the rotation of the animation, which is added on top of the calculated rotation after `.rotateTowards()`

## Rotate In

`.rotateIn(degrees, duration, options)`

`.rotateIn(90, 250)` or `.rotateIn(-90, 500, {ease: "easeOutCubic"})` or `.rotateIn(-90, 500, {ease: "easeOutCubic", delay: 100})`

Causes the target object to rotate when it starts playing.

The first parameter is the degrees from which to start the rotation.

The second parameter is how many milliseconds the rotation will take.

A third options parameter can set the ease of the rotation, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Rotate Out

`.rotateOut(degrees, duration, options)`

`.rotateOut(90, 250)` or `.rotateOut(-90, 500, {ease: "easeOutCubic"})` or `.rotateOut(-90, 500, {ease: "easeOutCubic", delay: -100})`

Causes the target object to rotate when it finishes playing.

The first parameter is how many degrees the animation will do.

The second parameter is how many milliseconds the rotation will take.

A third options parameter can set the ease of the rotation, and a delay before it ends. E.g. a delay of -500 means the rotation will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Tint

`.tint()` or `.tint(hexadecimal)` or `.tint(decimal)`

Examples:
- `.tint("#FF0000")` - Red tint
- `.tint(0x0000FF)` - Blue tint

This method tints the token or tile with the given color. Supplying no parameter will reset the tint to nothing.

## Hide

`.hide()` or `.hide(boolean)`

Causes the animated object to be hidden (or visible, if the parameter passed to it is `false`)

## Show

`.show()` or `.show(boolean)`

Causes the animated object to be visible (or hidden, if the parameter passed to it is `false`)


