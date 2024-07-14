# API

## Creating A New Sequence

You can start a new Sequence by simply calling:
```js
new Sequence()
```
Any other methods you call on this will continue to work on the same sequence, like so:
```js
new Sequence()
     .thenDo(function(){
          console.log("I'm in here.")
     })
     .thenDo(function(){
          console.log("But now, I'm in here!")
     })
```

For module developers, by putting your module name in the Sequence like this:
```js
new Sequence({ moduleName: "myModuleName" })
```
Means that any errors will show up like this:

![Sequencer module error example](../images/error-example.jpg)

This will help you and your module's users to get to the bottom of the issue.

In addition, you can also add `softFail` like so:

```js
new Sequence({ moduleName: "myModuleName", softFail: true })
```

This will make sequencer consider all failures to find an effect file, sound file, or a macro a non-issue and simply continues executing the sequence, rather than halt the execution. 

## Core Methods

### Animation

`.animation()` or `.animation(inToken)` or `.animation(inTile)`

Creates an animation section. Until you call any of the [core methods](#sequencer-core-methods), you'll be working on the Animation section.

### Effect

`.effect()` or `.effect(inFile)`

Creates an effect section. Until you call any of the [core methods](#sequencer-core-methods), you'll be working on the Effect section.

### Sound

`.sound()` or `.sound(inFile)`

Creates a sound section. Until you call any of the [core methods](#sequencer-core-methods), you'll be working on the Sound section.

### Scrolling Text

`.scrollingText()` or `.scrollingText(inToken, inText, inTextStyles)`

Creates a scrolling text section. Until you call any of the [core methods](#sequencer-core-methods), you'll be working on the scrolling text section.

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

In Foundry v11, you can provide an object as a secondary parameter, which will be passed through to the macro:

`.macro("New Macro", { test: true, fileName: "fire-bolt", tokenId: token.id })`

In Foundry v10, if you have [Advanced Macros](https://foundryvtt.com/packages/advanced-macros) installed, you may also pass any number of parameters to the method that will then be passed through to the macro:

`.macro("New Macro", true, "fire-bolt", token.id)`

### Wait

`.wait(1000)` or `.wait(500, 1000)`

Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given a second number, a random wait time between the two given numbers will be generated.

### Add Sequence

`.addSequence(inSequence)`

Adds the sections from a given Sequence to this Sequence. This is useful if you have sequences you wish to combine at runtime.

### Play

`.play(inOptions)`

Returns `Promise`

Causes the Sequence to play through all of its sections. Returns a `Promise` which resolves when all sections have played.

Also supports an options object that accepts:
- `remote: boolean` - causes the sequence to be executed on each users' machine independently. This does not support `.animation()` sections when set to `true`
- `preload: boolean` - causes any section with `.file()` entries to preload all files that would be played
- `local: boolean` - causes sections to be played only locally to the user executing the sequence

### Preset

`.preset("name")`

Applies a preset to the sequence - read the [Sequencer Presets article](../presets.md) for more information.

Please note that some presets may require this to be called on an effect, sound, or animation section, rather than directly on the sequence.
