## Table of Contents

- [Global Reference](#global-reference)
- [Wait](#wait)
- [Clamp](#clamp)
- [Interpolate](#interpolate)
- [Random Float Between](#random-float-between)
- [Random Integer Between](#random-integer-between)
- [Shuffle Array](#shuffle-array)
- [Random Array Element](#random-array-element)
- [Random Object Element](#random-object-element)
- [Make Array Unique](#make-array-unique)

### Global Reference

You can access any of the Helper functions through:

```js
Sequencer.Helpers;
```

### Wait

```js
await Sequencer.Helpers.wait(number);
```

Causes the code to wait for a given amount of milliseconds.

### Clamp

```js
Sequencer.Helpers.clamp(number, min, max);
```

Clamps a value between two numbers

### Interpolate

```js
Sequencer.Helpers.interpolate(p1, p2, t, ease);
```

This function interpolates between `p1` and `p2` based on a normalized value of `t`, determined by the `ease` provided (string or function, defaults to "linear").

You may provide a function for the `ease` parameter, which takes a single number and returns a single number.

Check out what easings are available here: https://easings.net/

### Random Float Between

```js
Sequencer.Helpers.random_float_between(min, max);
```

Returns a random floating point number between two given numbers.

### Random Integer Between

```js
Sequencer.Helpers.random_int_between(min, max);
```

Returns a random number between two given numbers.

### Shuffle Array

```js
Sequencer.Helpers.shuffle_array(array);
```

Returns a shuffled copy of the original array.

### Random Array Element

```js
Sequencer.Helpers.random_array_element(array, recurse);
```

Return a random element in the given array.

If `recurse` is set to `true`, if the chosen element is another array, it will continue into that array and pick a random element from that array, and so on.

### Random Object Element

```js
Sequencer.Helpers.random_object_element(object, recurse);
```

Return a random element in the given object.

If `recurse` is set to `true`, if the chosen element is another object or array, it will continue into that array and pick a random element from that object, and so on.

### Make Array Unique

```js
Sequencer.Helpers.make_array_unique(array);
```

Turns an array containing multiples of the same string, objects, etc, and removes duplications, and returns a fresh array.
