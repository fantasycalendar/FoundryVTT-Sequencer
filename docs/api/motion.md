# Motion

### What is this?

This part of the Sequencer allows you to animate a token, tile, or drawing's sprite without changing the underlying document. Position, rotation, scale, and alpha can all be tweened, jittered, or oscillated visually, and the placeable returns to its document position when the motion ends.

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
Sequencer.MotionManager.endMotion(token, { name: "fly" });
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

`.playIf(truthy|falsey)` or `.playIf(inBool)` or `.playIf(inFunction)`

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

Names the motion so it can be referenced later by [`Sequencer.MotionManager.endMotion()`](#ending-and-querying-motions) or [`Sequencer.MotionManager.endAllMotions()`](#ending-and-querying-motions).

Useful for persistent motions (see [`.persist()`](#persist) below), where the name is the handle you use to wind the motion down.

## Move To

`.moveTo(target, options)` or `.moveTo(waypoints, options)`

Examples:
```js
.moveTo({ x: 500, y: 300 }, { duration: 600 })
.moveTo(otherToken, { duration: 400, ease: "easeOutQuad" })
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
        { v: { x: 500, y: 0 }, duration: 300, inEase: "easeOutBack" },
        { v: { x: 0, y: 0 }, duration: 600, inEase: "easeInOutQuad" }
    ]
)
```

Moves the sprite toward the given target. The first argument can be:

- An `{ x, y }` coordinate object
- A placeable or its document (a Token, Tile, Drawing, etc.), in which case the target's `document.x` / `document.y` are read when the section is built
- A string reference (see [`.name()`](#name) on other sections) that resolves to a previously placed object
- An array of waypoints, for a keyframed multi-segment path

Coordinates are in **document space**, the same coordinates you'd pass to `token.document.update({ x, y })`. The motion handles the conversion to the sprite's internal position automatically.

### Single-target form options

When the first argument is a single position or placeable:

- `duration: number` (required) - how long the outward animation takes, in milliseconds
- `ease: string` (default `"linear"`) - ease curve for the outward animation. See https://easings.net/ for what's available
- `delay: number` (default `0`) - milliseconds to wait before the motion starts
- `return: boolean` (default `true`) - whether the sprite should animate back to its starting position after the outward animation. With `false`, the sprite ends at the target and the motion finishes there
- `easeOut: string` (default mirrors `ease`) - ease curve for the return animation
- `returnDuration: number` (default mirrors `duration`) - how long the return animation takes

The default `return: true` reflects the fact that motion is visual indication: the sprite goes somewhere, then comes back, because the document never moved. If you want the sprite to stay at the displaced position until something else ends it, combine `return: false` with [`.persist()`](#persist).

### Keyframe form options

When the first argument is an array, the motion plays a multi-segment path through every waypoint in order. The array entries are homogeneous: either every element is an `{ x, y }` coordinate pair, or every element is a per-key object of the form `{ v: { x, y }, duration?, inEase?, outEase? }`.

- `duration: number` - total time for the whole path. When set, segment durations are divided evenly across the waypoints
- `ease: string` (default `"linear"`) - default ease curve for every segment
- `delay: number` (default `0`) - milliseconds to wait before the motion starts
- `returnValues: array` - optional second waypoint array to play after the outward path completes
- `returnDuration: number` - total time for the return path

Per-key fields (when entries are objects):

- `v: { x, y }` (required) - the waypoint's coordinates
- `duration: number` - milliseconds for the segment ending at this waypoint, overriding the track-level `duration` for this segment
- `inEase: string` - ease curve for the segment ending at this waypoint
- `outEase: string` - ease curve for the segment leaving this waypoint toward the next one

The first waypoint's `duration`, `inEase`, and `outEase` are ignored, since there is no incoming segment at the start of the path.

Either every waypoint after the first sets `duration`, or none of them do. Mixing track-level `duration` with per-key `duration` is rejected.

### Composition

Calling `.moveTo()` multiple times on the same motion section adds multiple tracks, all playing concurrently. Their displacements add together. This is useful for layered movement, like a horizontal slide combined with a vertical hop.

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

Colors accept either a hex string (`"#ff0000"`, with or without the leading `#`) or a 24-bit integer (`0xff0000`).

The options object accepts the same fields as [`.moveTo()`](#move-to):

- `duration: number` (required) - the outward tween length in milliseconds
- `ease: string` (default `"linear"`) - the ease function applied to the outward tween
- `delay: number` (default `0`) - milliseconds to wait before the tween starts
- `return: boolean` (default `true`) - whether the sprite tints back to its original color after the outward tween
- `easeOut: string` (default mirrors `ease`) - the ease function applied to the return tween
- `returnDuration: number` (default mirrors `duration`) - the return tween length in milliseconds

### Keyframed color paths

Passing an array as the first argument runs a multi-segment color sweep, the same way the keyframed [`.moveTo()`](#move-to) form works for positions. The array elements may be plain color values, or per-key objects:

```js
.tintTo([
    { v: "#ffffff" },
    { v: "#ff0000", duration: 100, inEase: "easeOutQuad" },
    { v: "#ffff00", duration: 400, outEase: "easeInQuad" },
])
```

The first waypoint's `duration` and `inEase` are ignored, since there is no incoming segment at the start of the path.

By default, the return leg sweeps back through the colors in reverse over `returnDuration`. Set `returnValues` to override with an explicit return path.

### Composition

Calling `.tintTo()` multiple times on the same motion section adds multiple tint tracks. They compose by RGB component-wise multiplication, the same rule PIXI uses internally when combining a parent's and a material's tint. A half-strength red layered with a half-strength green produces a darker yellow.

## Persist

`.persist()`

Plays the motion forward, then holds the displaced position indefinitely. Call `Sequencer.MotionManager.endMotion(target, options)` to play the return animation and end the motion.

**Persistence is runtime-only.** Unlike `.effect().persist()`, which writes a flag on the canvas so the effect can be recreated after a world reload, a persistent `.motion()` writes nothing. It holds in memory on every viewing client and ends when either:

- `Sequencer.MotionManager.endMotion(...)` is called, or
- the scene is changed, the world is reloaded, or the page is refreshed (the sprite snaps back to its document position with no further input)

Use this for "active until I dismiss it" visual states like a flying token holding altitude during combat, a poisoned token shuddering while the condition is on, or a charged spell crackling around its caster. For state that needs to outlive a reload, use a persistent effect attached to the placeable instead.

Mutually exclusive with [`.persistUntilUpdate()`](#persist-until-update).

A persistent motion that doesn't have an explicit return animation (every track uses `return: false`) will snap back to the document position when ended. To wind it down smoothly, use `return: true` on the tracks, or pass `settle: <ms>` to `endMotion` for a smooth wind-down.

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

Mutually exclusive with [`.persist()`](#persist).

## Noise

`.noise(options)`

```js
.noise({ strength: 6, frequency: 30, duration: 400 })
.noise({ strength: { x: 10, y: 4 }, frequency: 50, duration: 1000, rotationStrength: 3 })
.noise({ strength: { x: 20 }, frequency: 40, duration: 600 })
.noise({ strengthScaledToObject: 0.2, frequency: 40, duration: 800 })
.noise({ strength: 8, frequency: 40, duration: 600, directionMin: 60, directionMax: 120 })
```

Layers random shake / jitter onto the motion. Each sample is pulled from a random direction inside the cone `[directionMin, directionMax]` (degrees, full circle by default), and the sprite is displaced by `strength` pixels along that direction. Rotation jitter runs on an independent random stream.

The options object accepts:

- `strength: number | { x, y }` - displacement amplitude in pixels. Either a single number for uniform strength, or `{ x, y }` for axis-specific amplitudes. The `{ x, y }` form may omit either axis to lock that axis at `0` (so `{ x: 20 }` shakes only horizontally)
- `strengthScaledToObject: number | { x, y }` - alternative to `strength`. The value is a multiplier of the placeable's width and height, so `0.1` shakes the sprite by 10% of its size. Same `{ x, y }` shape as `strength`, with the same omit-an-axis-to-lock-it-at-zero behavior. Useful for shakes that should scale with the token size
- `frequency: number` (required) - milliseconds between samples. Lower numbers produce faster, twitchier shakes
- `duration: number` (default `1000`) - how long the shake lasts, in milliseconds. Under [`.persist()`](#persist) this is the loop length of one cycle
- `rotationStrength: number` (default `0`) - rotation amplitude in degrees
- `directionMin: number` (default `0`) - lower bound of the direction cone, in degrees, in `[0, 720]`
- `directionMax: number` (default `360`) - upper bound of the direction cone, in degrees, in `[0, 720]`
- `delay: number` (default `0`) - milliseconds to wait before the shake starts
- `fadeInDuration: number` (default `0`) - milliseconds to ramp the shake amplitude in at the start
- `fadeOutDuration: number` (default `0`) - milliseconds to ramp the shake amplitude out at the end

Exactly one of `strength` or `strengthScaledToObject` is required.

`directionMin` and `directionMax` define a cone the displacement direction is randomly picked from. The full circle (`0` to `360`) gives an omnidirectional jitter; a narrow cone like `(85, 95)` gives a near-vertical jitter; `directionMin === directionMax` gives a fixed-direction shake.

Under [`.persist()`](#persist), the shake loops until the motion ends, then fades over `fadeOutDuration`.

Multiple `.noise()` calls on the same motion compose additively, useful for stacking layers like a fast jitter on top of a slow tremor, each with its own timing and strength.

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

- `amplitude: number` - peak displacement in pixels (`x`, `y`), degrees (`rotation`), or a multiplier offset (`scale`, `alpha`). Required unless `strengthScaledToObject` is used in its place on the `x` or `y` axis
- `strengthScaledToObject: number` - **x and y axes only.** Stands in for `amplitude` to express the peak displacement as a multiplier of the placeable's width (for `x`) or height (for `y`). For example, `x: { strengthScaledToObject: 0.1 }` sways the sprite by 10% of its width. Mutually exclusive with `amplitude` on the same axis
- `phase: number` (default `0`) - phase offset in radians. Positive phase shifts the peak earlier in time. Use this to correlate multiple axes: two axes with the same phase peak together, while two axes with a quarter-cycle phase difference trace a circle or oval
- `baseline: number` (default `1.0`) - **scale and alpha only.** The centre value the oscillation orbits. A heartbeat is `scale: { baseline: 1.0, amplitude: 0.05 }` producing a `0.95 → 1.05` pulse

### Waveforms

- `"sine"` - smooth continuous curve, peaks at a quarter-cycle and three-quarter-cycle. Natural for organic sway and breathing
- `"triangle"` - linear ramp up and down with the same peak timing. Sharper transitions than sine
- `"square"` - binary on/off pulse. Useful for blinking, flickering, or hard heartbeat scale pulses

Under [`.persist()`](#persist), the oscillation loops until the motion ends, then fades over `fadeOutDuration`.

Multiple `.oscillate()` calls on the same motion compose additively, useful for stacking layers like a slow sway with a fast bob, each with its own period, waveform, and per-axis amplitudes.