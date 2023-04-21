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
