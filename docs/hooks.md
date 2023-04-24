## What is this?

This page contains information regarding every hook that the Sequencer can fire.

## Table of Contents

- [Sequencer Ready](#sequencer-ready)
- [Sequencer Effect Manager Ready](#sequencer-effect-manager-ready)
- [Create Sequencer Sequence](#create-sequencer-sequence)
- [Ended Sequencer Sequence](#ended-sequencer-sequence)
- [Pre Create Sequencer Effect](#preCreate-sequencer-effect)
- [Create Sequencer Effect](#create-sequencer-effect)
- [Ended Sequencer Effect](#ended-sequencer-effect)
- [Reached Effect Timestamp](#reached-effect-timestamp)
- [Pre Create Sequencer Sound](#pre-create-sequencer-sound)
- [Create Sequencer Sound](#create-sequencer-sound)
- [Ended Sequencer Sound](#ended-sequencer-sound)

### Sequencer Ready

`Hooks.on("sequencerReady", () => {})`

This hook fires when Sequencer has finished setting up and can accept [Sequencer Database](database-basics.md) registrations.

### Sequencer Effect Manager Ready

`Hooks.on("sequencerEffectManagerReady", () => {})`

This hooks fires when every effect has been set up on the scene that's currently loaded.

### Create Sequencer Sequence

`Hooks.on("createSequencerSequence", () => {})`

This hook fires when a `new Sequence()` is being `.play()`ed.

### Ended Sequencer Sequence

`Hooks.on("endedSequencerSequence", () => {})`

This hook fires when a `new Sequence()` has finished running.

### Pre Create Sequencer Effect

`Hooks.on("preCreateSequencerEffect", (effectData) => {})`

This hook fires before an [`.effect()`](api/effect.md) section is going to be run. The `effectData` contains all the evaluated data to be sent to other clients, and their canvases.

### Ended Sequencer Effect

`Hooks.on("endedSequencerEffect", (effectData) => {})`

This hook fires as an [`.effect()`](api/effect.md) has finished playing. The `effectData` contains all the evaluated data for that effect.

### Ended Sequencer Effect

`Hooks.on("endedSequencerEffect", (effectData) => {})`

This hook fires as an [`.effect()`](api/effect.md) has finished playing. The `effectData` contains all the evaluated data for that effect.

### Reached Effect Timestamp

`Hooks.on("sequencerEffectTimestamp", (CanvasEffect, SequencerFile) => {})`

This hook fires every time an [`.effect()`](api/effect.md) on the canvas reaches a timestamp as defined in its [database configuration](docs/database-basics.md#timestamps-within-files). The arguments given are the effect, and the Sequencer database file.

### Pre Create Sequencer Sound

`Hooks.on("preCreateSequencerSound", (soundData) => {})`

This hook fires before a [`.sound()`](api/sound.md) section is going to be run. The `soundData` contains all of the evaluated data to be sent to other clients to be played.

### Create Sequencer Sound

`Hooks.on("createSequencerSound", (soundData) => {})`

This hook fires as a [`.sound()`](api/sound.md) has been created on the canvas. The `soundData` contains all of the evaluated data for that sound.

### Ended Sequencer Sound

`Hooks.on("endedSequencerSound", (soundData) => {})`

This hook fires as an [`.sound()`](api/sound.md) has finished playing. The `soundData` contains all of the evaluated data for that sound.
