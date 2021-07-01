# Table Of Contents
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

## - Animation Methods -
- [On](#on)
- [Move Towards](#move-towards)
- [Move Speed](#move-speed)
- [Rotate Towards](#rotate-towards)
- [Teleport To](#teleport-to)
- [Offset](#offset)
- [Closest Square](#closest-square)
- [Rotate](#rotate)
- [Rotate In](#rotate-in)
- [Rotate Out](#rotate-out)

## Animation Methods

### On

`.on(inToken)` or `.on(inTile)`

Sets the target object to be animated. Accepts a token or a tile.

### Move Towards

`.moveTowards(target, options = { ease: "linear", delay: 0 })`

`.moveTowards(inToken)` or `.moveTowards(inTile)` or `.moveTowards({ x: 0, y: 0 })`

Sets the location to move the target object to over the course of the duration.

If no duration has been set, the target object will move towards the location at the default foundry speed.

Check out what easings are available here: https://easings.net/

### Move Speed

`.moveSpeed(500)`

Sets the speed of the animation if `.moveTowards()` has been called

### Rotate Towards

`.rotateTowards(target, options = { duration: 0, ease: "linear", delay: 0, offset: 0 })`

`.rotateTowards(inToken)` or `.rotateTowards(inTile)` or `.rotateTowards({ x: 0, y: 0 })`

Causes the target object to rotate towards a given target.

A second options parameter can set the duration of the rotation (0 is instant), the ease, the delay before it starts, and any given offset. 

Check out what easings are available here: https://easings.net/

### Teleport To

`.teleportTo(target, options = { delay: 0 })`

`.teleportTo(inToken)` or `.teleportTo(inTile)` or `.teleportTo({ x: 0, y: 0 })`

Sets the location to teleport the target object to

### Offset

`.offset({ x: 0, y: 0 })`

Causes the movement or teleportation to be offset in the X and/or Y axis

### Closest Square

`.closestSquare()` or `.closestSquare(boolean)`

Causes the movement or teleportation to pick the closest non-intersecting square as the **target location

### Rotate

`.rotate(90)`

Sets the rotation of the animation, which is added on top of the calculated rotation after `.rotateTowards()`

### Rotate In

`.rotateIn(degrees, duration, options = {ease: "linear", delay: 0})`

`.rotateIn(0.5, 250)` or `.rotateIn({ x: 0.5, y: 0.2 }, 500)` or `.rotateIn(0, 500, {ease: "easeOutCubic"})`

Causes the target object to rotate when it starts playing

Check out what easings are available here: https://easings.net/

### Rotate Out

`.rotateOut(degrees, duration, options = {ease: "linear"})`

`.rotateOut(0.5, 250)` or `.rotateOut({ x: 0.5, y: 0.2 }, 500)` or `.rotateOut(0, 500, {ease: "easeOutCubic"})`

Causes the target object to rotate when it finishes playing

Check out what easings are available here: https://easings.net/