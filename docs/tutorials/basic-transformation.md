This guide will cover the basics to play an effect on top of a token, and switch the token's image while the effect is playing.

We're going create a normal macro, which will use Sequencer to play effects from JB2A's asset pack on the token.

You can scroll to the bottom to find the [finished macro](#finished-macro).

![A token that transforms from a human into a werebear, and then back.](../images/basic-tutorials/transformation.gif)

<hr/>

# Macro

## Preword

You will see a lot of `> Macro so far` after every step. You can click on this to see what the macro should look like at that step.

<hr/>

## Required modules
* [Sequencer](https://foundryvtt.com/packages/sequencer)
* [JB2A - Jules & Ben's Animated Assets](https://foundryvtt.com/packages/JB2A_DnD5e) (or the patreon version)

<hr/>

## Steps:
1. [Create a new macro](#_1-Create-a-new-macro)
2. [Determine token transformation images](#_2-Determine-token-transformation-images)
3. [Pick the right image](#_3-Pick-the-right-image)
4. [Make a new Sequence](#_4-Make-a-new-Sequence)
5. [Start an effect section](#_5-Start-an-effect-section)
6. [Choose an animation for the effect](#_6-Choose-an-animation-for-the-effect)
7. [Choose the location to play the effect](#_7-Choose-the-location-to-play-the-effect)
8. [Add scaling and random rotation](#_8-Add-scaling-and-random-rotation)
9. [Wait for the effect to reach its peak](#_9-Wait-for-the-effect-to-reach-its-peak)
10. [Switch the token's image and play Sequence](#_10-Switch-the-tokens-image-and-play-Sequence)

<hr/>

### 1. Create a new macro

Start off by creating a new macro by clicking an empty hotbar space. If there are none, you can always create one through the Macro Directory by clicking the folder icon to the left of the bar, and then clicking **Create Macro**.

Remember to set the macro to **Type: script**!

<hr/>

### 2. Determine token transformation images

Now that you have a macro, let's figure out which images we should switch our token between. In my case, I'm transforming a token that looks like a man into a werebear, so I create two variables named `transformed` and `notTransformed`:

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";
```

But you can substitute whatever images you want between the quotes.

<hr/>

### 3. Pick the right image

So now we know which images to use, but not which one to switch to. Using this code, you'll be able to pick the right one:

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.document.texture.src === notTransformed ? transformed : notTransformed;
```

This means that if the currently selected token's image is the same as `notTransformed` (the token has not yet transformed), we assign `systems/dnd5e/tokens/humanoid/Werebear.webp` into the variable called `img`.

If the currently selected token **is** already transformed (it has the image of `systems/dnd5e/tokens/humanoid/Werebear.webp`), we instead assign `systems/dnd5e/tokens/humanoid/Thug.webp` to the variable `img`, which we will use later.

<hr/>

### 4. Make a new Sequence

So now that we know which image we're switching the selected token to, let's start playing an effect!

Simply add `new Sequence()` below the `let img` line.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
```

</details>

<hr/>

### 5. Start an effect section

Then add `.effect()` below the `new Sequence()` so that we're starting a new effect part in it.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
```

</details>

<hr/>

### 6. Choose an animation for the effect

Then choose which animation to play in the effect by adding `.file("modules/jb2a_patreon/Library/2nd_Level/Misty_Step/MistyStep_02_Regular_Blue_400x400.webm")` to the macro.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("modules/jb2a_patreon/Library/2nd_Level/Misty_Step/MistyStep_02_Regular_Blue_400x400.webm")
```

</details>

However, if you want to get fancy you can instead use the **Sequencer Database path** instead. You can get the Database Path to the misty step by simply clicking on this button:

![Sequencer Database button](../images/database-viewer-button.jpg)

If you search for `misty` in that, you'll see this:

![Sequencer Database UI](../images/basic-tutorials/misty-step-db.png)

Simply click on the `Database` button on the `jb2a.misty_step.02.blue`, and you'll have copied the **Sequencer Database path** to the effect.

Paste that into the `.file()` section. It is always recommended to use the Database Path, as it has a lot of features that the effects can use.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js

let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("jb2a.misty_step.02.blue")

```

</details>

<hr/>

### 7. Choose the location to play the effect

As we want to play it over the token, we can just play the effect **at** the **location** of the token.

You can do this by simply adding `.atLocation(token)` to the macro. Sequencer will then figure out how to play the effect at the location of the token.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(token)

```

</details>

<hr/>

### 8. Add scaling and random rotation

Currently, the effect doesn't take token size into account, so by adding `.scaleToObject(2.5)` you're scaling the total effect size to be 2.5x the size of the token. That may seem too big, but keep in mind that a lot of effects have a lot padding to give itself breathing room.

Then, you can also add `.randomRotation()` to make it randomly rotate the effect so it looks different every time.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(token)
        .scaleToObject(2.5)
        .randomRotation()

```

</details>

<hr/>

### 9. Wait for the effect to reach its peak

If we switch the image now, it will look like the token switches the image and then the effect plays. Ideally, we want to **wait** until the effect covers the entire token to make the switch. You can do that by simply adding `.wait(1500)` to the macro. This will cause it to wait 1500ms after starting to play the effect before continuing.

<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(token)
        .scaleToObject(2.5)
        .randomRotation()
    .wait(1500)

```

</details>

<hr/>

### 10. Switch the token's image and play Sequence

Now, all we have to do is actually switching the token's image. Since we want to wait for the effect to _almost_ finish, but not finish entirely, we'll need to continue with our sequence. Thankfully, it has a lot of tricks to help us with that. Simply add `.thenDo(() => {})` to the macro, but then between the `{}` add `token.document.update({ img });`.

This means that once the `.wait(1500)` finishes after 1500ms, **then** we'll **do** what we put inside of the `{}`. That'll switch the token's image at the perfect moment.

Then, at the very end, just add `.play()`. Think of the Sequence as the recipe, but in order to actually cook everything we've assembled (the effect, the wait, the token image switch), we need to `.play()` it.


<details>
  <summary><strong>Macro so far</strong></summary><br />

```js
let notTransformed = "systems/dnd5e/tokens/humanoid/Thug.webp";
let transformed = "systems/dnd5e/tokens/humanoid/Werebear.webp";

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("jb2a.misty_step.02.blue")
        .atLocation(token)
        .scaleToObject(2.5)
        .randomRotation()
    .wait(1500)
    .thenDo(() => {
        token.document.update({ img });
    })
    .play()

```

</details>

<hr/>

## Finished macro:

```js

let notTransformed = 'systems/dnd5e/tokens/humanoid/Thug.webp';
let transformed = 'systems/dnd5e/tokens/humanoid/Werebear.webp';

let img = token.data.img === notTransformed ? transformed : notTransformed;

new Sequence()
    .effect()
        .file("modules/jb2a_patreon/Library/2nd_Level/Misty_Step/MistyStep_02_Regular_Blue_400x400.webm")
        .atLocation(token)
        .scaleToObject(2.5)
        .randomRotation()
    .wait(1500)
    .thenDo(() => {
        token.document.update({ img });
    })
    .play()

```

![A token that transforms from a human into a werebear, and then back.](../images/basic-tutorials/transformation.gif)
