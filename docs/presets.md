## What is Sequencer's Presets?

Sequencer Presets allow you to register pieces of sequencer function calls and then reuse them in sequences with ease.

## Global Reference

You can access the global Sequencer Effect Manager through:

```js
Sequencer.Presets;
```

## Add Preset

```js
Sequencer.Presets.add(
  (inName = string),
  (inFunction = Function),
  (overwrite = boolean)
);
```

This adds a preset that can then be used in sequences - you register it as follows:

```js
Sequencer.Presets.add("breatheAnimation", (effect, args) => {
  return effect
    .loopProperty("spriteContainer", "scale.x", {
      from: 0.9,
      to: 1.1,
      duration: args?.duration ?? 1000,
      pingPong: true,
      ease: "easeInOutSine",
    })
    .loopProperty("spriteContainer", "scale.y", {
      from: 0.9,
      to: 1.1,
      duration: args?.duration ?? 1000,
      pingPong: true,
      ease: "easeInOutSine",
    });
});
```

This way, you can then use this preset on any effect, like so:

```js
new Sequence()
  .effect()
  .file("jb2a.braziers.blue.bordered.01.05x05ft")
  .atLocation(token)
  .preset("breatheAnimation")
  .persist()
  .play();
```

Because `.atLocation()` returns the `EffectSection`, calling `.preset()` on it will pass that same effect into the preset callback. That function calls `.loopProperty()`, which is also an `EffectSection` method, which returns the same effect from the `.preset()` call, which allows `.persist()` to be applied to the same effect.

## Get All Presets

```js
Sequencer.Presets.getAll();
```

Returns every preset as strings mapped to each preset function.

## Get Preset

```js
Sequencer.Presets.get("breatheAnimation");
```

Returns the function for a given preset.
