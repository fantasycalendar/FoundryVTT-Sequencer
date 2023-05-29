# Canvas Pan

### What is this?

This part of the Sequencer allows you to easily pan your canvas, or the canvas of other players.

### How do I use this?

When creating a canvas pan section, you can assemble these methods like this:

```js
new Sequence().canvasPan(token).play();
```

or more involved

```js
new Sequence()
  .canvasPan()
    .atLocation(token) // Set the location
    .duration(1000) // Pan over 1 second
    .scale(2) // Zoom in
    .lockView(5000) // Lock the view for 5 seconds
  .play();
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the canvas pan to finish running before starting the next section.

Passing a number as a parameter will cause the canvas pan to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the canvas pan.

Passing a second number will randomize the wait duration between the two given numbers.

## Play if

`.playIf(boolean)` or `.playIf(inFunction)`

Causes the canvas pan not to play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the canvas pan or sound to play.

Below is an example of a function used in this method, which would cause this canvas pan to only be played about 50% of the time.

```js
.playIf(() => {
    return Math.random() < 0.5;
})
```

## Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the canvas pan from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

## Duration

`.duration(500)`

Sets the duration of the canvas pan. If the duration is longer than the canvas pan's original duration, it will loop.

## Locally

`.locally()` or `.locally(bool)`

Causes the canvas pan to be played only locally, and not push to other connected clients.

## For Users

`.forUsers(string)` or `.forUsers(array)`

Causes the canvas pan to be played for only a set of users.

Accepts a single user ID or username (case-sensitive), or an array thereof.

## At Location

`.atLocation(object|string, object)`

Examples:

```js
.atLocation(token)
.atLocation({ x: 0, y: 0 })
.atLocation(token, { cacheLocation: true })
.atLocation(token, { randomOffset: true })
```

A smart method that can take:

- Reference to a token
- Reference to a template
- Direct coordinate on the canvas

Also supports a second options object that accepts:

- `cacheLocation: boolean` - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- `randomOffset: number|boolean` - causes the location to be offset by a random amount - if given a number, this acts as a multiplier for the randomness, using the size of the object (or a single grid square/hex) as the multiplier.
- `offset: object` (default `{ x: 0, y: 0 }`) - causes the location to be offset by a set amount
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the canvas pan's scene's grid size

## Lock View

`.lockView(number)`

Sets whether the view should be locked after moving, and for how long.

## Speed

`.speed(number)`

Sets how fast the canvas pan should move.

**Note:** this overrides any `.duration()` set duration.

## Scale

`.scale(number)`

Sets the scale of the viewpoint.

## Shake

`.shake()`

Shakes the viewport.

This function takes an object, which can contain these properties:

- `duration: number` (default `400`) - Number of milliseconds the shake should last
- `strength: number` (default `10`) - Strength of the shake, which is how far the shake should move in pixels (nominal between 10-35)
- `frequency: number` (default `25`) - Number of milliseconds each iteration of the shake should last (lower means faster shakes)
- `fadeInDuration: number` (default `0`) - Number of milliseconds it will take for the shake to blend in
- `fadeOutDuration: number` (default `125`) - Number of milliseconds it will take for the shake to blend out
- `rotation: boolean` (default `true`) - Whether the shake should also rotate the viewport
