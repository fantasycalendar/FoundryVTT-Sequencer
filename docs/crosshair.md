## Global Reference

You can access the global Sequencer crosshair API through:

```js
Sequencer.Crosshair
```

## Show

`Sequencer.Crosshair.show(crosshair={}, callbacks={})`

```js
crosshair = {
	t: string, // See CONST.MEASURED_TEMPLATE_TYPES, defaults to CIRCLE
	distance: number // Defaults to half the canvas grid size
	width: number // Defaults to the canvas grid size
	borderAlpha: number // Determines the transparency of the template border (0-1, default 0.75)
	borderColor: string // Determines the color of the template border
	texture: string // the texture to show within the template
	textureAlpha: number // the transparency of the chosen texture (default .5)
	textureScale: number // texture scale multiplier (default 1)
	textureTile: number // the transparency of the chosen texture (default .5)
	fillColor: string // Determines the color of the template fill
	angle: number // The starting angle for the template
	direction: number // The starting direction for the template
	gridHighlight: boolean, // Toggles whether this crosshair should highlight the grid
	icon: {
		texture: string, // Optional texture to use for the icon of the crosshair
		borderVisible: boolean // Whether this icon should have a border
	},
	snap: {
		position: number, // See CONST.GRID_SNAPPING_MODES
		resolution: number, // How many sub-squares the snapping should consider (default: 1)
		size: number, // See CONST.GRID_SNAPPING_MODES
		direction: mumber // How many degrees the direction of this crosshair should snap at
	},
	lockDrag: boolean,
	distanceMin: null | number, // How small or short the crosshair can be at its smallest 
	distanceMax: null | number, // How big or how far the crosshair can go at its biggest
	label: {
		text: string,
		dx: null | number,
		dy: null | number,
	},
	location: {
		obj: null | PlaceableObject | Document, // The optional object to tie the crosshair to
		limitMinRange: null | number, // Causes the crosshair to not be able to be placed within this number of grid units
		limitMaxRange: null | number, // Causes the crosshair to not be able to be placed beyond this number of grid units of the location 
		showRange: boolean, // Displays the distance between the crosshair and the location in grid units under the crosshair
		lockToEdge: boolean, // Whether to lock the crosshair to the edge of the target (mostly used with tokens)
		lockToEdgeDirection: boolean, // Causes the crosshair to be locked along the normal of the token's edge (and corner, in the case of square tokens)
		offset: {
			x: null | number,
			y: null | number
		}, // Causes the location to be offset by this many pixels
		wallBehavior: string, // Causes the crosshair to be unable to be placed based on this configuration, eg only within sight, or no walls at all between crosshair and location, or anywhere. See Sequencer.Crosshair.PLACEMENT_RESTRICTIONS,
		displayRangePoly: boolean, // Causes a polygon to be rendered below the object that shows the limit based on the limitMaxRange set above - this requires both that, and obj to have a position
		rangePolyFillColor: null | number, // The fill color of the range polygon
		rangePolyLineColor: null | number, // The line color of the range polygon
		rangePolyFillAlpha: null | number, // The fill alpha of the range polygon
		rangePolyLineAlpha: null | number, // The line alpha of the range polygon
	},
	lockManualRotation: boolean // Whether to prevent the user from rotating this crosshair's direction
}
```

<details>
  <summary><strong>------ Click for examples ------</strong></summary><br />

Creates a crosshair that returns a position when placed:

```js
const location = await Sequencer.Crosshair.show();
````

Creates a crosshair that returns a position when placed, that can only be placed within 20 grid units of the selected token

```js
const location = await Sequencer.Crosshair.show({
	location: {
		obj: token,
		limitMaxRange: 20
	}
});
```

Creates a crosshair that returns a position when placed, that can only be placed within 20 grid units of the selected token, and changes the icon when colliding with any walls between the token and the crosshair.

```js
const location = await Sequencer.Crosshair.show({
	location: {
		obj: token,
		limitMaxRange: 20,
		wallBehavior: Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES
	}
}, {
	[Sequencer.Crosshair.CALLBACKS.COLLIDE]: (crosshair) => {
		crosshair.updateCrosshair({
			"icon.texture": "icons/svg/bones.svg"
		})
	},
	[Sequencer.Crosshair.CALLBACKS.STOP_COLLIDING]: (crosshair) => {
		crosshair.updateCrosshair({
			"icon.texture": ""
		})
	}
});
```

<strong>--------------------------------</strong>

</details>

## Sequencer.Crosshair.PLACEMENT_RESTRICTIONS

For wall behavior restrictions, see `Sequencer.Crosshair.PLACEMENT_RESTRICTIONS`:

- `Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.ANYWHERE` - Placement is valid anywhere
- `Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.LINE_OF_SIGHT` - The crosshair can only be placed where it can be seen from the location of the object in `location.obj`
- `Sequencer.Crosshair.PLACEMENT_RESTRICTIONS.NO_COLLIDABLES` - No walls of any kind are allowed between the location of the object in `location.obj` and the crosshair

## Sequencer.Crosshair.CALLBACKS

For callbacks, see `Sequencer.Crosshair.CALLBACKS`:

- `Sequencer.Crosshair.CALLBACKS.SHOW` - Runs when the crosshair is first shown
- `Sequencer.Crosshair.CALLBACKS.MOUSE_MOVE` - Runs anytime the mouse moves
- `Sequencer.Crosshair.CALLBACKS.MOVE` - Runs when the position of the crosshair updates
- `Sequencer.Crosshair.CALLBACKS.COLLIDE` - Runs when the crosshair collides as a part of its `wallBehavior`
- `Sequencer.Crosshair.CALLBACKS.STOP_COLLIDING` - Runs when the crosshair stops colliding as a part of its `wallBehavior`
- `Sequencer.Crosshair.CALLBACKS.INVALID_PLACEMENT` - Runs when the crosshair was attempted to be placed in an invalid location as a part of its `wallBehavior`
- `Sequencer.Crosshair.CALLBACKS.PLACED` - Runs before the crosshair was placed - this can be interrupted by this function returning `false` (a false-y value does not interrupt it)
- `Sequencer.Crosshair.CALLBACKS.CANCEL` - Runs before the crosshair's placement was cancelled by the user - this can be interrupted by this function returning `false` (a false-y value does not interrupt it)

Crosshair callbacks tend to return the crosshair placeable object, which have a number of useful properties and functions:
- `crosshair.updateCrosshair()` - method that accepts an object, similar to the config object above, to update the crosshair
- `crosshair.isValid` - whether the crosshair is currently in a valid position
- `crosshair.range` - the current range between the location object and the crosshair in grid units (only available if a location object has been set)

## CONST.GRID_SNAPPING_MODES

In the case of snapping, this is determined by the core Foundry constant `CONST.GRID_SNAPPING_MODES`, this contains the binary number relating to how anything will snap on the scene grid.

If you set `snap.position` to `CONST.GRID_SNAPPING_MODES.VERTEX`, the crosshair will snap to the vertices of the grid, ie, the corner intersections.

If you set it to `CONST.GRID_SNAPPING_MODES.CENTER`, the crosshair snaps to the center of the grid squares/hexes;

If you set it to `CONST.GRID_SNAPPING_MODES.VERTEX | CONST.GRID_SNAPPING_MODES.CENTER` (exactly like this), the crosshair will snap to the intersections AND the center of the grid squares/hexes. This is how Foundry determines how positions are snapped to its grid.
