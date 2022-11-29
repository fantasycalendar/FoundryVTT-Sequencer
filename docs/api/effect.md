# Effects

### What is this?

This part of the Sequencer allows you to easily play visual effects on the canvas, such as animated .gifs, .webms, and other static images as moving effects and projectiles.

### How do I use this?

When creating an effect section, you can assemble these methods like this:
```js
new Sequence()
    .effect()
        .atLocation(token)
        .file("modules/jb2a_patreon/Library/Generic/Healing/HealingAbility_01_Blue_200x200.webm")
        .fadeIn(500)
        .fadeOut(500)
    .play()
```
or an effect that uses a [Sequencer Database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database) path:
```js
new Sequence()
    .effect()
        .atLocation(token)
        .stretchTo(target)
        .file("jb2a.fire_bolt.orange")
    .play()
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the effect to finish running before starting the next section.

Passing a number as a parameter will cause the effect or sound to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the effect.

Passing a second number will randomize the wait duration between the two given numbers.

## Async

`.async()`

Calling this will make each part of the effect finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition (see `.repeats()` below), whilst `.waitUntilFinished()` is for the entire effect.

## Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the effect or sound to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

It is highly recommended that you do not load too many files at the same time, as Foundry might not be able to load all of them.

## Play if

`.playIf(boolean)` or `.playIf(inFunction)`

Causes the effect not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the effect or sound to play.

Below is an example of a function used in this method, which would cause this effect or sound to only be played about 50% of the time.
```js
.playIf(() => {
    return Math.random() < 0.5;
})
```

## Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the effect from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

## Opacity

`.opacity(0.5)`

Sets the opacity of the effect. If used with `.fadeIn()` and/or `.fadeOut()`, this defines what it will fade to/from.

## Fade in

`.fadeIn(duration, options)`

`.fadeIn(500)` or `.fadeIn(250, {ease: "easeOutQuint"})` or `.fadeIn(400, {ease: "easeOutCirc", delay: 100})`

Causes the effect to fade in its opacity/alpha when played.

A second options parameter can set the ease of the fade, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Fade out

`.fadeOut(duration, options)`

`.fadeOut(500)` or `.fadeOut(250, {ease: "easeOutQuint"})` or `.fadeOut(400, {ease: "easeOutCirc", delay: -100})`

Causes the effect to fade out its opacity/alpha when it has finished playing.

A second options parameter can set the ease of the fade, and a delay before it ends. E.g. a delay of -500 means the fade will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Duration

`.duration(500)`

Sets the duration of the effect. If the duration is longer than the effect's original duration, it will loop.

## Start Time

`.startTime(200)`

Sets the start time of the effect.

This causes the effect to skip ahead by an amount of milliseconds.

![End time example image](../images/start_time.jpg)

## Start Time Percentage

`.startTimePerc(0.25)`

Sets the start time of the effect based on a percentage from its total duration.

This also causes the effect to skip ahead, but instead based on the total duration of the effect, which is useful if you don't know the exact duration.

![End time percentage example image](../images/start_perc.jpg)

## End Time

`.endTime(200)`

Sets the ending time of the effect.

This causes the effect to skip ahead by an amount of milliseconds.

![End time example image](../images/end_time.jpg)

## End Time Percentage

`.endTimePerc(0.25)`

Sets the ending time of the effect based on a percentage from its total duration.

This also causes the effect to skip ahead, but instead based on the total duration of the effect, which is useful if you don't know the exact duration.

![End time percentage example image](../images/end_perc.jpg)

## Time Range

`.timeRange(200, 700)`

Sets the start and end time of the section, playing only that range.

Unlike `.endTime()`, the last parameter is the absolute end time, not the time from end of the duration.

![Time range example image](../images/time_range.jpg)

## Locally

`.locally()` or `.locally(bool)`

Causes effect to be played only locally, and not push to other connected clients.

## For Users

`.forUsers(string)` or `.forUsers(array)`

Causes the effect to be played for only a set of users.

Accepts a single user ID or username (case-sensitive), or an array thereof.

## Base folder

`.baseFolder(inPath)`

Defines the base folder that will prepend to the file path. This is mainly just useful to make the file path easier to manage.

## File

```js
.file(inFilePath = string|array<string>, softFail = boolean)
```

- Filepath: `.file("modules/jb2a_patreon/Library/1st_Level/Detect_Magic/DetectMagicCircle_01_Regular_Blue_1200x1200.webm")`
- Wildcard filepath: `.file("modules/jb2a_patreon/Library/Generic/Portals/Portal_Bright_*.webm")`
- Database Path: `.file("jb2a.detect_magic.circle.blue")`

Declares which .webm to be played, but you can also do that when first initializing the effect.

This may also be an array of paths, which will be randomly picked from each time the effect is played.

If the path is a filepath, it may also contain a wildcard, which will cause the Effect to pick randomly between matching filepaths.

In addition, if the effect has been registered on the [Sequencer database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database), you can reference database files with a dot-notation like so: `your_module_name.effects.generic.explosions`

If there are multiple files in the database with `.xxft` in their database paths, you can omit the `.xxft` from the path, and Sequencer will pick the best effect needed for the situation. This is described in better detail in the documentation below.

We recommend users and creators alike read the documentation on the [Sequencer database](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database).

Lastly, you may pass a range-finding type object to the file method:
```js
.file({
    "05ft": "modules/jb2a_patreon/Library/1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_05ft_600x400.webm",
    "15ft": "modules/jb2a_patreon/Library/1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_15ft_1000x400.webm",
    "30ft": "modules/jb2a_patreon/Library/1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_30ft_1600x400.webm",
    "60ft": "modules/jb2a_patreon/Library/1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_60ft_2800x400.webm",
    "90ft": "modules/jb2a_patreon/Library/1st_Level/Witch_Bolt/WitchBolt_01_Regular_Blue_90ft_4000x400.webm"
})
```

Sequencer will pick the best file to play for the given distance between the source and the target (if any). These are the only supported ranges at this moment.

## From

`.from(token|tile, object)`

Examples:
```js
.from(token)
.from(tile)
.from(token, { cacheLocation: true })
.from(token, { randomOffset: true })
```

Create an effect based on the given object, effectively copying the object as an effect. Useful when you want to do some effect magic on tokens or tiles. When used with a token or a tile, the effect will be placed at the exact same place as the object.

Also supports a second options object that accepts:
- `cacheLocation: boolean` - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## At Location

`.atLocation(object|string, object)`

Examples:
```js
.atLocation(token)
.atLocation("stored_name")
.atLocation({ x: 0, y: 0 })
.atLocation(token, { cacheLocation: true })
.atLocation(token, { randomOffset: true })
```

A smart method that can take:
- Reference to a token
- Reference to a template
- Direct coordinate on the canvas
- String reference (see [`.name()`](#name))

Also supports a second options object that accepts:
- `cacheLocation: boolean` - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## Attach To

`.attachTo(object|string, object)`

Examples:
```js
.attachTo(token)
.attachTo(template)
.attachTo("stored_name")
.attachTo(token, { align: "top-right", edge: "outer" })
.attachTo(token, { bindVisibility: false, randomOffset: true })
```

This method makes the effect attached to an object. If the object cannot have attached effects, the effect will be created on the canvas.

A smart method that can take:
- Reference to a placeable object (tokens, templates, lights, etc)
- String reference (see [`.name()`](#name))

In addition, a secondary options parameter can be given to this method, which has the following options:

- `align: string` (default `center`) - This causes the attached effect to snap to a given coordinate on the target, which can be one of the following:
  - top-left, top, top-right, left, center, right, bottom-left, bottom, bottom-right
- `edge: string` (default `on`) - Together with the `align` option, this causes the effect to snap to the inner, outer, or on the edge of the object. Valid options are:
  - inner, on, outer
- `bindVisibility: boolean` - (default `true`) - causes the effect to become hidden when the attached object is hidden
- `bindAlpha: boolean` (default `true`) - causes the effect to share the same alpha as the attached object (not the same as above, hidden is on/off, alpha is a sliding scale of visibility)
- `followRotation: boolean` (default `true`) - causes the effect to also rotate with the attached object
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## Rotate Towards

`.rotateTowards(object|string, object)`

Examples:
```js
.rotateTowards(token)
.rotateTowards("stored_name")
.rotateTowards({ x: 0, y: 0 })
.rotateTowards(token, { attachTo: true })
.rotateTowards(token, { rotationOffset: 90, cacheLocation: true })
```

Causes the effect to be rotated towards the given token, template, coordinates, or a string reference (see [`.name()`](#name)). This is useful if you want to play an effect on a token facing another token, like an explosion or a magical effect.

Also supports a second options object that accepts:
- `cacheLocation: boolean` (default `false`) - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `attachTo: boolean` (default `false`) - causes the effect to be attached to the target (combine with [`.attachTo()`](#attachTo) for two-way bindings!)
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `rotationOffset: number` - causes the rotation itself to be offset by a certain amount of degrees
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## Stretch To

`.stretchTo(object|string, object)`

Examples:
```js
.stretchTo(token)
.stretchTo("stored_name")
.stretchTo({ x: 0, y: 0 })
.stretchTo(token, { tiling: true })
.stretchTo(token, { onlyX: 90, cacheLocation: true })
```

Causes the effect to be rotated and stretched towards the given token, template, coordinates, or a string reference (see [`.name()`](#name)). This effectively calculates the proper X scale for the effect to stretch to the target.

Also supports a second options object that accepts:
- `cacheLocation: boolean` (default `false`) - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `attachTo: boolean` (default `false`) - causes the effect to be attached to the target (combine with [`.attachTo()`](#attachTo) for two-way bindings!)
- `onlyX: boolean` (default `false`) - causes the effect to only stretch the X axis of the sprite towards the target (keeping Y at 1.0, or your given scale)
- `tiling: boolean` (default `false`) - causes the effect to tile its texture in the X axis of the effect. Combine with `attachTo` above to create the appearance of a rope binding two tokens together.
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## Move Towards

`.moveTowards(object, object)`

Examples:
```js
.moveTowards(token)
.moveTowards("stored_name")
.moveTowards({ x: 0, y: 0 })
.moveTowards(token, { rotate: false })
```

Causes the effect to move towards the given token, template, coordinates, or a string reference (see [`.name()`](#name)).

Also supports a second options object that accepts:
- `ease: string` (default `linear`) - set the ease of the movement,
- `cacheLocation: boolean` (default `false`) - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `rotate: boolean` (default `true`) - causes the effect to rotate towards the target

Check out what easings are available here: https://easings.net/

## Move speed

`.moveSpeed(500)`

Sets the speed of the effect if [`.moveTowards()`](#move-towards) has been called

## Snap to Grid

`.snapToGrid()` or `.snapToGrid(boolean)`

Causes the effect's location (or target location, if using `.stretchTo()` or `.moveTowards()`) be snapped to the grid.

## Sprite Offset

`.spriteOffset(inOffset, options)`

Examples:
```js
.spriteOffset({ x: 100, y: -50 })
.spriteOffset({ x: 1 }, { gridUnits: true })
```

This causes the effect's **sprite** to be offset relative to its container based on a given vector. Sprite Offset is independent from `.atLocation()` and other location's `offset` parameter.

A second options parameter accepts the following properties:
- `gridUnits` - boolean (false) - Whether the given values in x and y should be treated as the number of grids
- `local: boolean` - Used with `offset` to cause the location to be offset locally to the effect's rotation
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the effect's scene's grid size

## Zero Sprite Rotation

`.zeroSpriteRotation()` or `.zeroSpriteRotation(boolean)`

Causes the effect to not rotate should its container (see `spriteContainer` in [Animate Property](#animate-property)) rotate.

## Persist

`.persist()` or `.persist(boolean)` or `.persist(true, { persistTokenPrototype: true })`

Calling this method will cause the effect to become permanent on the canvas. You can end the effect with the [Effect Manager](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Manager).

Also supports a second options object that accepts:
- `persistTokenPrototype: boolean` (default `false`) - makes the effect persist on the token's prototype data, useful for active effect-linked VFX

## Extra End Duration

`.extraEndDuration(inNumber)` or `.extraEndDuration(500)`

This method only modifies `.persist()`ed effects and causes them to not immediately end, but stick around for the given duration passed to this method.

## No Loop

`.noLoop(boolean)`

If the effect would loop due to its duration or persistence, this causes it not to, and freezes once its duration is up.

## Origin

`.origin(inString)` or `.origin(document)`

Takes a UUID string, or a Foundry Document that contains an UUID.

Used for adding extra information to an effect, like the origin of the effect in the form of the item's UUID to then be retrieved or ended with [`Sequencer.EffectManager.getEffects()`](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Manager#get-effects) and [`Sequencer.EffectManager.endEffects()`](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Manager#end-effects)

## Name

`.name(inString)`

Causes the effect's position to be stored and can then be used  with [`.atLocation()`](#at-location), [`.stretchTo()`](#stretch-to), [`.rotateTowards()`](#rotate-towards), and [`.moveTowards()`](#move-towards) to refer to previous effects' locations

## Private

`.private(boolean)`

Causes the effect to not show up in the Effect Manager UI. **DO NOT USE UNLESS YOU KNOW WHAT YOU ARE DOING.**

## Missed

`.missed()` or `.missed(boolean)`

Calling this method will cause the effect to target a location close to the given location, but not on it. You can also pass `true` to it for greater readability, but simply calling it will do.

If a location has been picked with [`.atLocation()`](#at-location), a random spot around that will be picked. If both [`.atLocation()`](#at-location) and either of [`.stretchTo()`](#stretch-to) or [`.rotateTowards()`](#rotate-towards) a random location on the latter will be generated.

## Add override

```js
.addOverride(async (effect, data) => {
    // Do things here
    return data;
})
```

* `effect` is a reference to the effect in itself - interact with this at your own risk.

* `data` is the effect's data that is going to be passed to canvas layer.

Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct modifications of effect's data.

You _must_ define the function like above and return the data at the end of the function.

## Size

`.size(200, options)` or `.size({ width: 200, height: 300 }, options)`

Sets the width and the height of the effect in pixels, this size is set before any scaling.

A secondary options object may be passed to the method, which may contain:
- `gridUnits: boolean` (default `false`) - Causes the numbers given to the width and height to be counted as grid units, rather than pixel dimensions

## Template

`.template({ gridSize: 200, startPoint: 100, endPoint: 100 })`

This multi-function method sets the grid size, start point, and end point of the effect.

Grid size **is not the size of the grid in your scenes**. If you have created an effect, it is the size of the effect's internal grid. If you have created the effect for use.

Start point is the negative padding on the left-hand side of the effect, which will offset the effect "backwards" along its length. This is to compensate for when the starting point of the effect is actually "inside" of the effect.

End point is the same as the starting point, but inversely for the target of the effect. This will offset the effect "forward" along its length to account for it.

![JB2A template](../images/template_example.jpg)

## Set mustache

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

## Scale

`.scale(0.5)` or `.scale({ x: 0.5, y: 1.0 })` or `.scale(0.2, 0.6)`

A method that can take the following:
- A number to set the scale uniformly
- An object with x and y for non-uniform scaling
- Two numbers which the Sequencer will randomly pick a uniform scale between

## Scale In

`.scaleIn(scale, duration, options)`

`.scaleIn(0.5, 250)` or `.scaleIn({ x: 0.5, y: 0.2 }, 500)` or `.scaleIn(0, 500, {ease: "easeOutCubic"})` or `.scaleIn(0, 500, {ease: "easeOutCubic", delay: 100})`

Causes the effect to scale in when it starts playing.

**Note:** This acts as a multiplier to `.scale()`, meaning this method will _multiply_ the effect's current scale by the given value. If `.scale()` is set to `0.5`, and `.scaleIn()` is set to `2.0`, the effect's effective scale will be `1.0` at the start of the `.scaleIn()` animation.

The first parameter is the scale to scale from, which can be a number for uniform scale, or an object containing `x` and `y` parameters for the scale.

The second parameter is how many milliseconds the scale in will take.

A third options parameter can set the ease of the scale, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Scale Out

`.scaleOut(scale, duration, options)`

`.scaleOut(0.5, 250)` or `.scaleOut({ x: 0.5, y: 0.2 }, 500)` or `.scaleOut(0, 500, {ease: "easeOutCubic"})` or `.scaleOut(0, 500, {ease: "easeOutCubic", delay: -100})`

Causes the effect to scale out when it finishes playing.

**Note:** This acts as a multiplier to `.scale()`, meaning this method will _multiply_ the effect's current scale by the given value. If `.scale()` is set to `1.5`, and `.scaleOut()` is set to `0.5`, the effect's effective scale will be `0.75` at the end of the `.scaleOut()` animation.

The first parameter is the scale to scale to, which can be a number for uniform scale, or an object containing `x` and `y` parameters for the scale.

The second parameter is how many milliseconds the scale out will take.

A third options parameter can set the ease of the scale, and a delay before it ends. E.g. a delay of -500 means the scale will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Scale to Object

`.scaleToObject()` or `.scaleToObject(1.5)` or `.scaleToObject(1.5, { uniform: true })`

Causes the effect to be scaled to the target object's grid dimensions - for example, if the target given in `.atLocation()` is a token, the effect will be scaled to fit within the token's width and height.

A number be passed to the method, causing the effect to also scale uniformly (1.5 meaning 150% of the target object's dimensions).

A secondary options parameter can be passed as well, which accepts the following parameters:
- `uniform: boolean` (default `false`) - This causes the scaling to always be uniform, as it picks the largest dimension of the object

## Sprite Scale

`.spriteScale(0.5)` or `.spriteScale({ x: 0.5, y: 1.0 })` or `.spriteScale(0.2, 0.6)`

A method that scales the sprite directly (independently from `.scale()`) that take the following:
- A number to set the scale uniformly
- An object with x and y for non-uniform scaling
- Two numbers which the Sequencer will randomly pick a uniform scale between

## Anchor

`.anchor({ x: 0.5, y: 0.5 })` or `.anchor(0.5)`

Anchors the sprite's container according to the given x and y coordinates, or uniformly based on a single number.

## Sprite Anchor

`.spriteAnchor({ x: 0.5, y: 0.5 })` or `.spriteAnchor(0.5)`

Anchors the sprite itself according to the given x and y coordinates, or uniformly based on a single number. This happens within its container.

## Center

`.center()`

Centers the sprite on the given location, effectively giving it an anchor of `{x: 0.5, y: 0.5}`.

**Note:** If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the location the sprite is played at.

## Mirror

`.mirrorX()` or `.mirrorX(bool)`

`.mirrorY()` or `.mirrorY(bool)`

Causes the sprite to have a flipped X or Y scale. You can also pass a boolean to set whether it should be mirrored.

This is applied at the end of all the other scaling effects, including [`.stretchTo()`](#stretch-to) and [`.scale()`](#scale).

## Randomize mirror

`.randomizeMirrorX()` or `.randomizeMirrorX(bool)`

`.randomizeMirrorY()` or `.randomizeMirrorY(bool)`

Causes the sprite to have a randomized flipped X or Y scale (if the scale on that axis was 1, it can become 1 or -1, effectively mirroring the sprite). You can also pass a boolean to set whether it should be mirrored.

This is applied at the end of all the other scaling effects, including [`.stretchTo()`](#stretch-to) and [`.scale()`](#scale).

## Sprite Rotation

`.spriteRotation(90)`

Sets the rotation of the effect, which is applied onto the effect sprite itself, in isolation of any offsets or rotations. Useful if `.rotateTowards()` caused your effect to be pointed in the right direction, but the effect by itself angled the wrong way.

The top part of this image has no sprite rotation, the bottom has sprite rotation set to 90.

![](../images/spriterotation.jpg)

```js
const source = canvas.tokens.controlled[0];
const target = Array.from(game.user.targets)[0];

// Find effects on source with name "arrow"
const currentEffects = Sequencer.EffectManager.getEffects({ source: source, name: "arrow" }) 

// If none were found
if( currentEffects.length != 0 ) {
    // End effects on source named "arrow"
    Sequencer.EffectManager.endEffects({ source: source, name: "arrow" });
}else{
    new Sequence()
        .effect()
            .file("jb2a.ui.indicator.green.01.01")          // Play arrow animation from Sequencer Database
            .attachTo(source, { followRotation: false })    // Attach to source token but do not rotate with it
            .rotateTowards(target, { attachTo: true })      // Rotate towards target token
            .scaleToObject(0.75)                            // Scale effect to fit token's size
            .persist()                                      // Make it last forever
            .spriteOffset({ x: 0.5 }, { gridUnits: true })  // Move above token by 1 grid unit
            .spriteRotation(90)                             // Rotate the sprite itself 90 degrees
            .name("arrow")                                  // Name it arrow so that the effect manager can find it
            .fadeIn(500)                                    // When first created, fade it in
            .fadeOut(500)                                   // When ending, fade it out
        .play()
}
```

## Rotate

`.rotate(90)`

Sets the rotation of the effect, which is added on top of the calculated rotation after [`.rotateTowards()`](#rotate-towards) or [`.randomRotation()`](#random-rotation)

## Rotate In

`.rotateIn(degrees, duration, options)`

`.rotateIn(90, 250)` or `.rotateIn(180, 500)` or `.rotateIn(45, 500, {ease: "easeOutCubic"})` or `.rotateIn(90, 500, {ease: "easeOutCubic", delay: 100})`

Causes the effect to rotate when it starts playing.

The first parameter is the degrees from which to start the rotation.

The second parameter is how many milliseconds the rotation will take.

A third options parameter can set the ease of the rotation, and the delay before it starts.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Rotate Out

`.rotateOut(degrees, duration, options)`

`.rotateOut(90, 250)` or `.rotateOut(180, 500)` or `.rotateOut(45, 500, {ease: "easeOutCubic"})` or `.rotateOut(-90, 500, {ease: "easeOutCubic", delay: -200})`

Causes the effect to rotate when it finishes playing.

The first parameter is how many degrees the animation will do.

The second parameter is how many milliseconds the rotation will take.

A third options parameter can set the ease of the rotation, and a delay before it ends. E.g. a delay of -500 means the rotation will finish 500ms before the end.

Default parameters: `{ ease: "linear", delay: 0 }`

Check out what easings are available here: https://easings.net/

## Random rotation

`.randomRotation()`

Causes the sprite to have a random rotation, which means it should **not** be used with [`.stretchTo()`](#stretch-to).

## Playback Rate

`.playbackRate(2)` or `.playbackRate(0.5)`

Sets the effect's playback rate. A playback rate of 2 would make it play 2x as fast, 0.5 would make it play half as fast.

## Below tokens

`.belowTokens()` or `.belowTokens(bool)`

Causes the effect to be played below tokens - you can pass a boolean whether it should be applied or not.

## Below tiles

`.belowTiles()` or `.belowTiles(bool)`

Causes the effect to be played below tiles - you can pass a boolean whether it should be applied or not.

## Above Lighting

`.aboveLighting()` or `.aboveLighting(bool)`

Causes the effect to be played above the lighting layer, which makes the effect be visible over almost everything except weather effects.

Note that if an effect is attached to an object via `.attachTo()`, you may need to disable `bindVisibilty` if the object is hidden.

## Z-Index

`.zIndex(1)`

Sets the z-index of the effect, potentially displaying it on top of or below other effects

**Note:** If you have called [`.belowTokens()`](#below-tokens) or [`.belowTiles()`](#below-tiles), the effect is placed on an entirely different layer, with its own z-index and will be sorted within that layer.

## Animate Property

`.animateProperty(target, propertyName, options)`

Examples:
- `.animateProperty("sprite", "position.x", { from: -200, to: 200, duration: 500})`
- `.animateProperty("sprite", "rotation", { from: 0, to: 360, duration: 1500, ease: "easeInOutCubic"})`
- `.animateProperty("spriteContainer", "rotation", { from: 0, to: 180, duration: 5000, delay: 500 })`
- `.animateProperty("sprite", "position.x", { from: 0, to: 1, duration: 1000, delay: 500, gridUnits: true })`
- `.animateProperty("sprite", "position.y", { from: 1, to: 0, duration: 500, gridUnits: true, fromEnd: true })`

Animates a property on the target of the animation.

Valid targets are `sprite` (the effect itself) and `spriteContainer` (the effect's container).

Animatable properties are as follows:
- `sprite`
  - `position.x`
  - `position.y`
  - `rotation` (degrees)
  - `angle` (radians)
  - `scale.x`
  - `scale.y`
  - `width`
  - `height`

- `alphaFilter`
  - `alpha`

- `spriteContainer`
  - `position.x`
  - `position.y`
  - `rotation` (degrees)
  - `angle` (radians)
  - `scale.x`
  - `scale.y`

Default parameters: `{ ease: "linear", delay: 0, gridUnits: false, fromEnd: false }`

Grid units will work if you are animating the `width`, `height`, `position.x`, or `position.y`.

The `fromEnd` optional parameter will play the animation a number of milliseconds equal to the `duration` from the end of the effect's duration.

For example, the duration of an effect is 5000ms, and you have added an animation that will animate the `position.y` property on a sprite from 1 to 0 in `gridUnits` with a duration of 1000ms and `fromEnd` set to true - the animation will then start playing at 4000ms into the effect's duration, and finish exactly at the same time as the effect ends.

Check out what easings are available here: https://easings.net/

## Loop Property

`.loopProperty(target, propertyName, options)`

Examples:
- `.loopProperty("sprite", "position.x", { from: -200, to: 200, duration: 500})`
- `.loopProperty("sprite", "rotation", { from: 0, to: 360, duration: 1500})`
- `.loopProperty("spriteContainer", "rotation", { from: 0, to: 180, duration: 5000, delay: 500 })`
- `.loopProperty("spriteContainer", "rotation", { values: [0, -180, 180, -90, 90], duration: 2000, pingPong: true })`

Loops a property between a set of values on the target.

If no `options.loops` are provided, the animation is indefinite (lasts forever).

`options.pingPong` sets whether loop should interpolate to the first value after it reaches the last value, or simply set it to the first value.

`options.values` is an alternative to `options.from` and `options.to` - it must be an array of values to interpolate between.

Valid targets are `sprite` (the effect itself) and `spriteContainer` (the effect's container).

Animatable properties are as follows:
- `sprite`
  - `position.x`
  - `position.y`
  - `rotation` (degrees)
  - `angle` (radians)
  - `scale.x`
  - `scale.y`
  - `width`
  - `height`

- `alphaFilter`
  - `alpha`

- `spriteContainer`
  - `position.x`
  - `position.y`
  - `rotation` (degrees)
  - `angle` (radians)
  - `scale.x`
  - `scale.y`

Default parameters:
```js
{
    loops: 0,
    ease: "linear",
    delay: 0,
    pingPong: false,
    gridUnits: false
}
```

Grid units will work if you are animating the `width`, `height`, `position.x`, or `position.y`.

Check out what easings are available here: https://easings.net/

## Filter

`.filter(string, object)`

Examples:
- `.filter("ColorMatrix", { hue: 100 })`
- `.filter("Glow", { color: 0xFF0000 })`
- `.filter("Blur", { blurX: 5, blurY: 10 })`

This method adds a filter to the effect that is playing. Filters are listed [here](api/filter/filter.md).

You may "stack" multiple filters on top of each other, and they will work in concert with each other.

## Tint

`.tint()` or `.tint(hexadecimal)` or `.tint(decimal)`

Examples:
- `.tint("#FF0000")` - Red tint
- `.tint(0x0000FF)` - Blue tint

This method tints the effect with the given color. Supplying no parameter will apply no tint.

## Screen Space

`.screenSpace()` or `.screenSpace(boolean)`

Causes the effect to be played in screen space instead of world space (where tokens are).

## Screen Space Above UI

`.screenSpaceAboveUI()` or `.screenSpaceAboveUI(boolean)`

If `.screenSpace()` has been used, this will cause the effect to be played above all elements in Foundry.


## Screen Space Position

`.screenSpacePosition({ x: 0, y: 0 })`

Positions the effect in a screen space position, offset from its `.screenSpaceAnchor()`.

## Screen Space Anchor

`.screenSpaceAnchor({ x: 1, y: 0.5 })` or `.screenSpaceAnchor(0.5)`

Anchors the effect to the screen (X being 0 means sticking to the left, 1 means sticking to the right side), or uniformly based on a single number in screen space.

## Screen Space Scale

`.screenSpaceScale(object)`

Sets up various properties relating to scale of the effect on the screen. Accepts the following options:

```js
{
    x: 1.0,         // Scale on the effect's X scale
    y: 1.0,         // Scale on the effect's Y scale
    fitX: false,    // Causes the effect to set its width to fit the width of the screen
    fitY: false,    // Causes the effect to set its height to fit the height of the screen
    ratioX: false,  // If Y is scaled, setting this to true will preserve the width/height ratio
    ratioY: false   // If X is scaled, setting this to true will preserve the height/width ratio
}
```

## Text

`.text(string, options)`

```js
const style = {
    "fill": "red",
    "fontFamily": "Arial Black",
    "fontSize": 28,
    "strokeThickness": 4
}

new Sequence()
   .effect()
      .atLocation(token)
      .text("Test Text", style)
   .play()
```

Creates a text element, attached to the effect. The options for the text are available here:

<a>https://pixijs.io/pixi-text-style/</a>

Use the JSON object as the options parameter for `.text()`


## Shape

`.shape(inType, inOptions)`

```js

new Sequence()
    .effect()
        .attachTo(token)
        .persist()
        .shape("circle", {
            lineSize: 4,
            lineColor: "#FF0000",
            radius: 1.5,
            gridUnits: true,
            name: "test"
        })
        .loopProperty("shapes.test", "scale.x", { from: 0.9, to: 1.1, duration: 1000, pingPong: true, ease: "easeInOutSine" })
        .loopProperty("shapes.test", "scale.y", { from: 0.9, to: 1.1, duration: 1000, pingPong: true, ease: "easeInOutSine" })
    .play()

```

Creates a graphics element, attached to the effect.

The supported shapes (`inType`) are:
- "polygon"
- "rectangle"
- "circle"
- "ellipse"
- "roundedRect"

The optional options are as follows:
- `radius`: `number` - The radius of `circle` shapes, and the radius of the `roundedRect` edges
- `width`: `number` - The width of `rectangle`, `ellipse`, and `roundedRect` shapes
- `height`: `number` - The height of `rectangle`, `ellipse`, and `roundedRect` shapes
- `points`: `Array<[number, number]|{ x: number, y: number}>` - The points of a `polygon` object 
- `gridUnits`: `boolean` - Whether the positions or height/width should be considered grid units (1 = one grid on the canvas grid)
- `name`: `string` - What name to give this shape, which can be used with `.animateProperty()` and `.loopProperty()` through `shapes.[name]`
- `fillColor`: `string|number` - The fill color of the shape, must be decimal (`0xFF0000`) or hexadecimal (`"#FF000000"`)  
- `fillAlpha`: `number` - The alpha of the fill color
- `alpha`: `number` - The alpha of the entire shape
- `lineSize`: `number` - The size of the outline of the shape (in pixels)
- `lineColor`: `string|number` - The color of the outline of the shape, must be decimal (`0xFF0000`) or hexadecimal (`"#FF000000"`)
- `offset`: `object` - An object containing the offset of this shape, with `x` and `y` determining the offset. You can set this to be based on grid units by supplying `offset.gridUnits` to it.
- `isMask`: `boolean` - Whether this shape should be considered a mask. This will make it invisible, and `options.name` will not be considered (animating masks is VERY expensive, thus a no-go).

## XRay

`.xray()` or `.xray(boolean)`

Causes the effect to ignore vision-based masking.

## Mask

`.mask()` or `.mask(token)` or `.mask([list, of, objects])`

Masks the effect to the given object or objects. If no object is given, the effect will be masked to the source of the effect.


## Tie To Documents

`.tieToDocuments(token)` or `.tieToDocuments([ActiveEffect, Token])`

Ties the effect to any number of documents in Foundry - if those get deleted, the effect is ended.
