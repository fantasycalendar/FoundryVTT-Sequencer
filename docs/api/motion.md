# Motion

### What is this?

This part of the Sequencer allows you to animate a token, tile, or drawing's sprite without changing the underlying document. Position, rotation, scale, and opacity can all be animated, jittered, or oscillated visually, and the placeable returns to its document position when the motion ends.

### How do I use this?

When creating a motion section, you can assemble these methods like this:
```js
new Sequence()
    .motion()
        .on(token)
        .moveTo({ x: token.document.x + 200, y: token.document.y })
    .play()
```

or a continuous bobbing effect that lasts until you end it:

```js
new Sequence()
    .motion()
        .on(token)
        .name("fly")
        .moveTo(
            { x: token.document.x, y: token.document.y - 100 },
            { duration: 600, ease: "easeOutCubic", easeOut: "easeInCubic" }
        )
        .oscillate({
            period: 1400,
            waveform: "sine",
            y: { amplitude: 12 },
            rotation: { amplitude: 3 },
            fadeInDuration: 600,
            fadeOutDuration: 400,
        })
        .persist()
    .play()

// later, to land it:
Sequencer.MotionManager.endMotions(token, { name: "fly" });
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the section to finish running before starting the next section.

Passing a number as a parameter will cause the section to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the motion.

Passing a second number will randomize the wait duration between the two given numbers.

## Async

`.async()`

Calling this will make each part of a section finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition (see `.repeats()` below), whilst `.waitUntilFinished()` is for the entire section.

## Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the motion to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

## Play if

`.playIf(boolean)` or `.playIf(inFunction)`

Causes the section not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the motion to play.

Below is an example of a function used in this method, which would cause this motion to only be played about 50% of the time.
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

Applies a preset to the current motion - read the [Sequencer Presets article](../presets.md) for more information.

## Locally

`.locally()` or `.locally(bool)`

Causes motion to be played only locally, and not push to other connected clients.

## For Users

`.forUsers(string)` or `.forUsers(array)`

Causes the motion to be played for only a set of users.

Accepts a single user ID or username (case-sensitive), or an array thereof.

## On

`.on(token|tile|drawing|document)`

Sets the Token, Tile, or Drawing this motion will animate. Accepts the placeable itself or its document.

Anything else (templates, regions, lights, etc.) will be rejected when the motion plays.

## Name

`.name(inString)`

Names the motion so it can be referenced later by [`Sequencer.MotionManager.endMotions()`](#ending-and-querying-motions) or [`Sequencer.MotionManager.endAllMotions()`](#ending-and-querying-motions).

Useful for persistent motions (see [`.persist()`](#persist) below), where the name is the handle you use to wind the motion down.

## Move To

`.moveTo(target, options)` or `.moveTo(waypoints, options)`

Examples:
```js
.moveTo({ x: 500, y: 300 }, { duration: 600 })
.moveTo(otherToken, { duration: 400, ease: "easeOutQuad" })
.moveTo(otherToken, { duration: 1500, ease: "easeInOutQuad", attachTo: true })
.moveTo(
    { x: 500, y: 0 },
    { duration: 400, return: false }
)
.moveTo(
    [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 300 }, { x: 0, y: 0 }],
    { duration: 1200, ease: "easeInOutQuad" }
)
.moveTo(
    [
        { v: { x: 0, y: 0 } },
        { v: { x: 500, y: 0 }, duration: 300, inEase: "easeOutBack", hold: 500 },
        { v: { x: 0, y: 0 }, duration: 600, inEase: "easeInOutQuad" }
    ]
)
```

Moves the sprite toward the given target. The first argument can be:

- An `{ x, y }` coordinate object
- A placeable or its document (a Token, Tile, Drawing, etc.), whose position is read when the section is built
- A crosshair from [`Sequencer.Crosshair.show()`](crosshair.md), which lands the moving object centered on the crosshair, the same way an effect targeting a crosshair is centered on it
- A string reference (see [`.name()`](#name) on other sections) that refers to a previously placed object
- An array of waypoints - the sprite travels through each point in order

Coordinates are the same coordinates you'd pass to `token.document.update({ x, y })`. The motion handles the conversion to the sprite's internal position automatically.

When the target is a placeable, document, or name reference, its position **includes any motion currently displacing it**. If you move a token toward another token that is itself flying via a `.motion()`, it lands on where that token visually appears, not on its document position. Pass `ignoreMotion: true` in the options to target the document position instead, for example when moving a token to the ground directly beneath a flying token. The position is read once, at the moment `.moveTo()` is called; it does not keep tracking the target if the target moves afterward. Pass `attachTo: true` (below) to keep tracking a moving target frame by frame instead. A plain `{ x, y }` coordinate is used exactly as given.

### Single-target form options

When the first argument is a single position or placeable:

- `duration: number` (required) - how long the outward animation takes, in milliseconds
- `ease: string` (default `"linear"`) - ease curve for the outward animation. See https://easings.net/ for what's available
- `delay: number` (default `0`) - milliseconds to wait before the motion starts
- `return: boolean` (default `true`) - whether the sprite should animate back to its starting position after the outward animation. With `false`, the sprite ends at the target and the motion finishes there
- `easeOut: string` (default mirrors `ease`) - ease curve for the return animation
- `returnDuration: number` (default mirrors `duration`) - how long the return animation takes
- `ignoreMotion: boolean` (default `false`) - when the target is a placeable or document, target its document position instead of its motion-displaced visible position. Has no effect on a plain `{ x, y }` target
- `attachTo: boolean` (default `false`) - when the target is a placeable, document, or name reference, follow its **live** position each frame instead of the position it had when `.moveTo()` was called. Use this to intercept a moving target: moving toward a token that is itself flying via a `.motion()` curves toward where it is *now*, frame by frame, rather than a frozen point. Has no effect on a plain `{ x, y }` target (and throws if combined with one). The return leg still brings the sprite back to its own starting position. Combine with [`.persist()`](#persist) for an indefinite chase. Honors `ignoreMotion`: with `attachTo: true, ignoreMotion: true` the chase follows the target's document position rather than its motion-displaced visible position

The default `return: true` reflects the fact that motion is visual indication: the sprite goes somewhere, then comes back, because the document never moved. If you want the sprite to stay at the displaced position until something else ends it, combine `return: false` with [`.persist()`](#persist).

### Waypoint form options

When the first argument is an array, the motion plays a path through every waypoint in order. The array entries must all be the same kind: either every element is an `{ x, y }` coordinate pair, or every element is a per-waypoint object of the form `{ v: { x, y }, duration?, hold?, inEase?, outEase? }`.

- `duration: number` - total time for the whole path. When set, segment durations are divided evenly across the waypoints
- `ease: string` (default `"linear"`) - default ease curve for every segment
- `delay: number` (default `0`) - milliseconds to wait before the motion starts
- `returnValues: array` - optional second waypoint array to play after the outward path completes
- `returnDuration: number` - total time for the return path

Per-waypoint fields (when entries are objects):

- `v: { x, y }` (required) - the waypoint's coordinates
- `duration: number` - milliseconds for the segment ending at this waypoint, overriding the whole-path `duration` from the options for this segment
- `hold: number` (default `0`) - milliseconds to dwell at this waypoint after arriving, before the next segment begins. Allowed on any waypoint, including the first (a pause at the start) and the last (a pause at the end before the return). Lengthens the path by that amount
- `inEase: string` - ease curve for the segment ending at this waypoint
- `outEase: string` - ease curve for the segment leaving this waypoint toward the next one

The first waypoint's `duration`, `inEase`, and `outEase` are ignored, since there is no incoming segment at the start of the path. Its `hold` is honored, dwelling at the start before the path begins.

Either give the whole path a `duration` in the options, or give every waypoint after the first its own; mixing the two is rejected.

## Move By

`.moveBy(offset, options)` or `.moveBy(distance, options)` or `.moveBy(waypoints, options)`

Examples:
```js
.moveBy({ x: 100, y: -50 }, { duration: 500 })
.moveBy({ x: 100 }, { duration: 500 })
.moveBy(80, { awayFrom: attacker, duration: 300, easeOut: "easeInQuad" })
.moveBy(60, { towards: grappler, attachTo: true, duration: 400 })
.moveBy(
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 0 }],
    { duration: 900 }
)
```

Offsets the sprite from its normal position, in pixels, then (by default) moves it back. The first argument can be:

- A `{ x, y }` offset; a missing axis is left alone, so `{ x: 100 }` slides only horizontally
- A positive number together with `towards` or `awayFrom` in the options: a distance toward or away from another placeable
- An array of waypoint offsets, played through in order, with the same per-waypoint fields as [`.moveTo()`](#move-to) (`duration`, `hold`, `inEase`, `outEase`). End the array at `{ x: 0, y: 0 }` to land back at the start; a non-zero final waypoint snaps home when the motion ends

The single forms take the same base options as [`.moveTo()`](#move-to)'s single-target form (`duration`, `ease`, `delay`, `return`, `easeOut`, `returnDuration`); the waypoint form takes its waypoint options (`duration`, `ease`, `delay`, `return`, `returnValues`, `returnDuration`).

### Directional offsets

The distance form takes a direction from another object:

- `towards: placeable` - the offset points at the target
- `awayFrom: placeable` - the offset points away from the target (a knockback). `towards` and `awayFrom` cannot both be given, and the distance is always a positive number; the direction lives in the option name
- `attachTo: boolean` (default `false`) - by default the direction is captured **once** when the motion plays, using the target's position at that moment (a knockback uses the attacker's position at the moment of impact). With `attachTo: true`, the direction is recalculated from the target's live position every frame, the same opt-in [`.moveTo()`](#move-to) uses
- `ignoreMotion: boolean` (default `false`) - measure the direction from the target's document position instead of its motion-displaced visible position

The live form holds a **fixed-length** offset that pivots around the sprite's own normal position: a grappler walking away does not drag the held token along; only the direction of its offset updates. Combine with [`.persist()`](#persist) to hold a grapple until `Sequencer.MotionManager.endMotions()` releases it:

```js
.moveBy(60, { towards: grappler, attachTo: true, duration: 400, return: false })
.persist()
```

A target standing exactly on the mover's position has no meaningful direction; the offset points to the right in that case. The direction cannot target the object being moved.

## Tint To

`.tintTo(inColor, options)`

```js
.tintTo("#ff0000", { duration: 200 })
.tintTo(0xff0000, { duration: 200, return: true, returnDuration: 400, ease: "easeOutQuad", easeOut: "easeInQuad" })
.tintTo("#ff0000", { duration: 1500, return: false })
.tintTo(["#ffffff", "#ff0000", "#ffff00"], { duration: 600, returnDuration: 300 })
.tintTo([
    { v: "#ffffff" },
    { v: "#ff0000", duration: 100, inEase: "easeOutQuad" },
    { v: "#ffff00", duration: 400, inEase: "linear" },
])
```

Tints the sprite toward a target color, then (by default) tints back to the sprite's original color.

Colors accept either a hex string (`"#ff0000"`, with or without the leading `#`) or a number (`0xff0000`).

The options object accepts the same fields as [`.moveTo()`](#move-to):

- `duration: number` (required) - the outward animation length in milliseconds
- `ease: string` (default `"linear"`) - the ease function applied to the outward animation
- `delay: number` (default `0`) - milliseconds to wait before the animation starts
- `return: boolean` (default `true`) - whether the sprite tints back to its original color after the outward animation
- `easeOut: string` (default mirrors `ease`) - the ease function applied to the return animation
- `returnDuration: number` (default mirrors `duration`) - the return animation length in milliseconds

### Waypoint color paths

Passing an array as the first argument sweeps through the colors in order, the same way the waypoint [`.moveTo()`](#move-to) form works for positions. The array elements may be plain color values, or per-waypoint objects carrying the same `duration`, `hold`, `inEase`, and `outEase` fields:

```js
.tintTo([
    { v: "#ffffff" },
    { v: "#ff0000", duration: 100, inEase: "easeOutQuad", hold: 250 },
    { v: "#ffff00", duration: 400, outEase: "easeInQuad" },
])
```

The first waypoint's `duration` and `inEase` are ignored, since there is no incoming segment at the start of the path; its `hold` is honored, holding the starting color before the sweep begins. A waypoint's `hold` holds the color there for that many milliseconds before sweeping to the next.

By default, the return leg sweeps back through the colors in reverse over `returnDuration`. Set `returnValues` to override with an explicit return path.

## Scale To

`.scaleTo(scale, options)` or `.scaleTo(waypoints, options)`

Examples:
```js
.scaleTo(1.5, { duration: 400, ease: "easeOutBack" })
.scaleTo({ x: 1.6, y: 0.7 }, { duration: 400 })
.scaleTo({ y: 1.5 }, { duration: 400 })
.scaleTo([1, 1.5, 1.2, 1], { duration: 800 })
.scaleTo([
    { v: 1 },
    { v: 1.5, duration: 200, inEase: "easeOutBack", hold: 300 },
    { v: { x: 1.2, y: 0.8 }, duration: 400 },
])
```

Scales the sprite relative to its normal size, then (by default) scales back. `1.5` means 1.5 times how the sprite normally looks, the same convention as [`.oscillate()`](#oscillate)'s scale axis.

The first argument can be:

- A single positive number, scaling both axes uniformly
- A `{ x, y }` object of positive numbers; a missing axis is left unscaled, so `{ x: 2 }` stretches only horizontally
- An array of waypoints, played through in order. Waypoints are positive numbers, full `{ x, y }` pairs, or per-waypoint objects of the form `{ v, duration?, hold?, inEase?, outEase? }` with the same per-waypoint fields as [`.moveTo()`](#move-to). The waypoint form always drives both axes; numbers apply to both

The single-target form takes the same options as [`.moveTo()`](#move-to)'s single-target form (`duration`, `ease`, `delay`, `return`, `easeOut`, `returnDuration`); the waypoint form takes the same options as its waypoint form (`duration`, `ease`, `delay`, `return`, `returnValues`, `returnDuration`).

Multiple `.scaleTo()` calls multiply together, per axis, and combine the same way with [`.oscillate()`](#oscillate)'s scale axis. They stack on top of each other instead of replacing one another: two overlapping `.scaleTo(1.5)` calls end at 2.25×, so drive the scale with one call (or a waypoint array) when a specific end size matters.

## Scale By

`.scaleBy(change, options)` or `.scaleBy(waypoints, options)`

Examples:
```js
.scaleBy(0.1, { duration: 800 })
.scaleBy({ x: -0.2 }, { duration: 800 })
.scaleBy([0, 0.5, 0], { duration: 900 })
```

Grows or shrinks the sprite by adding the given amount to the document's scale - a positive value grows it, a negative value shrinks it - then (by default) returns. `.scaleBy(0.1)` grows a token at scale 1 to 1.1 (one at scale 0.8 to 0.9), and `.scaleBy(-0.2)` shrinks it, never below zero size. Drawings have no scale field, so for them the change is a fraction of the normal size: `0.1` grows a drawing by 10%.

This differs from [`.scaleTo()`](#scale-to), which scales to a multiple of the normal size: on a token at scale 0.8, `.scaleTo(1.1)` ends at 1.1 times its normal size, while `.scaleBy(0.1)` ends at scale 0.9.

The input forms mirror [`.scaleTo()`](#scale-to)'s, but the values can be positive or negative: a single number changes both axes uniformly, a `{ x, y }` object leaves a missing axis unchanged, and a waypoint array steps through changes with the same per-waypoint fields as [`.moveTo()`](#move-to) (`duration`, `hold`, `inEase`, `outEase`). `0` means the normal size, so end the array at `0` to land back home. The options are the same as [`.scaleTo()`](#scale-to)'s in both forms.

Overlapping scale motions multiply together, per axis, once each call's change is applied: two overlapping `.scaleBy(0.5)` calls on a token at scale 1 each apply 1.5× and end at 2.25×, and they combine the same way with [`.scaleTo()`](#scale-to) calls and [`.oscillate()`](#oscillate)'s scale axis.

## Rotate To

`.rotateTo(degrees, options)` or `.rotateTo(waypoints, options)`

Examples:
```js
.rotateTo(90, { duration: 500, ease: "easeInOutQuad" })
.rotateTo(350, { duration: 800 })
.rotateTo([0, 45, -45, 0], { duration: 600, ease: "easeInOutQuad" })
.rotateTo([
    { v: 0 },
    { v: 45, duration: 100, inEase: "easeOutBack" },
    { v: 0, duration: 400, inEase: "easeInOutQuad" },
])
```

Rotates the sprite to the given angle in degrees, then (by default) rotates back to its normal angle. The angle is the same rotation value you'd pass to `token.document.update({ rotation })`.

The rotation goes exactly where you tell it: rotating to `350` from an angle of `10` sweeps +340 degrees the long way around, so the number you pass is the number you get. Waypoint arrays step through each angle in order, which makes back-and-forth patterns like `[0, 45, -45, 0]` read exactly as written.

The single-angle form takes `duration`, `ease`, `delay`, `return`, `easeOut`, and `returnDuration`, with the same meanings and defaults as [`.moveTo()`](#move-to)'s single-target form; the waypoint form takes `duration`, `ease`, `delay`, `return`, `returnValues`, and `returnDuration`, with the same per-waypoint fields (`duration`, `hold`, `inEase`, `outEase`).

Tokens with locked rotation always display at an angle of 0, so a motion rotates them from 0 regardless of their document rotation, and they snap back to 0 when it ends.

Multiple `.rotateTo()` calls add their rotations together. They stack on top of each other instead of replacing one another: two overlapping calls to 90° end at 180°, so drive the angle with one call (or a waypoint array) when a specific end angle matters. For deliberate layered rotation, use [`.rotateBy()`](#rotate-by), whose values are relative by nature.

## Rotate By

`.rotateBy(degrees, options)` or `.rotateBy(waypoints, options)`

Examples:
```js
.rotateBy(45, { duration: 400, ease: "easeOutBack" })
.rotateBy(-90, { duration: 500 })
.rotateBy(720, { duration: 800, return: false })
.rotateBy([0, 45, -45, 0], { duration: 600, ease: "easeInOutQuad" })
```

Rotates the sprite by the given number of degrees relative to its normal angle, then (by default) rotates back. The value is a relative change, so the sweep is exactly what you pass: `.rotateBy(720, { return: false })` spins the sprite twice and ends clean at the same visible angle it started at, the somersault case. Negative values rotate the other way.

Waypoint arrays step through the changes in order, with the same per-waypoint fields as [`.moveTo()`](#move-to) (`duration`, `hold`, `inEase`, `outEase`). End the array at `0` to land back at the normal angle; a non-zero final waypoint snaps home when the motion ends.

The single-value form takes `duration`, `ease`, `delay`, `return`, `easeOut`, and `returnDuration`; the waypoint form takes `duration`, `ease`, `delay`, `return`, `returnValues`, and `returnDuration`.

Multiple `.rotateBy()` calls add their changes together, and combine the same way with [`.rotateTo()`](#rotate-to) calls and [`.oscillate()`](#oscillate)'s rotation axis.

## Fade To

`.fadeTo(alpha, options)` or `.fadeTo(waypoints, options)`

Examples:
```js
.fadeTo(0.4, { duration: 500 })
.fadeTo(0, { duration: 300, return: false })
.fadeTo([1, 0.2, 1], { duration: 900 })
.fadeTo([
    { v: 1 },
    { v: 0.2, duration: 300, hold: 500 },
    { v: 1, duration: 300 },
])
```

Fades the sprite to the given opacity, then (by default) fades back to its normal opacity. The target is an absolute opacity between `0` (invisible) and `1` (fully visible): fading to `0.5` ends at half visibility regardless of the sprite's normal opacity. That includes fading an invisible sprite up: `.fadeTo(1)` on a token whose normal opacity is 0 is a reveal, and it fades back to invisible afterward unless `return: false` holds it.

The single-alpha form takes `duration`, `ease`, `delay`, `return`, `easeOut`, and `returnDuration`, with the same meanings and defaults as [`.moveTo()`](#move-to)'s single-target form; the waypoint form takes `duration`, `ease`, `delay`, `return`, `returnValues`, and `returnDuration`, with the same per-waypoint fields (`duration`, `hold`, `inEase`, `outEase`).

Multiple `.fadeTo()` calls add their opacity changes together (the result stays within fully-invisible and fully-visible); [`.oscillate()`](#oscillate)'s alpha axis then multiplies on top, so a blink pulses whatever opacity the fades produce. They stack on top of each other instead of replacing one another: two overlapping `.fadeTo(0.5)` calls on a fully visible token stack their changes down to invisible rather than meeting at 0.5, so drive the opacity with one call (or a waypoint array) when a specific end opacity matters. For deliberate layered fading, use [`.fadeBy()`](#fade-by).

## Fade By

`.fadeBy(change, options)` or `.fadeBy(waypoints, options)`

Examples:
```js
.fadeBy(-0.3, { duration: 400 })
.fadeBy(0.2, { duration: 400 })
.fadeBy([0, -0.6, 0], { duration: 900 })
```

Shifts the sprite's opacity by the given amount, then (by default) fades back. A positive value brightens the sprite, a negative value dims it, relative to its normal opacity: `.fadeBy(0.2)` brightens by 0.2 (a token at opacity 0.2 ends at 0.4, one at 0 ends at 0.2), `.fadeBy(-0.3)` dims by 0.3. The result stays between fully invisible and fully visible.

This differs from [`.fadeTo()`](#fade-to), which takes an absolute target: `.fadeTo(0.5)` always ends at exactly 0.5, while `.fadeBy(-0.5)` ends 0.5 lower than wherever the sprite normally sits.

Waypoint arrays step through changes in order, with the same per-waypoint fields as [`.moveTo()`](#move-to) (`duration`, `hold`, `inEase`, `outEase`). End the array at `0` to land back at the normal opacity. The single-value form takes `duration`, `ease`, `delay`, `return`, `easeOut`, and `returnDuration`; the waypoint form takes `duration`, `ease`, `delay`, `return`, `returnValues`, and `returnDuration`.

Multiple `.fadeBy()` calls add their opacity changes together, the same way [`.fadeTo()`](#fade-to) calls do.

## Persist

`.persist()`

Plays the motion forward, then holds the displaced position indefinitely, surviving reloads and scene changes. Call `Sequencer.MotionManager.endMotions(target, options)` to play the return animation and end the motion.

Use this for "active until I dismiss it" visual states like a flying token holding altitude during combat, a poisoned token shuddering while the condition is on, or a charged spell crackling around its caster.

Cannot be combined with [`.persistUntilUpdate()`](#persist-until-update) - use one or the other.

A persistent motion that doesn't have an explicit return animation (every call uses `return: false`) will snap back to the document position when ended. To wind it down smoothly, use `return: true` on the calls, or pass a `settle` duration in milliseconds to `endMotions` for a smooth wind-down.

## Persist Until Update

`.persistUntilUpdate()`

Plays the motion forward, then holds the displaced position until the placeable's document is updated (position or rotation). The document update ends the motion without playing a return animation. Useful when the document will be moved to the displaced position so the sprite stays put with no visible snap.

The intended pattern is "play a visual transition, then write the result to the document":

```js
const dropDistance = canvas.grid.size * 3;
new Sequence()
    .motion()
        .on(token)
        .moveTo(
            { x: token.document.x, y: token.document.y + dropDistance },
            { duration: 500, return: false, ease: "easeInQuad" }
        )
        .persistUntilUpdate()
        .waitUntilFinished()
    .animation()
        .on(token)
        .teleportTo({ x: token.document.x, y: token.document.y + dropDistance })
    .play()
```

The motion delivers the visual transition. The document update lands at the displaced position. No snap.

The update that ends the motion is a change to the placeable's **position or rotation**. Other document changes (image, name, elevation, and so on) do not end it.

The hold works with any combination of motions, so it also serves as a general "until this thing moves" trigger: a token tinted red until it takes its turn and moves, or one enlarged until it's repositioned. The no-snap handoff only covers position and rotation, the things a document update can land on. Held scale, opacity, or tint changes return to normal instantly when the update arrives, since the document has nothing to catch them.

Cannot be combined with [`.persist()`](#persist) - use one or the other.

## Noise

`.noise(options)`

```js
.noise({ strength: 6, frequency: 30, duration: 400 })
.noise({ strength: { x: 10, y: 4 }, frequency: 50, duration: 1000, rotationStrength: 3 })
.noise({ strength: { x: 20 }, frequency: 40, duration: 600 })
.noise({ strengthScaledToObject: 0.2, frequency: 40, duration: 800 })
.noise({ strength: 8, frequency: 40, duration: 600, directionMin: 60, directionMax: 120 })
```

Layers random shake / jitter onto the motion. Every few milliseconds the shake picks a random direction inside the cone between `directionMin` and `directionMax` (degrees, full circle by default) and pushes the sprite `strength` pixels that way. Rotation jitter is randomized separately from the position shake.

The options object accepts:

- `strength: number | { x, y }` - how far the sprite gets pushed, in pixels. Either a single number for the same strength in every direction, or `{ x, y }` for a different strength per axis. The `{ x, y }` form may omit either axis to lock that axis at `0` (so `{ x: 20 }` shakes only horizontally)
- `strengthScaledToObject: number | { x, y }` - alternative to `strength`. The value is a multiplier of the placeable's width and height, so `0.1` shakes the sprite by 10% of its size. Same `{ x, y }` shape as `strength`, with the same omit-an-axis-to-lock-it-at-zero behavior. Useful for shakes that should scale with the token size
- `frequency: number` (required) - milliseconds between each new shake position. Lower numbers produce faster, twitchier shakes
- `duration: number` (default `1000`) - how long the shake lasts, in milliseconds. Under [`.persist()`](#persist) this is the loop length of one cycle
- `rotationStrength: number` (default `0`) - how far the sprite twists back and forth, in degrees
- `directionMin: number` (default `0`) - the lowest direction of the cone, in degrees, between `0` and `720`
- `directionMax: number` (default `360`) - the highest direction of the cone, in degrees, between `0` and `720`
- `delay: number` (default `0`) - milliseconds to wait before the shake starts
- `fadeInDuration: number` (default `0`) - milliseconds to ramp the shake amplitude in at the start
- `fadeOutDuration: number` (default `0`) - milliseconds to ramp the shake amplitude out at the end

Exactly one of `strength` or `strengthScaledToObject` is required.

`directionMin` and `directionMax` define a cone the shake direction is randomly picked from. The full circle (`0` to `360`) shakes in every direction; a narrow cone like `(85, 95)` gives a near-vertical jitter; setting both to the same number gives a fixed-direction shake.

Under [`.persist()`](#persist), the shake loops until the motion ends, then fades over `fadeOutDuration`.

Multiple `.noise()` calls on the same motion add together, useful for stacking layers like a fast jitter on top of a slow tremor, each with its own timing and strength.

## Oscillate

`.oscillate(options)`

```js
.oscillate({
    period: 1400,
    waveform: "sine",
    y: { amplitude: 8 },
    rotation: { amplitude: 4 },
    fadeInDuration: 600,
    fadeOutDuration: 600,
})
.oscillate({
    period: 700,
    waveform: "triangle",
    rotation: { amplitude: 6 },
    duration: 350,
    fadeInDuration: 40,
    fadeOutDuration: 80,
})
.oscillate({
    period: 800,
    waveform: "sine",
    scale: { baseline: 1.0, amplitude: 0.05 }
})
.oscillate({
    period: 1200,
    waveform: "sine",
    x: { strengthScaledToObject: 0.1 },
    y: { strengthScaledToObject: 0.1, phase: Math.PI / 2 },
})
```

Layers a periodic oscillation onto the motion. Position and rotation axes oscillate by `amplitude` units around their starting value; scale and alpha oscillate around `baseline` (default `1.0`).

The options object accepts:

- `period: number` (required) - milliseconds per full cycle of the wave
- `waveform: string` (required) - one of `"sine"`, `"triangle"`, `"square"`
- `x`, `y`, `rotation`, `scale`, `alpha` - per-axis configuration. At least one axis must be configured. Each takes `{ amplitude, phase }`, plus `baseline` for `scale` and `alpha`. The `x` and `y` axes also accept `strengthScaledToObject` as a stand-in for `amplitude`
- `duration: number` (default `1000`) - total duration of the oscillation in milliseconds. Ignored under [`.persist()`](#persist), where the oscillation loops until the motion ends
- `delay: number` (default `0`) - milliseconds to wait before the oscillation starts
- `fadeInDuration: number` (default `0`) - milliseconds to ramp the oscillation amplitude in at the start
- `fadeOutDuration: number` (default `0`) - milliseconds to ramp the oscillation amplitude out at the end

### Per-axis configuration

Each configured axis takes its own object:

- `amplitude: number` - how far the axis swings at its peak, in pixels (`x`, `y`), degrees (`rotation`), or an amount added to and subtracted from `baseline` (`scale`, `alpha`) - an amplitude of `0.05` around a baseline of `1.0` swings between `0.95` and `1.05`. Required unless `strengthScaledToObject` is used in its place on the `x` or `y` axis
- `strengthScaledToObject: number` - **x and y axes only.** Stands in for `amplitude` to express the peak displacement as a multiplier of the placeable's width (for `x`) or height (for `y`). For example, `x: { strengthScaledToObject: 0.1 }` sways the sprite by 10% of its width. Cannot be combined with `amplitude` on the same axis
- `phase: number` (default `0`) - shifts where in the wave this axis starts, in radians (a full cycle is `Math.PI * 2`). Positive values shift the peak earlier. Give two axes the same `phase` to make them peak together; put one a quarter cycle ahead (`phase: Math.PI / 2`, as in the example above) to trace a circle or oval
- `baseline: number` (default `1.0`) - **scale and alpha only.** The center value the oscillation swings around. A heartbeat is `scale: { baseline: 1.0, amplitude: 0.05 }` producing a `0.95 → 1.05` pulse

### Waveforms

- `"sine"` - smooth continuous curve, peaks at a quarter-cycle and three-quarter-cycle. Natural for organic sway and breathing
- `"triangle"` - linear ramp up and down with the same peak timing. Sharper transitions than sine
- `"square"` - binary on/off pulse. Useful for blinking, flickering, or hard heartbeat scale pulses

Under [`.persist()`](#persist), the oscillation loops until the motion ends, then fades over `fadeOutDuration`.

Multiple `.oscillate()` calls on the same motion add together, useful for stacking layers like a slow sway with a fast bob, each with its own period, waveform, and per-axis strengths.