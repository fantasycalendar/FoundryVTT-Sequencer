# Sequencer

![Latest Release Download Count](https://img.shields.io/github/downloads/fantasycalendar/FoundryVTT-Sequencer/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge) [![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fsequencer&colorB=006400&style=for-the-badge)](https://forge-vtt.com/bazaar#package=sequencer) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fgithub.com%2Ffantasycalendar%2FFoundryVTT-Sequencer%2Freleases%2Flatest%2Fdownload%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange&style=for-the-badge) ![Latest Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fgithub.com%2Ffantasycalendar%2FFoundryVTT-Sequencer%2Freleases%2Flatest%2Fdownload%2Fmodule.json&label=Latest%20Release&prefix=v&query=$.version&colorB=red&style=for-the-badge)


![Animation showing the Sequencer](images/Animation2.gif)

---

<img src="https://app.fantasy-calendar.com/resources/computerworks-logo-full.png" alt="Fantasy Computerworks Logo" style="width:250px;"/>

A module made by Fantasy Computerworks.

Other works by us:
- [Fantasy Calendar](https://app.fantasy-calendar.com) - The best calendar creator and management app on the internet
- [Item Piles](https://foundryvtt.com/packages/item-piles) - Drag & drop items into the scene to drop item piles that you can then easily pick up
- [Potato Or Not](https://foundryvtt.com/packages/potato-or-not) - Automatically set up Foundry to the best visual settings for your players' potato computers
- [Tagger](https://foundryvtt.com/packages/tagger) - Tag objects in the scene and retrieve them with a powerful API

Like what we've done? Buy us a coffee!

<a href='https://ko-fi.com/H2H2LCCQ' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

---

## What Is Sequencer?

Sequencer is a powerful module that allows you and other module creators to quickly and easily play visual effects in your scenes, attaching them to tokens or other objects, animating them, ending them easily and quickly, play sounds for all or specific players, run macros one after another in a controlled way, and so much more.

## Effects shown in this readme
* [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e) (Full paid version [here](https://www.patreon.com/JB2A))
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

# Advanced examples

## Teleportation Usage Example

### This example uses [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)

![Animation showing the Sequencer](images/Animation2.gif)

To get the following result:

* Plays an effect on a token's location
* Wait for 400 milliseconds
* Play a sound
* Wait for 600 milliseconds
* Play another effect pointing towards 5 squares to the left of the token
* Wait for 100 milliseconds
* Teleport the token 5 squares to the left
* Play another effect on the token's location

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
            x: tokenD.center.x + canvas.grid.size*5,
            y: tokenD.center.y
        })
    .wait(100)
    .animation()
        .on(tokenD)
        .teleportTo({
            x: tokenD.x + canvas.grid.size*5,
            y: tokenD.y
        })
        .waitUntilFinished()
    .effect()
        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
        .atLocation(tokenD)
        .scale(0.5)

sequence.play();
```

## Magic Missile

### Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)

![One token firing three magic missiles on another token](images/magic_missile.gif)
```js
new Sequence()
    .effect()
        .atLocation(canvas.tokens.controlled[0])
        .reachTowards(canvas.tokens.controlled[1])
        .file("jb2a.magic_missile")
        .repeats(3, 200, 300)
        .randomizeMirrorY()
    .play();
```

## Magic Circle

![A magic circle fading, rotating, and scaling in, then fading, rotating, and scaling out](images/scalerotationfade.gif)

```js
new Sequence()
    .effect()
        .file("modules/jb2a_patreon/Library/Generic/Magic_Signs/Abjuration_01_Blue_Circle_800x800.webm")
        .atLocation(canvas.tokens.controlled[0])
        .scaleToObject(2)
        .belowTokens()
        .fadeIn(1500, {ease: "easeOutCubic", delay: 500})
        .fadeOut(1500)
        .rotateIn(90, 2500, {ease: "easeInOutCubic"})
        .rotateOut(350, 1500, {ease: "easeInCubic"})
        .scaleIn(2, 2500, {ease: "easeInOutCubic"})
        .scaleOut(0, 1500, {ease: "easeInCubic"})
    .play()
```

*Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)*

## Lightning Strike

### Uses [JB2A - Jules&Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e)

![Random lightning strikes on a token](images/lightning_strike.gif)

```js
new Sequence()
    .effect()
        .atLocation(canvas.tokens.controlled[0])
        .file('Images/Effects/Lightning/LightningStrike_01{{letter}}_800x800.webm')
        .setMustache({
            // random letter between a to f
            "letter": () => {
                const letters = ['a', 'b', 'c', 'd', 'e', 'f']; 
                return letters[Math.floor(Math.random() * letters.length)];
            }
        })
        .scale(2)
        .randomizeMirrorX()
    .play();
```

## Acid Splash

### Uses [Jack Kerouac's Animated Cartoon Spell Effets](https://foundryvtt.com/packages/animated-spell-effects-cartoon)

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

## <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> [Documentation & Guides](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki) <img src="images/siren.gif" width="18px" height="18px" alt="Siren">
Click the link above to go to the documentation where each feature is listed.

## [Changelog](./changelog.md)

## Credits
### Feedback and amazing help
* U-man over at [FXMaster](https://gitlab.com/mesfoliesludiques/foundryvtt-fxmaster) for his implementation of layers - Copyright © 2020 Emmanuel Ruaud
* Otigon with his [Automated Animations](https://github.com/otigon/automated-jb2a-animations) for his work on handling standardized effects - Copyright © 2020 Otigon
* ghost (ghost#2000 on discord) for his fixes to the audio sections
* Kandashi (Kandashi#6698 on discord) for the inspiration and code of persistent effects
* Naito (Naito#1235 on discord) for his assistance with improving the Database Viewer's speed
* League of Extraordinary FoundryVTT Developers for their ongoing support and suggestions
* Foundry VTT Core code for heaps of inspiration

### Oujia Board Scene
- Code - Copyright © 2020 md-mention2reply
- Art - Copyright © 2020 Matheus Moreno Mota
- Sound - https://99sounds.org/license/
- Image - https://pixabay.com/service/license/

### Other Attributions
- [Easing Functions Cheat Sheet](https://easings.net/) ([GitHub](https://github.com/ai/easings.net)) - Copyright © 2020 Andrey Sitnik and Ivan Solovev
