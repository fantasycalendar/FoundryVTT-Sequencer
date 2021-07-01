## Table of Contents

### - Core Methods -
- [Then do](#then-do)
- [Macro](#macro)
- [Wait](#wait)
- [Animation](#animation)
- [Effect](#effect)
- [Sound](#sound)
- [Sequence](#sequence)

### - Generic Functions (animations, effects, and sounds) -
- [Wait Until Finished](#wait-until-finished)
- [Async](#async)
- [Repeats](#repeats)
- [Play if](#play-if)
- [Delay](#delay)
- [Fade in](#fade-in)
- [Fade out](#fade-out)
- [Duration](#duration)
- [Opacity](#opacity)

### - [Animation Methods](animations.md#animation-methods) -
- [On](animations.md#on)
- [Move Towards](animations.md#move-towards)
- [Rotate Towards](animations.md#rotate-towards)
- [Teleport To](animations.md#teleport-to)
- [Offset](animations.md#offset)
- [Closest Square](animations.md#closest-square)
- [Rotate](animations.md#rotate)
- [Rotate In](animations.md#rotate-in)
- [Rotate Out](animations.md#rotate-out)

### - [Effect Methods](effects.md#effect-methods) -
- [Base folder](effects.md#base-folder)
- [File](effects.md#file)
- [At location](effects.md#at-location)
- [Rotate Towards](effects.md#rotate-towards)
- [Reach Towards](effects.md#reach-towards)
- [Move Towards](effects.md#move-towards)
- [Move speed](effects.md#move-speed)
- [Name](effects.md#name)
- [Missed](effects.md#missed)
- [Add override](effects.md#add-override)
- [JB2A](effects.md#jb2a)
- [Start point](effects.md#start-point)
- [End point](effects.md#end-point)
- [Set mustache](effects.md#set-mustache)
- [Grid Size](effects.md#grid-size)
- [Scale](effects.md#scale)
- [Scale In](effects.md#scale-in)
- [Scale Out](effects.md#scale-out)
- [Anchor](effects.md#anchor)
- [Center](effects.md#center)
- [Rotation](effects.md#rotation)
- [Random rotation](effects.md#random-rotation)
- [Mirror](effects.md#mirror)
- [Randomize mirror](effects.md#randomize-mirror)
- [Rotate In](effects.md#rotate-in)
- [Rotate Out](effects.md#rotate-out)
- [Playback rate](effects.md#playback-rate)
- [Below tokens](effects.md#below-tokens)
- [Below tiles](effects.md#below-tiles)
- [Z-Index](effects.md#z-index)

### - [Sound Methods](sounds.md#sound-methods) -
- [File](sounds.md#file)
- [Volume](sounds.md#volume)

## Core Methods

### Then do

```js
.thenDo(function(){
    //do Stuff
})
```

Creates a section that will run a function. Remember that if you want your function to be asynchronous, and you want it to properly wait, you'll want to make the function into an `async` function:

```js
.thenDo(async function(){
    //do Stuff
})
```

### Macro

`.macro("MacroName")` or `.macro(macroReference)`

Creates a section that will run a macro based on a name or a direct reference to a macro. If the macro is not found, Sequencer will complain. Loudly.

It's expected that you pass a boolean as a second parameter if you wish the Sequencer to wait for the macro to finish.

`.macro("New Macro", true)`

### Wait

`.wait(1000)` or `.wait(500, 1000)`

Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given a second number, a random wait time between the two given numbers will be generated.

### Animation

`.animation()` or `.animation(inToken)` or `.animation(inTile)`

Creates an animation section. Until you call `.then()`, `.effect()`, `.sound()`, `.macro()` or `.wait()`, you'll be working on the Animation section.

### Effect

`.effect()` or `.effect(inFile)`

Creates an effect section. Until you call `.then()`, `.effect()`, `.sound()`, `.macro()` or `.wait()`, you'll be working on the Effect section.

### Sound

`.sound()` or `.sound(inFile)`

Creates a sound section. Until you call `.then()`, `.effect()`, `.sound()`, `.macro()` or `.wait()`, you'll be working on the Sound section.

### Sequence

`.sequence(inSequence)`

Adds the sections from a given Sequence to this Sequence. This is useful if you have sequences you wish to combine at runtime.

## Generic Methods

These methods can be called on animation, effect, and sound sections.

### Wait Until Finished

`.waitUntilFinished()` or `.waitUntilFinished(-500)` 

Calling this method will cause the section to finish running before starting the next section.

Passing a number as a parameter will cause the effect or sound to wait for the given number (in ms) after finishing playing before continuing to the next section.

If given a negative number, the Sequencer will continue to the next section early but continue playing the effect or sound.

### Async

`.async()`

Calling this will make each part of a section finish playing before the next one starts playing.

This differs from `.waitUntilFinished()` in the sense that `.async()` is for each repetition, whilst `.waitUntilFinished()` is for the entire section.

### Repeats

`.repeats(inRepetitions, inRepeatDelayMin, inRepeatDelayMax)`

Causes the effect or sound to be repeated `inRepetitions` times, with an optional delay.

As an option, you can give it `inRepeatDelayMin` for a static delay between repetitions, or `inRepeatDelayMin` and `inRepeatDelayMax` for a random delay between each call.

It is highly recommended that you do not load too many files at the same time, as Foundry might not be able to load all of them.

### Play if

`.playIf(inBool)` or `.playIf(inFunction)`

Causes the section not play, and skip all delays, repetitions, waits, etc. If you pass a function, the function should return something false-y if you do not want the effect or sound to play.

Below is an example of a function used in this method, which would cause this effect or sound to only be played about 50% of the time.
```js
.playIf(() => {
    return Math.random() < 0.5;
})
```

### Delay

`.delay(1000)` or `.delay(500, 1000)`

This will delay the section from being played for a set amount of milliseconds. If given a second number, a random delay between the two numbers will be generated.

### Fade in

`.fadeIn(duration, options = {ease: "linear", delay: 0})`

`.fadeIn(500)` or `.fadeIn(250, {ease: "easeOutQuint"})` or `.fadeIn(400, {ease: "easeOutCirc", delay: 100})`

Causes the animation target or effect to fade in when played

Check out what easings are available here: https://easings.net/

### Fade out

`.fadeOut(duration, options = {ease: "linear"})`

`.fadeOut(500)` or `.fadeOut(250, {ease: "easeOutQuint"})`

Causes the animation target or effect to fade out when it has finished playing

Check out what easings are available here: https://easings.net/

### Duration

`.duration(500)`

Sets the duration of the animation, effect, or sound.

If called on an animation, it sets how long the animation will take to complete.

If called on an effect or sound, it overrides its original duration, potentially causing it to loop.

### Opacity

`.opacity(0.5)`

Sets the opacity of the animation target or effect. If used with `.fadeIn()` and/or `.fadeOut()`, this defines what it will fade to/from.