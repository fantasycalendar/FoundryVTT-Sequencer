# Table of Contents 
## - Core Methods -
- [Wait Until Finished](DOCS.md#wait-until-finished)
- [Async](DOCS.md#async)
- [Repeats](DOCS.md#repeats)
- [Play if](DOCS.md#play-if)
- [Delay](DOCS.md#delay)
- [Fade in](DOCS.md#fade-in)
- [Fade out](DOCS.md#fade-out)
- [Duration](DOCS.md#duration)
- [Opacity](DOCS.md#opacity)

## - Effect Methods -
- [Base folder](#base-folder)
- [File](#file)
- [At location](#at-location)
- [Rotate Towards](#rotate-towards)
- [Reach Towards](#reach-towards)
- [Move Towards](#move-towards)
- [Move Speed](#move-speed)
- [Name](#name)
- [Missed](#missed)
- [Add override](#add-override)
- [JB2A](#jb2a)
- [Start point](#start-point)
- [End point](#end-point)
- [Set mustache](#set-mustache)
- [Grid Size](#grid-size)
- [Scale](#scale)
- [Scale In](#scale-in)
- [Scale Out](#scale-out)
- [Anchor](#anchor)
- [Center](#center)
- [Rotation](#rotation)
- [Random rotation](#random-rotation)
- [Mirror](#mirror)
- [Randomize mirror](#randomize-mirror)
- [Rotate](#rotate)
- [Rotate In](#rotate-in)
- [Rotate Out](#rotate-out)
- [Playback rate](#playback-rate)
- [Below tokens](#below-tokens)
- [Below tiles](#below-tiles)
- [Z-Index](#z-index)

## Effect Methods

### Base folder

`.baseFolder(inPath)`

Defines the base folder that will prepend to the file path. This is mainly just useful to make the file path easier to manage.

### File

`.file(string)` or `.file(array)`

Declares which .webm to be played, but you can also do that when first initializing the effect.

This may also be an array of paths, which will be randomly picked from each time the effect is played.

### At location

`.atLocation(token)` or`.atLocation(template)` or`.atLocation("stored_name")` or `.atLocation({ x: 0, y: 0 })`

A smart method that can take:
- Reference to a token
- Reference to a template
- Direct coordinate on the canvas
- String reference (see [Name](#name))

### Rotate Towards

`.rotateTowards(token)` or`.rotateTowards(template)` or`.rotateTowards("stored_name")` or `.rotateTowards({ x: 0, y: 0 })`

Causes the effect to be rotated towards the given token, template, coordinates, or a string reference (see [Name](#name)). This is useful if you want to play an effect on a token facing another token, like an explosion or a magical effect.

### Reach Towards

`.reachTowards(token)` or`.reachTowards(template)` or`.reachTowards("stored_name")` or `.reachTowards({ x: 0, y: 0 })`

Causes the effect to be rotated **and stretched** towards the given token, template, coordinates, or a string reference (see [Name](#name)). This effectively calculates the proper X scale for the effect to reach the target.

### Move Towards

`.moveTowards(target, options = {ease: "linear"})`

`.moveTowards(token)` or`.moveTowards(template)` or`.moveTowards("stored_name")` or `.moveTowards({ x: 0, y: 0 })`

Causes the effect to move towards the given token, template, coordinates, or a string reference (see [Name](#name)).

Check out what easings are available here: https://easings.net/

### Move speed

`.moveSpeed(500)`

Sets the speed of the effect if `.moveTowards()` has been called


### Name

`.name(inString)`

Causes the effect's position to be stored and can then be used  with `.atLocation()`, `.reachTowards()`, `.rotateTowards()`, and `.moveTowards()` to refer to previous effects' locations

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

You _must_ define the function like above and return the data at the end of the function. See examples at the bottom of the [readme](../README.md#magic-missile) for more in depth usage.

### JB2A

`.JB2A()`

Sets the start point and end point to best work JB2A's effect sprites. This depends on the type of the effect, which the Sequencer figures out from the path.

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

### Scale In

`.scaleIn(scale, duration, options = {ease: "linear", delay: 0})`

`.scaleIn(0.5, 250)` or `.scaleIn({ x: 0.5, y: 0.2 }, 500)` or `.scaleIn(0, 500, {ease: "easeOutCubic"})`

Causes the effect to scale in when it starts playing

Check out what easings are available here: https://easings.net/

### Scale Out

`.scaleIn(scale, duration, options = {ease: "linear"})`

`.scaleIn(0.5, 250)` or `.scaleIn({ x: 0.5, y: 0.2 }, 500)` or `.scaleIn(0, 500, {ease: "easeOutCubic"})`

Causes the effect to scale out when it finishes playing

Check out what easings are available here: https://easings.net/

### Anchor

`.anchor({ x: 0.5, y: 0.5 })` or `.anchor(0.5)`

Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number.

### Center

`.center()`

Centers the sprite on the given location, effectively giving it an anchor of `{x: 0.5, y: 0.5}`.

**Note:** If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the location the sprite is played at.

### Rotation

`.rotation(-90)`

Sets the rotation of the effect, which is added on top of the calculated rotation after `.rotateTowards()` or `.randomRotation()`.

### Random rotation

`.randomRotation()`

Causes the sprite to have a random rotation, which means it should **not** be used with `.reachTowards()`.

### Mirror

`.mirrorX()` or `.mirrorX(bool)`

`.mirrorY()` or `.mirrorY(bool)`

Causes the sprite to have a flipped X or Y scale. You can also pass a boolean to set whether it should be mirrored.

This is applied at the end of all the other scaling effects, including `.reachTowards()` and `.scale()`.

### Randomize mirror

`.randomizeMirrorX()`

`.randomizeMirrorY()`

Causes the sprite to have a randomized flipped X or Y scale (if the scale on that axis was 1, it can become 1 or -1, effectively mirroring the sprite).

This is applied at the end of all the other scaling effects, including `.reachTowards()` and `.scale()`.

### Rotate

`.rotate(90)`

Sets the rotation of the effect, which is added on top of the calculated rotation after `.rotateTowards()` or `.randomRotation()`

### Rotate In

`.rotateIn(degrees, duration, options = {ease: "linear", delay: 0})`

`.rotateIn(0.5, 250)` or `.rotateIn({ x: 0.5, y: 0.2 }, 500)` or `.rotateIn(0, 500, {ease: "easeOutCubic"})`

Causes the effect to rotate when it starts playing

Check out what easings are available here: https://easings.net/

### Rotate Out

`.rotateOut(degrees, duration, options = {ease: "linear"})`

`.rotateOut(0.5, 250)` or `.rotateOut({ x: 0.5, y: 0.2 }, 500)` or `.rotateOut(0, 500, {ease: "easeOutCubic"})`

Causes the effect to rotate when it finishes playing

Check out what easings are available here: https://easings.net/

### Playback Rate

`.playbackRate(2)` or `.playbackRate(0.5)`

Sets the effect's playback rate. A playback rate of 2 would make it play 2x as fast, 0.5 would make it play half as fast.

### Below tokens

`.belowTokens()` or `.belowTokens(bool)`

Causes the effect to be played below tokens - you can pass a boolean whether it should be applied or not.

### Below tiles

`.belowTiles()` or `.belowTiles(bool)`

Causes the effect to be played below tiles - you can pass a boolean whether it should be applied or not.

### Z-Index

`.zIndex(1)`

Sets the z-index of the effect, potentially displaying it on top of or below other effects

**Note:** If you have called `.belowTokens()` or `.belowTiles()`, the effect is placed on an entirely different layer, with its own z-index and will be sorted within that layer.