# Scrolling Text

### What is this?

This part of the Sequencer allows you to easily display scrolling text on the canvas, to simulate damage numbers or other text. It is a simpler version of effects, but still rocks a powerful API.

### How do I use this?

When creating a scrolling text section, you can assemble these methods like this:
```js
new Sequence()
    .scrollingText(token, "My Text")
    .play()
```
or more involved
```js
new Sequence()
    .scrollingText()
        .atLocation(token, { randomOffset: true })
        .text("My text", {
          "fill": "#ffffff",
          "fontSize": 35,
          "fontWeight": "bold",
          "lineJoin": "round",
          "strokeThickness": 3
        })
        .duration(1000)
    .play()
```

<hr/>

## Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` or `.waitUntilFinished(0, 250)`

Calling this method will cause the scrolling text to finish running before starting the next section.

Passing a number as a parameter will cause the scrolling text or sound to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the scrolling text.

Passing a second number will randomize the wait duration between the two given numbers.

## Async

`.async()`

Calling this will make each part of the scrolling text finish playing before the next section starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition (see `.repeats()` below), whilst `.waitUntilFinished()` is for the entire scrolling text section.

## Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the scrolling text to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

## Play if

`.playIf(boolean)` or `.playIf(inFunction)`

Causes the scrolling text not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the scrolling text or sound to play.

Below is an example of a function used in this method, which would cause this scrolling text to only be played about 50% of the time.
```js
.playIf(() => {
    return Math.random() < 0.5;
})
```

## Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the scrolling text from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

## Duration

`.duration(500)`

Sets the duration of the scrolling text. If the duration is longer than the scrolling text's original duration, it will loop.

## Locally

`.locally()` or `.locally(bool)`

Causes the scrolling text to be played only locally, and not push to other connected clients.

## For Users

`.forUsers(string)` or `.forUsers(array)`

Causes the scrolling text to be played for only a set of users.

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
- `gridUnits: boolean` - Used with `offset` to make each whole number represent in `x` and `y` to represent the scrolling text's scene's grid size

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
   .scrollingText()
      .atLocation(token)
      .text("My Text", style)
   .play()
```

Sets the text and styling of the scrolling text.

<a>https://pixijs.io/pixi-text-style/</a>

Use the JSON object as the options parameter for `.text()`


## Anchor

`.anchor(string|number)`

Sets the placement of the text's location on the location.

You can either set this with Foundry's native `CONST.TEXT_ANCHOR_POINTS`, or by giving it any of `CENTER`, `BOTTOM`, `TOP`, `LEFT`, or `RIGHT`.


## Direction

`.direction(string|number)`

Sets the direction the text's movement.

You can either set this with Foundry's native `CONST.TEXT_ANCHOR_POINTS`, or by giving it any of `CENTER`, `BOTTOM`, `TOP`, `LEFT`, or `RIGHT`.


## jitter

`.jitter(number)`

An amount of randomization between 0 and 1 applied to the initial position (also achieved with `.atLocation()`'s `randomOffset` property)
