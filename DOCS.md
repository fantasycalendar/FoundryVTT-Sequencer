## Table of Contents

### - Core Methods -
- [Then](#then)
- [Macro](#macro)
- [Wait](#wait)
- [Effect](#effect)
- [Sound](#sound)

### - Generic Functions (effects & sounds) -
- [Wait Until Finished](#wait-until-finished)
- [Async](#async)
- [Repeats](#repeats)
- [Play if](#play-if)
- [Delay](#delay)

### - Effect Methods -
- [Base folder](#base-folder)
- [File](#file)
- [At location](#at-location)
- [Rotate Towards](#rotate-towards)
- [Reach Towards](#reach-towards)
- [Move Towards](#move-towards)
- [Missed](#missed)
- [Add override](#add-override)
- [JB2A](#jb2a)
- [Start point](#start-point)
- [End point](#end-point)
- [Set mustache](#set-mustache)
- [Grid Scale](#grid-scale)
- [Scale](#scale)
- [Anchor](#anchor)
- [Center](#center)
- [Random rotation](#random-rotation)
- [Randomize mirror](#randomize-mirror)
- [Fade in](#fade-in)
- [Fade out](#fade-out)
- [Move speed](#move-speed)
- [Playback rate](#playback-rate)
- [Below tokens](#below-tokens)

### - Sound Methods -
- [File](#file)
- [Volume](#volume)

## Core Methods

### Then

`.then(() => {})`

Creates a section that will run a function. Remember that if you want your function to be asynchronous, and you want it to properly wait, you'll want to make the above:

`.then(async () => {})`

In addition, if you want your function to finish before the next section is executed, you'll need to pass `true` as the last argument in the method call, like so:

`.then(async () => {}, true)`

### Macro

`.macro("MacroName")` or `.macro(macroReference)`

Creates a section that will run a macro based on a name or a direct reference to a macro. If the macro is not found, Sequencer will complain. Loudly.

Similar to `.then()`, it's expected that you pass a boolean as a second parameter if you wish the Sequencer to wait for the macro to finish.

`.macro("New Macro", true)`

### Wait

`.wait(1000)` or `.wait(500, 1000)`

Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given a second number, a random wait time between the two given numbers will be generated.

### Effect

`.effect()` or `.effect(inFile)`

Creates an effect section. Until you call `.then()`, `.effect()`, `.sound()`, or `.wait()`, you'll be working on the Effect section.

### Sound

`.sound()` or `.sound(inFile)`

Creates a sound section. Until you call `.then()`, `.effect()`, `.sound()`, or `.wait()`, you'll be working on the Sound section.

## Generic Methods

These methods can be called on any `.then` functions, effects, sounds, and macros.

### Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(true)`

Calling this method will cause the section to finish running before starting the next section.

You can also pass `true` to it for greater readability, but simply calling it will do.

### Async

`.async()` or `.async(true)`

Calling this will make each effect or sound will finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition, whilst `.waitUntilFinished()` is for the entire section.

You can also pass `true` to it for greater readability, but simply calling it will do.

### Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the effect or sound to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

It is highly recommended that you do not load too many files at the same time, as Foundry might not be able to load all of them.

### Play if

`.playIf(inBool)` or `.playIf(inFunction)`

Causes the effect or sound to not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the effect or sound to play.

Below is an example of a function used in this method, which would cause this effect or sound to only be played about 50% of the time.
```js
.playIf(() => {
    return Math.random() < 0.5;
})
```

### Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the effect or sound from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.


## Effect Methods

### Base folder

`.baseFolder(inPath)`

Defines the base folder that will prepend to the file path. This is mainly just useful to make the file path easier to manage.

### File

`.file(inPath)` or `.file(inArray)`

Declares which .webm to be played, but you can also do that when first initializing the effect.

This may also be an array of paths, which will be randomly picked from each time the effect is played.

### At location

`.atLocation(token)` or`.atLocation(template)` or`.atLocation("stored_name")` or `.atLocation({ x: 0, y: 0 })`

A smart method that can take:
- Reference to a token
- Reference to a template
- Direct coordinate on the canvas
- String reference, see `.name()`

### Rotate Towards

`.rotateTowards(token)` or`.rotateTowards(template)` or`.rotateTowards("stored_name")` or `.rotateTowards({ x: 0, y: 0 })`

Causes the effect to be rotated towards the given token, template, coordinates, or a string reference, see `.name()`. This is useful if you want to play an effect on a token facing another token, like an explosion or a magical effect.

### Reach Towards

`.reachTowards(token)` or`.reachTowards(template)` or`.reachTowards("stored_name")` or `.reachTowards({ x: 0, y: 0 })`

Causes the effect to be rotated **and stretched** towards the given token, template, coordinates, or a string reference, see `.name()`. This effectively calculates the proper X scale for the effect to reach the target.

### Move Towards

`.moveTowards(token)` or`.moveTowards(template)` or`.moveTowards("stored_name")` or `.moveTowards({ x: 0, y: 0 })`

Causes the effect to move towards the given token, template, coordinates, or a string reference, see `.name()`.

### Missed

`.missed()` or `.missed(inBool)`

Calling this method will cause the effect to target a location close to the given location, but not on it. You can also pass `true` to it for greater readability, but simply calling it will do.

If a location has been picked with `.atLocation()`, a random spot around that will be picked. If both `.atLocation()` and either of `.reachTowards()` or `.rotateTowards` a random location on the latter will be generated.

### Add override

Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct modifications of effect's data. For example, it could be manipulated to change which file will be used based  on the distance to the target.

```js
.addOverride(async (effect, data) => {
    // Do things here
    return data;
})
```

`effect` is a reference to the effect in itself - interact with this at your own risk.

`data` is the effect's data that is going to be passed to canvas layer.

You _must_ define the function like above and return the data at the end of the function. See examples at the bottom of the [readme](README.md#magic-missile) for more in depth usage.

### JB2A

`.JB2A()` or `.JB2A(bool)`

Sets the start point and end point (see below) to best work JB2A's effect sprites.

Effectively sets start point and end point to 200, and grid scale to 100.

### Start point

`.startPoint(inNumber)`

Defines the start point within the given sprite, starting from the left of the sprite.

An example would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the 'anchor point'.

### End point

`.endPoint(inNumber)`

The same as the start point, except from the right and how many pixels to offset the target from.

### Set mustache

`.setMustache(inObj)`

Sets the [Mustache](https://handlebarsjs.com/guide/) of the filepath. This is applied _after_ the randomization of the filepath, if available.

An example would be to provide a path like this to the Effect: `MagicMissile_01_Regular_{{color}}_30ft_0{{number}}_1600x400.webm`

By then calling this method and passing an object, Mustache will attempt to fill in `{{color}}` and `{{number}}` with that object. This means we can dynamically generate the string for the path. If you were to pass this into the method:

```js
{
    "color": "Blue",
    "number": "5"
}
```

The final result would become: `MagicMissile_01_Regular_Blue_30ft_05_1600x400.webm`

You can also pass functions that will get evaluated during runtime by Mustache:

```js
{
    "color": () => {
        return ['Blue', 'Green', 'Purple', 'Yellow'][Math.floor(Math.random() * 4)]
    },
    "number": () => {
        return Math.floor(Math.random() * 9) + 1;
    }
}
```

This would result in a random color, and a random number between 1 and 9, so any of these:
* `MagicMissile_01_Regular_Blue_30ft_01_1600x400.webm`
* `MagicMissile_01_Regular_Green_30ft_08_1600x400.webm`
* `MagicMissile_01_Regular_Yellow_30ft_02_1600x400.webm`
* `MagicMissile_01_Regular_Purple_30ft_04_1600x400.webm`
* ...and so on

### Grid size

`.gridSize(100)`

Sets the grid size of the file loaded in the Effect. Some files have an internal grid (like JB2A uses 100px grids), so this will make the effect scale up or down to match the active scene's grid size.

### Scale

`.scale(0.5)` or `.scale({ x: 0.5, y: 1.0 })` or `.scale(0.2, 0.6)`

A method that can take the following:
- A number to set the scale uniformly
- An object with x and y for non-uniform scaling
- Two numbers which the Sequencer will randomly pick a uniform scale between

### Anchor

`.anchor({ x: 0.5, y: 0.5 })` or `.anchor(0.5)`

Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number.

### Center

`.center()`

Centers the sprite on the given location, effectively giving it an anchor of `{x: 0.5, y: 0.5}`.

**Note:** If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the location the sprite is played at.

### Random rotation

`.randomRotation()` or `.randomRotation(inBool)`

Causes the sprite to have a random rotation, which means it should **not** be used with `.reachTowards()`.

### Randomize mirror

`.randomizeMirrorX()` or `.randomizeMirrorX(inBool)`

`.randomizeMirrorY()` or `.randomizeMirrorY(inBool)`

Causes the sprite to have a randomized flipped X or Y scale (if the scale on that axis was 1, it can become 1 or -1, effectively mirroring the sprite).

This is applied at the end of all the other scaling effects, including `.reachTowards()` and `.scale()`.

### Fade in

`.fadeIn(500)`

Causes the effect to fade in when played

### Fade out

`.fadeOut(500)`

Causes the effect to fade out at the end of the effect's duration

### Move speed

`.moveSpeed(500)`

Sets the speed of the effect if `.moveTowards()` has been called

### Playback Rate

`.playbackRate(2)` or `.playbackRate(0.5)`

Sets the effect's playback rate. A playback rate of 2 would make it play 2x as fast, 0.5 would make it play half as fast.

### Below tokens

`.belowTokens()` or `.belowTokens(true)`

Sets whether the effect should be played below tokens

## Sound methods

### File

`.file(inPath)` or `.file(inArray)`

This declares which sound to be played, but you can also do that when first initializing the sound.

This may also be an array of paths, which will be randomly picked from each time the effect is played.

### Volume

`.volume(inFloat)`

A normalized value between `0.0` and `1.0` which determines the volume of the sound. Defaults to `0.8`.
