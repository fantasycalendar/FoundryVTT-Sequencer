# Table Of Contents
## - Core Methods -
- [Wait Until Finished](DOCS.md#wait-until-finished)
- [Async](DOCS.md#async)
- [Repeats](DOCS.md#repeats)
- [Play if](DOCS.md#play-if)
- [Delay](DOCS.md#delay)
- [Fade in](DOCS.md#fade-in)
- [Fade out](DOCS.md#fade-out)
- [Duration](DOCS.md#duration)

## - Sound methods -
- [File](#file)
- [Volume](#volume)

## Sound methods

### File

`.file(string)` or `.file(array)`

This declares which sound to be played, but you can also do that when first initializing the sound.

This may also be an array of paths, which will be randomly picked from each time the effect is played.

### Volume

`.volume(0.5)`

A normalized value between `0.0` and `1.0` which determines the volume of the sound. Defaults to `0.8`.
