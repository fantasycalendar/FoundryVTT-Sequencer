# Filters

**Note:** These filters only work on [effects](api/effect/effect.md#filter)

## Color Matrix

`.filter("ColorMatrix", inData)`

`inData` may contain any of the following:
```js
{
    hue: 0,          // Number, in degrees
    brightness: 1,   // Number, value of the brightness (0-1, where 0 is black)
    contrast: 1,     // Number, value of the contrast (0-1)
    saturate: 0      // Number, value of the saturation amount, negative numbers cause it to become desaturated (-1 - 1)
}
```

## Glow

`.filter("Glow", inData)`

`inData` may contain any of the following:
```js
{
    distance: 10,      // Number, distance of the glow in pixels
    outerStrength: 4,  // Number, strength of the glow outward from the edge of the sprite
    innerStrength: 0,  // Number, strength of the glow inward from the edge of the sprite
    color: 0xffffff,   // Hexadecimal, color of the glow
    quality: 0.1,      // Number, describes the quality of the glow (0 to 1) - the higher the number the less performant
    knockout: false    // Boolean, toggle to hide the contents and only show glow (effectively hides the sprite)
}
```

## Blur

`.filter("Blur", inData)`
`inData` may contain any of the following:
```js
{
    strength: 8,    // Number, strength of the filter
    blur: 2,        // Number, sets the strength of both the blurX and blurY properties simultaneously
    blurX: 2,       // Number, blur strength on the horizontal axis
    blurY: 2,       // Number, blur strength on the vertical axis
    quality: 4,     // Number, quality of the filter
    resolution: 1,  // Number, sets the resolution of the blur filter
    kernelSize: 5   // Number, effectively how many passes the blur goes through
}
```
