![Animation showing the Sequencer](images/Animation2.gif)

# Sequencer

This module implements a basic pipeline that can be used for managing the flow of a set of functions, effects, sounds, and macros.

## Effects shown in this readme
* [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e) (Full paid version [here](https://www.jb2a.com/))
* [Jack Kerouac's Animated Spell Effects](https://foundryvtt.com/packages/animated-spell-effects)
* [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)

## Download here:
[https://github.com/FantasyCalendar/FoundryVTT-Sequencer/releases/latest/download/module.json](https://github.com/FantasyCalendar/FoundryVTT-Sequencer/releases/latest/download/module.json)

## <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> [Documentation & Guides](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki) <img src="images/siren.gif" width="18px" height="18px" alt="Siren">
Click the link above to go to the documentation where each feature is listed.

## How to use
First you have to define a sequence:

```js
let sequence = new Sequence()
```

Then, you can add functions and effects to it.

```js
let sequence = new Sequence()

sequence.thenDo(function(){
    do_something();
})

sequence.wait(200)

sequence.thenDo(async function(){
    do_something_else();
})
```

The Sequencer uses a method-chaining fluent interface, meaning you can continuously call functions on the sequence object, like so:

```js
let sequence = new Sequence()
    .thenDo(function(){
        do_something();
    })
    .wait(200)
    .thenDo(async function(){
        do_something_else();
    })
```

To start the sequence off, you simply call `play()` on the sequence.

[⬇️ Go to advanced examples ⬇️](https://github.com/Haxxer/FoundryVTT-Sequencer#advanced-examples)

## Usage Example

To getEntry the following result:

* Plays an effect on a token's location
* Wait for 400 milliseconds
* Play a sound
* Wait for 600 milliseconds
* Play another effect pointing towards 500px to the left of the token
* Wait for 100 milliseconds
* Teleport the token 500px to the left
* Play another effect on the token's location

![Animation showing the Sequencer](images/Animation2.gif)

*Uses [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)*

You'd have to write something like this (with FXMaster installed):

```js
async function wait(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

const token = canvas.tokens.controlled[0];

let data = {
    file: "modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electrivity_blast_CIRCLE.webm",
    position: token.center,
    anchor: {
        x: 0.5,
        y: 0.5
    },
    scale: {
        x: 0.35,
        y: 0.35
    }
};

game.socket.emit("module.fxmaster", data);
canvas.fxmaster.playVideo(data);

await wait(400);

AudioHelper.play({
    src: ["Music/Sound_Effects/teleport.wav"],
    volume: 0.8,
    autoplay: true,
    loop: false
}, true);

await wait(600);

let to_location = {
    x: token.center.x+500,
    y: token.center.y
}

let ray = new Ray(token.center, this._to);

data = {
    file: "modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_05.webm",
    position: token.center,
    anchor: {
        x: 0.5,
        y: 0.5
    },
    scale: {
        x: 0.2,
        y: 0.2
    },
    rotation: ray.angle,
    width: ray.distance
};

game.socket.emit("module.fxmaster", data);
canvas.fxmaster.playVideo(data);

await wait(100);

await token.update({ x: token.position.x+500, y: token.position.y }, { animate: false });

data = {
    file: "modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm",
    position: token.center,
    anchor: {
        x: 0.5,
        y: 0.5
    },
    scale: {
        x: 0.5,
        y: 0.5
    }
};

game.socket.emit("module.fxmaster", data);
canvas.fxmaster.playVideo(data);
```

Here's an example using the Sequencer instead:

```js
let tokenD = canvas.tokens.controlled[0];
let sequence = new Sequence()
    .effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electrivity_blast_CIRCLE.webm")
        .atLocation(tokenD)
        .scale(0.35)
    .wait(1000)
        .effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_05.webm")
    .atLocation(tokenD)
        .reachTowards({
            x: tokenD.center.x + canvas.grid.size*4,
            y: tokenD.center.y
        })
    .wait(100)
    .animation()
        .on(tokenD)
        .teleportTo({
            x: tokenD.x + canvas.grid.size*4,
            y: tokenD.y
        })
        .waitUntilFinished()
    .effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
        .atLocation(tokenD)
        .scale(0.5)

sequence.play();
```

# Advanced examples

## Magic Missile

![One token firing three magic missiles on another token](images/magic_missile.gif)
```js
new Sequence()
    .effect()
        .atLocation(canvas.tokens.controlled[0])
        .reachTowards(canvas.tokens.controlled[1])
        .baseFolder("Images/Effects/Magic_Missile")
        .startPoint(200)
        .endPoint(200)
        .setMustache({
            "color": () => {
                return ['Blue', 'Green', 'Purple', 'Yellow'][Math.floor(Math.random() * 4)]
            },
            "number": () => {
                return Math.floor(Math.random() * 9) + 1;
            }
        })
        .addOverride(
            async (effect, data) => {
                if(data.distance <= 1800){
                    data.file = "MagicMissile_01_Regular_{{color}}_30ft_0{{number}}_1600x400.webm";
                }else{
                    data.file = "MagicMissile_01_Regular_{{color}}_60ft_0{{number}}_2800x400.webm";
                }
                return data
            }
        )
        .repeats(3, 200, 300)
    .play();
```

*Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)*

## Magic Circle

![A magic circle fading, rotating, and scaling in, then fading, rotating, and scaling out](images/scalerotationfade.gif)

```js
new Sequence()
    .effect()
        .file("modules/jb2a_patreon/Library/Generic/Magic_Signs/Abjuration_01_Blue_Circle_800x800.webm")
        .atLocation(canvas.tokens.controlled[0])
        .JB2A()
        .scale(0.5)
        .belowTokens()
        .fadeIn(1500, {ease: "easeOutCubic", delay: 500})
        .fadeOut(1500)
        .rotateIn(90, 2500, {ease: "easeInOutCubic"})
        .rotateOut(350, 1500, {ease: "easeInCubic"})
        .scaleIn(1, 2500, {ease: "easeInOutCubic"})
        .scaleOut(0, 1500, {ease: "easeInCubic"})
    .play()
```

*Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)*

## Lightning Strike

![Random lightning strikes on a token](images/lightning_strike.gif)

```js
new Sequence()
    .effect()
        .atLocation(canvas.tokens.controlled[0])
        .file('Images/Effects/Lightning/LightningStrike_01{{letter}}_800x800.webm')
        .setMustache({
            // random letter between a to f
            "letter": String.fromCharCode(Math.floor(Math.random()*6)+1+64).toLowerCase()
        })
        .scale(2)
        .randomizeMirrorX()
    .play();
```

*Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)*

## Acid Splash

![Acid splash hitting two tokens with random rotation and scales](images/acid_splash.gif)

```js
new Sequence()
    .effect("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
        .atLocation(canvas.tokens.controlled[0])
        .scale(0.3, 0.6)
        .randomRotation()
    .effect("modules/animated-spell-effects-cartoon/spell-effects/cartoon/water/acid_splash_CIRCLE_01.webm")
        .atLocation(canvas.tokens.controlled[1])
        .scale(0.3, 0.6)
        .randomRotation()
    .play();
```

*Uses [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)*

## Changelog

### Version 0.6.8 Hotfix
- *Sequencer* - Fixed database not correctly finding range-based effects

### Version 0.6.7 
- *Effects & Sounds* - Fixed `.locally()` and `.forUsers()` sometimes erroneously remembering users between different effects & sounds
- *Effects* - Fixed `.scaleIn()` would not take a custom `.size()` into account
- *Effects* - Fixed static images sometimes not playing due to duration being set to 0ms

### Version 0.6.6
- *Sequencer* - Added support for preloading files based on database paths
- *Effects & Sounds* - Added `.locally()` and `.forUsers()`, which allow you to control which users will have the effect and sounds played for them 
- *Effects* - Improved positional handling of Tiles and TileDocuments 

### Version 0.6.5
- *Sequencer* - Updated Sequencer Database Viewer layout to be more user friendly
- *Effects* - Fixed bug with templates and raw positions not being respected

### Version 0.6.4
- *Sequencer* - Added Sequencer Database Viewer to the module settings, it allows you to preview effects and copy any files registered with Sequencer by other modules
- *Sequencer* - Added client-side settings for users to be able to turn off effects and sounds being played locally
- *Effects & Sounds* - Fixed effects and sounds playing on scenes they did not originate from
- *Effects* - Added `.size()`, which sets the width and height of the effect in pixels
- *Effects* - Added `rotate` option to `.moveTowards()`, which defaults to true. If set to false, the effect will not rotate towards the end location. 
- *Effects* - Fixed duration of effects using `.moveTowards()` not being calculated correctly
- *Effects* - Fixed static image effects' durations also not being calculated correctly 

### Version 0.6.3 Hotfix
- *Effects* - Fixed effects failing to play static images

### Version 0.6.2
- *Sequencer* - Further small fixes to how the database registers files

### Version 0.6.1
- *Sequencer* - Removed the need for `.playIf()` to have to be given a function or a boolean
- *Sequencer* - Fixed issues with the database when files were listed in arrays

### Version 0.6.0
**Breaking:**
- *Effects* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.JB2A()` has been altered to set the gridsize to 200, as it was previously set to 100 - this will halve the size all JB2A on-the-spot effects, sorry! <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

**Additions:**
- *Sequencer* - Added `SequencerPreloader` - you can now preload images, effects, and sounds for your players, read more on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Preloader)
- *Sequencer* - Added support for templates and time ranges in database structure, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database)
- *Effects* - Added support for static images such as webp, pngs, jpgs, etc
- *Effects & Sounds* - Added `.startTime()`, `.startTimePerc()`, `.endTime()`, `.endTimePerc()`, and `.timeRange()`, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#start-time)
- *Sounds* - Added `.addOverride()`, `.baseFolder()`, and `.setMustache()` support to sounds

**Updates & Fixes:**
- *Sequencer* - `.play()` now reliably resolves its promise at the end of the entire sequence
- *Effects* - *Vastly* improved effect caching and loading speed of effects and sounds 
- *Effects* - Improved object position handling slightly when providing non-foundry class objects to `.atLocation()` and alike
- *Effects* - Generally improved compatibility with `TokenDocument` and Foundry D&D 5E documents when getting their positions

### Version 0.5.9
- *Effects* - Added `.addPostOverride()` as an alternative to `.addOverride()`, which executes at the end of the effect data sanitation
- *Effects* - Fixed `.gridSize()`, `.startPoint()`, and `.endPoint()` not being respected and being overridden by internal logic 

### Version 0.5.8 Hotfix
- *Macros* - Fixed macros throwing error when playing sequence

### Version 0.5.7
- *Effects* - Fixed templates sometimes not being found
- *Effects* - Re-added backwards compatibility with old macros that still use `data._distance` in overrides 

### Version 0.5.6
- *Sequencer* - Added alpha version of the Sequencer Database Viewer
- *Effects* - Added `.randomOffset()` which can add a random offset similar to `.missed()`, but *within* the bounds of the target token / tile / other. Check out the docs!
- *Effects* - Fixed `.waitUntilFinished()` not being respected 
- *Effects* - Fixed `.offset()` throwing an error about a missing function
- *Effects* - Fixed `.repeats()` throwing an error, because the entire function went missing in the last update >.>

### Version 0.5.5 Hotfix
- *Effects* - Fixed effects sometimes not playing

### Version 0.5.4 Hotfix
- *Effects* - Fixed melee attacks not picking the right JB2A template

### Version 0.5.3
- *Sequencer* - Added sound to the Hyperspeed Sample thanks to the wonderful AurelTristen over at [HellScape Tabletop Assets](https://www.patreon.com/HellScapeAssets) (even though they're not specifically focused on sound effects)
- *Effects* - Fixed major issue with JB2A templates, causing effects to pick the wrong ranged attacks & other shenanigans
- *Effects* - Fixed effect scale inconsistencies across scenes with different grid sizes

### Version 0.5.2
- *Sequencer* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for Foundry Version 0.7.x <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Refactored animations into a dedicated animation engine
- *Effects* - Added support for static image effects (.jpeg, .png, etc)
- *Effects* - Fixed grid size sometimes not being taken into account when playing effects with `.reachTowards()` 
- *Sounds* - Vastly improved and fixed sound implementation, big thanks to ghost#2000!
- *Sounds* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for `.fadeIn()` and `.fadeOut()` in Sounds <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

### Version 0.5.1
- *Sequencer* - Added two sample scenes with macros and accompanying art:
    - An animated Oujia board made by md-mention2reply
    - A Star Wars inspired hyperspeed scene-switching scene, effects, and macro
- *Sequencer* - Removed Token Ease as dependency until we can solve its conflicts with other modules
- *Effects* - Fixed effects not auto-centering on tokens
- *Effects* - Fixed effects not finding the proper location when a previous effect's `.name()` was given
- *Animations* - Fixed `.rotate()`, `.opacity()`, and `.volume()`, now they work even without having to use their respective in/out functions

### Version 0.5.0
- *Sequencer* - Module now depends on [Token Ease](https://github.com/fantasycalendar/FoundryVTT-TokenEase)
- *Sequencer* - Added the Sequencer Database to help content creators! Read more on the [database documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database) how to use it!
- *Effects & Sounds* - Added support for database entries to the `.file()` method - more info can be found in the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#file)
- *Animations, Effects & Sounds* - Added the following functions:
  - `.audioVolume()`
  - `.fadeInAudio()`
  - `.fadeOutAudio()`
- *Effects* - Added support for delays on these methods (e.g. a delay of -500 means it will finish 500ms before the end of the duration):
  - `.rotateOut()`
  - `.fadeOut()`
  - `.scaleOut()`
  - `.fadeOutAudio()`
- *Animations* - Fixed `.rotateTowards()` to properly rotate towards the target without having to add an offset to properly line them up
- *Effects* - Made effects more intelligent when determining locations when given partial object data with `_id` entries
- *Effects* - Fixed issues surrounding delays and fades
- *Sounds* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.fadeIn()` and `.fadeOut()` will become deprecated in a future version, please switch to `.fadeInAudio()` and `.fadeOutAudio()` <img src="images/siren.gif" width="12px" height="12px" alt="Siren">   

### Version 0.4.6 Hotfix
- *Effects* - Fixed effects not playing on tokens on 0.7.10 and below

### Version 0.4.5
- *Effects* - Added `.offset()` so that you can offset the effect - an optional parameter allows you to offset in local or canvas space 
- *Animations* - Added `.snapToSquare()`, which causes the given object to be snapped to the square it is moving or teleported towards
- *Animations* - Fixed `.rotateIn()` and `.rotateOut()` not properly calculating rotation
- *Animations* - Adjusted `.rotateTowards()` to instead consider the target position as the rotation origin, rather than the object's current position

### Version 0.4.4
- *Animations* - Added `.animation()` section - animate tokens and tiles! Check out the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Animations) how to use it!
- *Effects* - Added official support for tiles in `.atLocation()`, `.moveTowards()`, etc
- *Effects* - Tweaked how effects getEntry locations when dealing with raw template data
- *Sequencer* - Added `.sequence()` so you can combine multiple sequences into one
- *Sequencer* - Updated all sample macros to 0.8.x conventions

### Version 0.4.3 Minor Fixes
- *Effects* - Removed error catch in `.file()` when providing it with something else than string or array
- *Effects* - Fixed `.belowTokens()` and `.belowTiles()` throwing errors if no boolean was provided

### Version 0.4.2 Hotfix
- *Effects* - Added `.rotate()` which adds an offset to the effect's rotation
- *Effects* - Fixed `.moveTowards()` not respecting given easing

### Version 0.4.1
- *Sequencer* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> **Breaking Changes**: Removed deprecated `.then()` method <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Tweaked `.play()` to now return a promise
- *Sequencer* - Reworked module class structure
- *Sequencer* - Added debug setting

### Version 0.4.0
- *Sequencer* - Renamed `.then()` to `.thenDo()` due to JavaScript reasons — <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.then()` will be removed in 0.4.1 <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Removed the requirement to pass `true` as a second argument to `.then()` (now `.thenDo()`) if the function was async, it will now wait for it to finish if it is an `async function`
- *Effects* - Added `.mirrorX()` and `.mirrorY()` to mirror the effect on that axis
- *Effects* - Improved `.JB2A()` to better handle melee weapon attacks
- *Effects* - Tweaked `.belowTiles()` and `.belowTokens()` to accept an optional boolean parameter whether the effect should play behind the respective element
- *Effects* - Tweaked effects to assume that .webms have a base 100px internal grid for size consistency

### Version 0.3.13 Hotfix
- *Effects* - Fixed ANOTHER bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.12
- *Effects* - Added `.opacity()` which controls the alpha of the effect being played
- *Effects* - Fixed bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.11
- *Effects* - Added `.belowTiles()` to play effects below tiles
- *Effects* - Implemented better order handling - the effects created first will always be on top, each subsequent effect will be played below the previous
- *Effects* - Added `.zIndex()` for you to have direct control over the order of effects
- *Effects & Sounds* - Added `.duration()` which can override the duration of an effect or sound
- *Effects & Sounds* - Tweaked `.waitUntilFinished()` to accept a single number parameter as a delay or to end the effect or sound earlier - read more in the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#wait-until-finished)
- *Sounds* - Added support for `.fadeIn()` and `.fadeOut()` - easing sadly doesn't work for sounds yet

### Version 0.3.10
- *Sequencer* - Added macro pack containing examples of Sequencer usages
- *Effects* - Added the following animated functions:
  - `.scaleIn()`
  - `.scaleOut()`
  - `.rotateIn()`
  - `.rotateOut()`
  - All of these can utilize any of the easings listed here: https://easings.net/
  - Read the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#scale-in) how to use these
- *Effects* - Added better error reporting when something goes wrong in the sequence
- *Effects* - Fixed bug with scale sometimes overriding `.reachTowards()`

### Version 0.3.9
- *Effects* - Added `.belowTokens()` so you can now play effects, well, below tokens  
- *Effects* - Fixed effects not replicating properly (AGAIN)
- *Effects* - Fixed effects not being able to use `.name()`d effects if they didn't miss - now any effect can be named and be used in future effects

### Version 0.3.8 Hotfix
- *Effects* - Fixed effects that were supposed to be once-off instead looping  

### Version 0.3.7
- *Effects* - Added `.moveTowards()` and `.moveSpeed()` for missile-like behavior
- *Effects* - Tweaked the way the effects layer is applied to the canvas' layers
- *Effects* - Fixed major issue with the way effects that were using `.missed()` and `.name()` were cached
- *Sequencer* - Removed stray debug code

### Version 0.3.6
- *Effects* - Added `.fadeIn()` and `.fadeOut()` - you can now make your effects look slightly nicer!
- *Effects* - Added support for cone and line templates with `.reachTowards()` and `.rotateTowards()` - it now reaches towards the end point of the template
- *Effects* - Added `.name()` to effects - this will cause the effect's position to be stored and can then be used with `.atLocation()`, `.reachTowards()`, and `.rotateTowards()` to refer to previous effects' locations
    - Example: naming an impact effect with `.name("hit_location")` and making it miss with `.missed()`, and then have a subsequent effect use `.rotateTowards("hit_location")` to rotate towards the previous effect's calculated location
- *Effects* - Fixed `.scale()` bug that caused it to not properly set the scale and then cause an error upon calling `.play()`
- *Effects* - Removed `.moves()` for future implementation
- *Sequencer* - Tweaked `.async()` and `.waitUntilFinished()` handling
    - They now act the same on effect and sounds that only play once, but if it `.repeats()`, `.async()` causes the effect or sound to wait between each repetition, `.waitUntilFinished()` causes the sequencer to wait until the effect or sound has finished executing all of its repetitions, which may or may not wait for each effect or sound to play with `.async()`
- *Sequencer* - Calling `.play()` now returns the sequence
- *Sequencer* - Removed `FXMaster` dependency and implemented a custom canvas layer and effects class 

### Version 0.3.5 Hotfix
- *Sequencer* - Fixed `.wait()` breaking due to the `.async()` and `.waitUntilFinished()` swap

### Version 0.3.4 Hotfix
- *Effects* - Fixed issue that caused the wrong scale to be applied when using `.reachTowards()`

### Version 0.3.3
- *Effects* - Added `.playIf()` ([docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#play-if)); this allows you to completely ignore playing an effect or sound, depending on a boolean or a function
- *Sounds* - Added support for `.async()` and `.waitUntilFinished()` for sounds - requires both to be `true` due to code weirdness, I'll be refactoring this in the future
- *Effects* - Refactored `.scale()` when it was provided with a minimum and maximum value, it now randomizes the scale of the effect when executed instead of when the method was called
- *Effects & Sounds* - Refactored `.file()` for both effects and sounds so that providing an array of files no longer immediately picks one from the array, but randomly picks a file each time the section is executed
- *Effects & Sounds* - Refactored how `.delay()` interacted with `.repeats()`, which should result in more consistent behavior
- *Sequencer* - Swapped the functionality of `.async()` and `.waitUntilFinished()`, and clarified in the docs
- *Sequencer* - Added support for random range within a `.wait()` block (like, `.wait(500, 1000)` etc)

### Version 0.3.2 - 0.8.x ready!
* *Effects* - Added `.playbackRate()` to effects, you can now speed up the play rate of your effects
* *Sequencer* - Tweaked internal handling of `.async()` together with `.waitUntilFinished()` improved
* *Sequencer* - Tweaked to use `ready` instead of `init` to load module

### Version 0.3.1
- *Effects* - Refactored `.randomizeMirror()` into `.randomizeMirrorX()` and `.randomizeMirrorY()`
- *Effects* - Refactored scaling algorithm for `.reachTowards()`
- *Sequencer* - Added support for random `.wait()` interval 

### Version 0.3.0
- *Effects* - Refactored `.aimTowards()` into `.rotateTowards()` and `.reachTowards()`
- *Effects* - Refactored how `.missed()` chooses the location to hit and now takes token size into account
- *Effects* - Added `.JB2A()` to automatically set the effect to handle their sprites in the best way possible
- *Effects* - Added `.randomizeMirror()` to randomly mirror sprites on the Y axis
- *Effects* - Added Mustache support in file names

### Version 0.2.0
- *Sequencer* - Added support for executing macros
- *Sequencer* - Added support for playing sounds
- *Sequencer* - Wrapped classes in proxies to simplify fluid interface (gets rid of `.done()` on effects and sounds)

### Version 0.1.0
- First implementation

## Credits
### Feedback and amazing help
* U-man over at [FXMaster](https://gitlab.com/mesfoliesludiques/foundryvtt-fxmaster) for his implementation of layers - Copyright © 2020 Emmanuel Ruaud
* Otigon with his [Automated Animations](https://github.com/otigon/automated-jb2a-animations) for his work on handling standardized effects - Copyright © 2020 Otigon
* ghost (ghost#2000 on discord) for his fixes to the audio sections
* League of Extraordinary FoundryVTT Developers for their ongoing support and suggestions

### Oujia Board Scene
- Code - Copyright © 2020 md-mention2reply
- Art - Copyright © 2020 Matheus Moreno Mota
- Sound - https://99sounds.org/license/
- Image - https://pixabay.com/service/license/

### Hyperspeed Scene
- Hyperdrive Animations - Copyright © 2020 Adam Oresten
- Sounds [HellScape Tabletop Assets](https://www.patreon.com/HellScapeAssets) - Copyright © 2020 AurelTristen
- Sci-fi Cockpits - Copyright © 2020 Vattalus Assets

### Other Attributions
- [Easing Functions Cheat Sheet](https://easings.net/) ([GitHub](https://github.com/ai/easings.net)) - Copyright © 2020 Andrey Sitnik and Ivan Solovev
