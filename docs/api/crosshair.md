# Crosshair

### What is this?

This part of the Sequencer enables the use of its crosshairs directly in sequences. It can be used to select a location for an [
`.effect()`](effect.md) to be played at, or to move a token via an [
`.animation()`](animation.md) to a specific location.

### How do I use this?

You can assemble a crosshair section like this:

```js
new Sequence()
  .crosshair("target")
  .effect()
    .atLocation("target")
    .file("modules/jb2a_patreon/Library/Generic/Healing/HealingAbility_01_Blue_200x200.webm")
    .fadeIn(500)
    .fadeOut(500)
  .play()
```

### Why "crosshair"?

The central idea is to give the crosshair a name, which ties its final location to a piece of text. When you use
`.crosshair("target")` the section will create a crosshair and when it has been placed, tie the location that it ends up at with the text
`"target"` - this means that any section after this one can use
`"target"` in its location methods (such as effects) as a placeholder for its placement location.

You can also use the `.name()` method to achieve the same thing.

<hr/>

## Name

`.name(string)`

Causes the crosshair's final position to be stored in the sequence, and can then be used in any subsequent section as a placeholder for locations, such as in effect's [`.atLocation()`](effect.md#at-location).

## Type

`.type(string)`

Sets the type of MeasurableTemplate to create, see CONST.MEASURED_TEMPLATE_TYPES

## Label

`.label(string, object)`

Sets a custom label to be set as a part of this crosshair

Also supports a second options object that accepts:

- `dx: number` - Sets the x position offset of the label in pixels
- `dy: number` - Sets the y position offset of the label in pixels

## Snap Position

`.snapPosition(number)`

Sets how the position of the crosshair should snap on the grid. 

Use `CONST.GRID_SNAPPING_MODES` to determine this, eg:
- `.snapPosition(CONST.GRID_SNAPPING_MODES.CENTER)` - snaps to the center of each grid square/hex
- `.snapPosition(CONST.GRID_SNAPPING_MODES.CENTER | CONST.GRID_SNAPPING_MODES.VERTEX)` - snaps to the center and each vertex (intersections) of each grid square/hex

It is specifically one `|` and not two - this is a bitwise operation, which is a fancy way that maths works for computers. Google bitwise operations if you want to understand it at length.

## Distance

`.distance(number, object)`

Sets the distance for the crosshair - or radius for a circular crosshair

Also supports a second options object that accepts:

- `min: number` - Caps the crosshair's distance above this minimum value, which it cannot go below
- `max: number` - Caps the crosshair's distance to this maximum value, which it cannot exceed

## Angle

`.angle(number)`

Configures the angle of the crosshair - mostly used for the width of cone crosshairs

## Width

`.width(number)`

Configures the width for the crosshair - used for ray crosshairs

## Direction

`.direction(number)`

Configures the direction degrees for the crosshair - mostly used for cone and ray crosshairs. This configures the starting direction of the crosshair.

## Snap Direction

`.snapDirection(number)`

Configures the increments the direction should snap along. `45` would make it only snap in diagonal, horizontal, and vertical directions.

## Lock Manual Rotation

`.lockManualRotation(boolean)`

Toggles whether the crosshair can be manually rotated

## Lock Drag

`.lockDrag(boolean)`

Toggles whether the crosshair's end position can be dragged

## Icon

`.icon(string, inOptions)`

Configures the custom icon to be used on the crosshair

Also supports a second options object that accepts:

- `borderVisible: boolean` - Causes the border of the icon to be visible

## Border Color

`.borderColor(HEX | number)`

Sets the border color of the crosshair

## Fill Color

`.fillColor(HEX | number)`

Sets the fill color of the crosshair

## Location

`.location(object|string, object)`

Examples:

```js
.location(token)
.location(token, { showRange: true })
.location(token, { lockToEdge: true })
.location(token, { lockToEdge: true, lockToEdgeDirection: true })
.location(token, { limitMaxRange: 20 })
```

Configures the source location of the crosshair, usually to limit it around the target placeable object, or to
cause it to be limited within a certain range of the placeable object.

Also supports a second options object that accepts:

- `limitMinRange: number` - Causes the crosshair to not be able to be placed within this number of grid units of the location
`limitMaxRange: number` - Causes the crosshair to not be able to be placed beyond this number of grid units of the location
- `showRange: boolean` - Displays the distance between the crosshair and the location in grid units under the crosshair
- `lockToEdge: boolean` - Whether to lock the crosshair to the edge of the target (mostly used with tokens)
- `lockToEdgeDirection: boolean` - Causes the crosshair to be locked along the normal of the token's edge (and corner, in the case of square tokens)
- `offset: object` - (default `{ x: 0, y: 0 }`) - causes the location to be offset by this many pixels,
- `wallBehavior: string` - Causes the crosshair to be unable to be placed based on this configuration, eg only within sight, or no walls at all between crosshair and location, or anywhere. See `Sequencer.Crosshair.PLACEMENT_RESTRICTIONS`
- `displayRangePoly: boolean` - Causes a polygon to be rendered below the object that shows the limit based on the limitMaxRange set above - this requires both that, and obj to have a position
- `rangePolyFillColor: number` - The fill color of the range polygon
- `rangePolyLineColor: number` - The line color of the range polygon
- `rangePolyFillAlpha: number` - The fill alpha of the range polygon
- `rangePolyLineAlpha: number` - The line alpha of the range polygon

## Persist

`.persist(boolean)`

Causes the crosshair to spawn a measurable template identical to the crosshair.

## Grid Highlight

`.gridHighlight(boolean)`

Toggles whether this crosshair should highlight the grid.

## Callback

`.callback(inString, inFunction)`

```js
new Sequence()
  .crosshair()
    .callback(Sequencer.Crosshair.CALLBACKS.SHOW, function(crosshair) {
      console.log(crosshair)
    })
  .play()
```
This allows you to run functions when certain events happens with the crosshair, such as changing the icon. Most functions are passed the crosshair object.

This requires the use of `Sequencer.Crosshair.CALLBACKS` as the first parameter.

