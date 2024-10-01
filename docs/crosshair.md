## Global Reference

You can access the global Sequencer crosshair API through:

```js
Sequencer.Crosshair
```

## Show

`Sequencer.Crosshair.show(crosshair={}, callbacks={})`

```js
crosshair = {
  gridHighlight: boolean, // Toggles whether this crosshair should highlight the grid
  icon: {
    texture: string, // Optional texture to use for the icon of the crosshair
    borderVisible: boolean // Whether this icon should have a border
  },
  snap: {
    position: number, // See CONST.GRID_SNAPPING_MODES
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
    wallBehavior: string // Causes the crosshair to be unable to be placed based on this configuration, eg only within sight, or no walls at all between crosshair and location, or anywhere. See Sequencer.Crosshair.PLACEMENT_RESTRICTIONS
  },
  lockManualRotation: boolean // Whether to prevent the user from rotating this crosshair's direction
}


// For callbacks, see `Sequencer.Crosshair.CALLBACKS`
callbacks = {
  [Sequencer.Crosshair.CALLBACKS.SHOW / "show"]: function,
  [Sequencer.Crosshair.CALLBACKS.MOUSE_MOVE / "mouseMove"]: function,
  [Sequencer.Crosshair.CALLBACKS.MOVE / "move"]: function,
  [Sequencer.Crosshair.CALLBACKS.COLLIDE / "collide"]: function,
	[Sequencer.Crosshair.CALLBACKS.STOP_COLLIDING / "stopColliding"]: function,
	[Sequencer.Crosshair.CALLBACKS.INVALID_PLACEMENT / "invalidPlacement"]: function,
  [Sequencer.Crosshair.CALLBACKS.PLACED / "placed"]: function,
  [Sequencer.Crosshair.CALLBACKS.CANCEL / "cancel"]: function,
}
```

Crosshair callbacks tend to return the crosshair placeable object, which have a number of useful properties and functions:
- `crosshair.updateCrosshair()` - method that accepts an object, similar to the config object above, to update the crosshair
- `crosshair.isValid` - whether the crosshair is currently in a valid position
- `crosshair.range` - the current range between the location object and the crosshair in grid units (only available if a location object has been set)

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
