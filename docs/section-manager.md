## What is the Section Manager?

The section manager portion of Sequencer allows you to create your own implementations into Sequencer.

## Global Reference

You can access the global Sequencer Effect Manager through:

```js
Sequencer.SectionManager;
```

## Register Section

```js
Sequencer.SectionManager.registerSection(
  (inModuleName = string),
  (inName = string),
  (inClass = Class)
);
```

This registers a class to the Sequencer so that it can be accessed within a `Sequence()` by the name you gave it. So if you register a class with the name of `myCustomSection`, inside of a Sequence you can then do this:

```js
new Sequence().myCustomSection();
```

The reason you need to provide a module name as well is to ensure that we can easily see where errors are arising from, and to ensure conflicts between different modules registering their classes are caught.

## Key Concepts

In the Sequencer, each individual executable part is defined as a Section. Each section has its own internal logic how to handle the data given to it, and how to handle its own flow.

The main idea behind a Section is to be a mutable interface - this means that any method on it should always return itself, or another interface.

For example, the Effect Section method for setting the `.name()` of the Effect is defined like this within its class:

```js
name(inName);
{
  if (typeof inName !== "string")
    throw this.sequence._throwError(
      this,
      "name",
      "inName must be of type string"
    );
  this._name = inName;
  return this;
}
```

Because the method returns `this` you can then continuously call methods on the Effect Section, because the result of the function is itself. If you then call another method that's not defined with the effect, the [internal Sequencer Proxy Wrapper workflow](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Core-Sequencer-Idea#Proxy-Wrappers) handles the rest. You can read more about that here, but it's not required reading to create your own interfaces.

## Required Methods

When you define your own Section class, you **_must_** extend `Sequencer.BaseSection`, which holds utility methods that the Sequencer uses to evaluate key flow steps:

```js
class NewSection extends Sequencer.BaseSection
```

Another core method to define within your custom Section class is `run()` - it is what actually gets called when your Section gets executed by a Sequence's `play()` method. It is not passed any information, which is why it would be good to define your own methods to alter the behavior of your class.

If you need to define variables, I recommend that you pre-define them within your Section's `constructor`, like so:

```js
constructor(inSequence);
{
  super(inSequence);
  this.myProperty = false;
}
```

The first variable passed to the constructor is always going to be the Sequence that created the class instance, so you'll need to pass it to the `super` function, which instantiates the `BaseSection` to handle underlying Sequencer logic.

## Example Implementation

Here's an example of a custom section definition:

```js
class NewSection extends Sequencer.BaseSection {
  constructor(inSequence) {
    super(inSequence);
    this.string = "";
  }

  setString(inString) {
    this.string = inString;
    return this;
  }

  async run() {
    console.log(this.string);
  }
}

Sequencer.SectionManager.registerSection("myModule", "testing", NewSection);

new Sequence().testing().setString("Let's do some damage!").play();
```

Running this macro will then result in this in the console - should you have the debug setting enabled for the Sequencer:

![Sequencer!](https://media.discordapp.net/attachments/734095524822777976/887099330689921054/unknown.png)
