In this guide, I'll be walking you through how Sequencer works, and how you can use it.

## What is the Sequencer?

The Sequencer is a module that allows you to write macros in a way that is easier for novices to read but still retain the flexibility of "normal" code. It's still _relatively_ complex, but the flow of the macro is easier to follow than straight-up code.

Sequencer is not only easy to read, but is also allows you to set up a flow of actions that happen one after another. Code can still do this, but not by "default", you'd have to write your own wait functions, know how promises work, etc, etc.

## How do I use it?

Well, that depends on what you're trying to do! Sequencer's first and primary use was to play effects on the canvas, but it's become a lot more than just that.

If you're trying to play a sound, move a token, play effects on the canvas, hide a tile, Sequencer can do all of that, and more.

## Basic Sequence

To start off, create a new macro. You can do this by clicking any empty space in the hotbar. Remember to set your macro to type **script**.

Now, type into the macro text field:
```js
new Sequence()
```
And you've started to work on the sequence! You might ask, "Why is there no variable? Why is it just `Sequence`, and nothing else?"

That's because the Sequencer is something fancy called a "fluent interface". In short, you continuously work on the same thing, over and over. To make the sequence do something, you'll have to add a **section**.

If you wanted to play a sound with this sequence, all you'd do is then:
```js
new Sequence()
    .sound("path/to/sound.wav")
```
From then on, all you're working on is the _sound_. Since you did `.sound()`, sequencer then knows that you're going to be working on that specific sound.

But, that's not all, you'll have to tell the sequence that you want it to _play_.
```js
new Sequence()
    .sound("path/to/sound.wav")
    .play()
``` 

Once you run this macro, the sequence will start, play the sound, and finish!

Keep in mind that `.play()` doesn't play the _sound_, it plays the _Sequence_. This is important, because when you add multiple sections, you start to dive into the Sequencer properly.

## Multiple sections

Say for example that you wanted to play several sounds at the same time, you would simply do this:
```js
new Sequence()
    .sound("path/to/sound.wav")
    .sound("path/to/another/sound.wav")
    .play()
``` 
Once you run this macro, you'll immediately play both sounds at the same time!

## What is a section?

When you write a sequence, you have to keep in mind that each part could be considered a "section". A section could be a sound section, or an effect section, or an animation section.

When you write:
```js
new Sequence()
    .sound("path/to/sound.wav")
```
Anything you do from then on is working on the _sound section_ for the sound `path/to/sound.wav`. When you write another `.sound()` section after that one, you stop working on the first, and you're now working on the **new sound**.

But what if you wanted the second sound to wait for the first to finish before playing?

## Sections and methods

Like I've said multiple times, when you first do `.sound()`, you then work on that sound section. That means that you can then put any of the [sound methods](api/sound.md) on it!

For example, a sound can be made to wait until it finishes playing by adding `.waitUntilFinished()`, like this:
```js
new Sequence()
    .sound("path/to/sound.wav")
        .waitUntilFinished()
    .sound("path/to/another/sound.wav")
    .play()
``` 
You see how I put `.waitUntilFinished()` further to the right than the rest of the code? That helps me identify that it is affecting the first sound. You don't have to do this, but it helps make the code easier to read.

If you now run this macro, you'll play the first sound, then _wait until it finishes_, and then play the second sound.

## For loops and sequences

When you want to play multiple effects on the canvas, but the amount of effects change, then you can always use for loops, even with Sequencer.

But, how would you break up sequences effectively? Most of the time, you'll see macros just containing `new Sequence()` and then all of its sections, but you can always assign sequences to variables.

A variable is a keyword that holds information, in this case, this is how you would create a new variable:

```js
let variable = "I am a variable";
```

After you have done this, you can use `variable` to refer to this specific string anywhere in your code, such as: 

```js
let variable = "I am a variable";
console.log(variable);
```

The same works for sequences:

```js
let mySequence = new Sequence();
```

From now on, you can refer to this sequence with `mySequence` - which allows you to do many cool things. Taking the sound example from above, you could do:

```js
let mySequence = new Sequence();

mySequence.sound("path/to/sound.wav").waitUntilFinished();
mySequence.sound("path/to/another/sound.wav");

mySequence.play();
```

This is functionally the same as the previous sound example. But how would you do this for effects?

Since you've already defined your sequence as `mySequence`, you can then begin to loop through your arrays. In this case, we'll be looping through the current user's targeted tokens. The way we loop through targets is by using the `for` loop functionality in JavaScript:

```js
let mySequence = new Sequence();

for(let target of game.user.targets){
	
}

mySequence.play();
```

As you can see, we start with declaring our sequence, and storing it in the `mySequence` variable, then we loop through the current user's targets, then we play our stored sequence. However, this will obviously do nothing, since we haven't told the sequence to do anything within the loop, so let's add a simple effect:

```js
let mySequence = new Sequence();

for(let target of game.user.targets){
	mySequence.effect()
    .file("jb2a.explosion.01.orange")
    .atLocation(target)
}

mySequence.play();
```

If you run this macro after having targeted a few tokens, the explosion will play at the same time on top of every target, huzzah!

Since the `.effect()` within the loop is going to happen every time it loops over a token, we can also add a waiting time between each effect, so that they don't all play at the same time:

```js
let mySequence = new Sequence();

for(let target of game.user.targets){
	mySequence.effect()
    .file("jb2a.explosion.01.orange")
    .atLocation(target)
    .wait(250)
}

mySequence.play();
```

Keep in mind that `.wait()` is **not** an effect method, it breaks up the `.effect()` section, so if you were to try to call another method after `.wait()` that relates to `.effects()` (such as `.fadeOut()`), it won't work. 

That's because you've done the same thing as the sound example - when you call any of these methods on a sequence:
- `.effect()`
- `.sound()`
- `.macro()`
- `.thenDo()`
- `.wait()`
- `.canvasPan()`
- `.animation()`
- `.crosshair()`

You **stop** working on the previous section - in this example, you're no longer working on the `.effect()` once `.wait()` has been called. Another way to better visualize this would be to do:

```js
let mySequence = new Sequence();

for(let target of game.user.targets){
	mySequence.effect()
    .file("jb2a.explosion.01.orange")
    .atLocation(target)
    .fadeOut(1000)
    
  mySequence.wait(250)
}

mySequence.play();
```

This way you can clearly see the separation between them, and the functionality works the same way.

Of course, you can add additional bits outside the `for` loop, such as sounds:

```js
let mySequence = new Sequence();

mySequence.sound("path/to/my_first_sound.wav")

for(let target of game.user.targets){
	mySequence.effect()
    .file("jb2a.explosion.01.orange")
    .atLocation(target)
    .fadeOut(1000)
    
  mySequence.wait(250)
}

mySequence.sound("path/to/my_second_sound.wav")

mySequence.play();
```
