## Global Reference

You can access the global Sequencer Motion Manager through:

```js
Sequencer.MotionManager
```

The Motion Manager controls motions started by [`.motion()`](api/motion.md) sections after they're playing. Use it to end persistent motions, terminate motions across a scene, or read the current visual displacement a motion is applying to a placeable.

Motions are runtime-only (see [`.persist()`](api/motion.md#persist) on the Motion section). The Motion Manager has no UI and no way to list active motions, so if you want to end a motion later, give it a [`.name()`](api/motion.md#name) when you create it.

## End Motion

`Sequencer.MotionManager.endMotion(target, options)`

```js
target = PlaceableObject | Document | String // Token, Tile, Drawing, their documents, or a UUID
options = {
    name: String,       // From the .name() method on motions
    sequenceId: String, // Only end motions from this sequence
    settle: Number,     // Milliseconds to wind down the return animation over (default 0)
    sceneId: String     // Default to current scene ID
}
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// Land a flying token, playing the configured return animation instantly
Sequencer.MotionManager.endMotion(token, { name: "fly" });

// Land it smoothly over 600ms
Sequencer.MotionManager.endMotion(token, { name: "fly", settle: 600 });

// End every motion on a token, regardless of name
Sequencer.MotionManager.endMotion(token);

// End only motions from a specific sequence
Sequencer.MotionManager.endMotion(token, { sequenceId: mySequence.id });
```
<strong>--------------------------------</strong>

</details>

Ends motions on the given target. Returns the number of motions ended.

For persistent motions (created with [`.persist()`](api/motion.md#persist)), this triggers the return animation. With `settle` greater than `0`, the return animation runs over that duration with the motion's configured ease. With `settle` of `0`, the motion ends instantly.

For non-persistent motions, this interrupts them. With `settle` greater than `0`, the motion's return animation plays smoothly; otherwise the motion is removed and the sprite snaps back to its document position.

You can only end motions you created, unless you are a GM.

## End All Motions

`Sequencer.MotionManager.endAllMotions(options)`

```js
options = {
    name: String,       // From the .name() method on motions
    sequenceId: String, // Only end motions from this sequence
    settle: Number,     // Milliseconds to wind down the return animation over (default 0)
    sceneId: String     // Default to current scene ID
}
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
// End every motion named "fly" across every placeable on the current scene
Sequencer.MotionManager.endAllMotions({ name: "fly" });

// End every motion on the current scene
Sequencer.MotionManager.endAllMotions();

// End every motion on a specific scene
Sequencer.MotionManager.endAllMotions({ sceneId: "ULohafjBlsTRST8F" });
```
<strong>--------------------------------</strong>

</details>

Functionally the same as `endMotion`, except it matches every placeable on the scene instead of one specific target.

This is a GM-only method.

## Get Displacement

`Sequencer.MotionManager.getDisplacement(target)`

```js
target = PlaceableObject | Document | String // Token, Tile, Drawing, their documents, or a UUID
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

```js
const displacement = Sequencer.MotionManager.getDisplacement(token);
if (displacement) {
    console.log(`Sprite is offset by (${displacement.deltaX}, ${displacement.deltaY})`);
}
```
<strong>--------------------------------</strong>

</details>

Returns the current per-frame displacement applied to the target's sprite by all active motions, or `null` if no motion is active. The return shape is:

```js
{
    deltaX: Number,           // Horizontal offset from document position, in pixels
    deltaY: Number,           // Vertical offset from document position, in pixels
    deltaAngle: Number,       // Rotation offset, in degrees
    scaleMultiplier: Number,  // Scale multiplier (1.0 = no change)
    alphaMultiplier: Number   // Alpha multiplier (1.0 = no change)
}
```

Useful for macros and modules that want to read the visible position of a placeable mid-motion without doing their own per-frame math.

`.atLocation()`, `.attachTo()`, `.stretchTo()`, and similar location-resolving methods on the [Effect section](api/effect.md) already consult this displacement automatically, so an effect targeting a token mid-motion lands on the visible sprite, not on the document position. Pass `{ ignoreMotion: true }` to those methods to opt out and target the document position instead.
