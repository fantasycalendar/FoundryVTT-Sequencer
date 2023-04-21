## Changelog

### Version 3.0.0

- _Sequencer_ - Updated Sequencer Database Viewer:
  - Improved UI and added nested tree view
  - Added ctrl modifier to buttons that copy paths, which adds quotes around the copied paths
- _Sequencer_ - Updated Sequencer Effect Player:
  - Improved UI based on the design of MatthijsKok on github - thanks a lot for the inspiration!
- _Sequencer_ - Added the Sequencer Manager :
  - View sequences as they are running, and stop the entire execution or their individual sections
- _Sequencer_ - Added `.scrollingText()` which allows playing scrolling text on the canvas for users
- _Sequencer_ - Added `.canvasPan()` which allows panning the canvas for connected users
- _Sequencer_ - Added `.toJSON()` and `.fromJSON()` to Sequences to be able to be serialized and deserialized; only sequences with effects, sounds, and scrolling texts can be serialized
- _Sequencer_ - Added options to `.play()`, which may contain an object; currently supports `{ remote: true/false }` which will serialize the sequence (see above), and send it to each client for local playback, instead of the person running the sequence sending data to clients as it is being executed
- _Sequencer_ - Added database support for `_timestamps` metadata on effect files, which will trigger the `sequencerEffectTimestamp` hook when effects reach the point of the timestamps for that file
- _Sequencer_ - Added support for flipbook-type effects through a `_flipbook` database tag
- _Animations_ - Vastly improved playback of movement, fade in/out, and rotation animations on tokens
- _Effects_ - Added `CanvasEffect#addAnimatedProperties`, which will allow you to easily add animations to properties of existing effects
- _Effects_ - Improved screenspace above UI effect performance by not rendering the extra canvas when not in use
- _Effects_ - Fixed screenspace effects being affected by the vision mask
- _Effects_ - Fixed `.stretchTo()` effects would be visible when not in vision
- _Effects_ - Fixed `.fadeOut()` and `.scaleOut()` not working at all
- _Effects_ - Vastly improved how effects are replicated on linked tokens when `.persist()`'s `persistPrototypeToken` is enabled

### Version 2.414

- _Sequencer_ - Included missing CSS file

### Version 2.413

- _Sequencer_ - Added support for database paths that resolve to other database paths
- _Sequencer_ - Isolated Sequencer's styling so that it doesn't leak out into other modules or systems
- _Effects_ - Fixed `.loopProperty()` not respecting `loops: 0`
- _Effects_ - Fixed `.animateProperty()` not keeping track of relative values when animating the same property multiple times
- _Effects_ - Fixed named screenspace effects without a specific location not playing and throwing errors
- _Sounds_ - Fixed `softFail` not allowing sounds to softly fail

### Version 2.412

- _Sequencer_ - Added setting to hide/show the Sequencer buttons in the left sidebar when in the token controls
- _Animation_ - Fixed `.moveTowards()` going into infinite loop if the source and targets are on top of each other
- _Effects_ - Fixed `.shape()` taking grid size into account multiple times
- _Effects_ - Fixed `.volume()`, `.fadeInAudio()`, and `.fadeOutAudio()` not working on webms with embedded audio

### Version 2.411

- _Sequencer_ - Fixed infinite recursion when using `.waitUntilFinished()` in the middle of a sequence
- _Sequencer_ - Undid some minor issues in the database viewer

### Version 2.410

- _Sequencer_ - Added support for playing sounds in the Sequencer Database (thank you ZotyDev for the pull request!)
- _Sequencer_ - Calling methods on the sequence that it does not have will be attempted to be cast to the last section
- _Sequencer_ - You can now provide `false` as an argument to `.waitUntilFinished()`, which will negate its call
- _Effects_ - Fixed animations on `alphaFilter`'s `alpha` not working

### Version 2.49

- We don't talk about this version

### Version 2.4.8

- _Effects_ - Fixed rectangle measurable templates would be off by 45 degrees
- _Effects_ - Fixed tokens with locked rotation would cause attached effects to be rotated anyway
- _Effects_ - Fixed `.tint()` not applying to `.stretchTo()` effects

### Version 2.4.7

- _Effects_ - Actually fixed shapes

### Version 2.4.6

- _Effects_ - Fixed effects with only shapes would not play properly
- _Effects_ - Fixed error when users tried to play effects even when `softFail` was set to `true`

### Version 2.4.5

- _Effects_ - Fixed effects playing on the same scene as the user's current scene, even if the target of the effect was on another scene
- _Effects_ - Fixed `.from()` not working with the new `softFail` sequence parameter
- _Effects_ - Fixed being able to pass non-valid parameters to `.atLocation()` and similar functions without errors

### Version 2.4.4

- _Sequencer_ - Tweaked the arguments to `new Sequence("moduleName")` to `new Sequence(inOptions)` - it now takes a single object that can contain:
  - `moduleName` <string> - The name of the module that is creating this sequence - this is for other users to know which module used Sequencer
  - `softFail` <boolean> - Setting this to `true` causes any failures to find files for effects, sounds, or macros to softly fail, rather than halt the entire sequence
- _Effects_ - Tweaked `.shape()`s parent to be the `spriteContainer` rather than the `sprite`, so that animations to the sprite doesn't affect the shapes
- _Effects_ - Fixed `.shape()` not considering their offset with `isMask` enabled

### Version 2.4.3

- _Sequencer_ - Switched `Disable Pixi Fix` to `Enable Pixi Fix` to make it more consistent with other settings
- _Sequencer_ - Added `Enable Global Pixi Fix` which fixes the alpha on animated tiles if enabled (use with caution)
- _Effects_ - Fixed `.atLocation()` and `.persist()` throwing errors and thus failing to persist the effect on the scene
- _Effects_ - Slight tweaks to visibility logic of effects to be more consistent
- _Effects_ - Tweaked `.attachTo()`'s `align` and `edge` to not consider token scale when determining the edge of the token

### Version 2.4.2

- _Sequencer_ - Added `Sequencer.Presets` which allows you to create and save reusable bits of sequences
- _Sequencer_ - Added `.preset()` which allows you to use the aforementioned presets
- _Sequencer_ - Added optional `considerTokenScale` to the optional `options` parameter to `.scaleToObject()`, you can set it to `true` in order for the visual effect to also consider the token scale
- _Sequencer_ - Added support for persistent visual effects on "fake" tokens created by Multilevel Tokens (only supports effects that are applied to the prototype token)
- _Sequencer_ - Slightly improved the speed of document updates when visual effects are first applied
- _Sequencer_ - Added a throttled console warning when the Photosensitive Mode is enabled and a client is trying to play effects (only warns once every 10 seconds when effects are played)
- _Effects_ - Fixed `.scaleToObject()` always taking token scale into account, which it shouldn't do by default

### Version 2.4.1

- _Effects_ - Fixed minor typo in `.mask()`

### Version 2.4.0

- _Sequencer_ - Added `Seqencer.EffectManager` to the autocomplete types
- _Sequencer_ - Fixed minor issue with the Effect Manager sometimes trying to load non-existent effect data
- _Effects_ - Added `.shape()`, which allows you to create simple shapes on the canvas
  - See: <https://fantasycomputer.works/FoundryVTT-Sequencer/#/api/effect?id=shape>
- _Effects_ - Fixed `.attachTo()` would attempt to apply flags on temporary templates such as warpgate crosshairs

### Version 2.3.21

- _Sequencer_ - Fixed interaction with the `Advanced Macros` module past version 1.19.2 (Thanks MrVaux!)
- _Sequencer_ - Fixed issue with `Sequencer.Helpers.shuffle_array` not handling complex arrays very well
- _Effects_ - Fixed `.from()` not taking token scale into account

### Version 2.3.20

- _Sounds_ - Fixed sounds not working

### Version 2.3.19

- _Sequencer_ - Created a new wiki for Sequencer:
  - <https://fantasycomputer.works/FoundryVTT-Sequencer/>
- _Sequencer_ - Added full support for Sequencer typings in the **_Monaco Macro Editor_** (thanks to laquasicinque for your initial work!)
- _Sequencer_ - Changed all settings to use Foundry v10's `requiresReload` instead of reloading the app
- _Sequencer_ - Removed compendium of sample macros, in favor of the new wiki
- _Effects_ - Added further support for webm's loaded through S3 buckets (files with type `application/octet-stream` now supported)
- _Sounds_ - Sounds' `.file()` now has a secondary parameter to allow a false-y primary input to soft fail, instead of halting the entire Sequence

### Version 2.3.18

- _Sequencer_ - Added support for Foundry's photosensitive setting, which disables all effects without impacting other functionality
- _Sequencer_ - Fixed incompatibility with the Foundry team's **_A House Divided_** adventure, the scenes should no longer appear to have a dark overlay
- _Sequencer_ - Updated `.macro()` to work with the latest version of the **_Advanced Macros_** module

### Version 2.3.17

- _Effects_ - Fixed `.tieToDocuments()` not working for embedded documents on unlinked tokens

### Version 2.3.16

- _Effects_ - Adjusted approach when ending effects when using `.tieToDocuments()`

### Version 2.3.15

- _Sequencer_ - Fixed registering similar named modules in the database would cause the second to not register properly

### Version 2.3.14

- _Effects_ - ACTUALLY fixed `.tieToDocuments()` (send help)

### Version 2.3.13

- _Effects_ - Fixed deeper issue with `.tieToDocuments()` as it was not recognizing actors or items as parents in respect to UUIDs

### Version 2.3.12

- _Effects_ - Fixed `.missed()` and `.stretchTo()`'s `randomOffset` having weird interactions when `.name()` was used to play effects at target locations
- _Effects_ - Fixed `.tieToDocuments()` throwing errors and not removing effects when the tied documents were deleted

### Version 2.3.11

- _Sequencer_ - Added `Sequencer.Database.inverseFlattenedEntries` which is a map object with the key being the file path and the value being the database path for that file
- _Effects_ - Added `bindElevation` (default `true`) as a secondary argument to `.attachTo()` which can be used to make effects not follow the target's elevation
- _Effects_ - Made `.elevation()` be relative to the target of the effect by default, you can pass a secondary object with `absolute: true` to make it absolutely elevated on the scene
- _Effects_ - Improved internal logic when trying to play effects on clients who have disabled them - previously it had a chance to throw an error when clients with effects disabled would run sequences that included effects (as they would not know the duration of the effect)

### Version 2.3.10

- _Effects_ - Fixed race condition when deleting multiple attached effects in a row would leave some lingering effects

### Version 2.3.9

- _Effects_ - Fixed effects sticking around after deleting the document they were attached to
- _Effects_ - Fixed error when deleting documents relating to named effects
- _Effects_ - Fixed setting the position of screenspace effects would not work

### Version 2.3.8

- _Sequencer_ - Removed double declaration of socketlib hook
- _Effects_ - Fixed error if no scenes has been created yet
- _Effects_ - Fixed screenspace effects not working without setting its location
- _Effects_ - Fixed `.animateProperty()` not working very well with `width` and `height`
- _Effects_ - Improved the way effects interacts with Foundry hooks (it is more efficient)

### Version 2.3.7

- _Effects_ - Fixed `.rotateTowards()`'s `rotationOffset` parameter not working properly

### Version 2.3.6

- _Effects_ - Fixed multiple `.attachTo()` and `.strechTo()` with `attach: true` sometimes causing crashes due to overloading Foundry's tick function
- _Effects_ - Fixed ColorMatrix `hue` and `.animateProperty()` not working well together
- _Effects_ - Fixed `.atLocation()` with `randomOffset: true` would cause weird effects with `.stretchTo()`

### Version 2.3.5

- _Sequencer_ - Removed Ouija Board example macros, this is now a separate module made by md-mention2reply, check it out!
  - <https://foundryvtt.com/packages/ouija-board-for-sequencer>
- _Sequencer_ - Updated module manifest to be more V10 compatible
- _Effects_ - Fixed ColorMatrix `hue` property to be able to be animated with `animateProperty()` and `.loopProperty()`
- _Effects_ - Fixed `.mask()` not working with tiles or measurable templates
- _Effects_ - Fixed mirror and random mirror X/Y not actually flipping the effect

### Version 2.3.4

- _Animations_ - Fixed `.rotateTowards()` throwing update error

### Version 2.3.3

- _Effects_ - Fixed code to remove deprecation warning when both `.mask()` and `.persist()` was used
- _Effects_ - Fixed rare issue where the temporary template layer would not be initialized and would cause Sequencer to error and stop working
- _Effects_ - Fixed Sequencer Effects Player deprecation warnings
- _Effects_ - Added warning to console for players trying to play effects when they do not have permission to do so
  - I realize warnings is not desired in most cases, but this has been an ongoing point of support, so to preserve my own sanity, this is just how it is now.

### Version 2.3.2 (Both Foundry V9 and V10)

- _Animation_ - Fixed `.rotateTowards()` throwing errors
- _Effects_ - Fixed `.loopProperty()` with property `scale` would incorrectly scale effect

### Version 2.3.1

- _Effects_ - Fixed `.from()` and `.mask()` throwing errors about missing files

### Version 2.3.0 (V10 only)

- _Sequencer_ - Added Spanish localization (thanks to Git-GoR!)
- _Effects_ - Re-enabled `scale.x` and `scale.y` on `.animateProperty()` and `.loopProperty()`
- _Effects_ - Deprecated `.belowTokens()` and `.belowTiles()` in favor of `.elevation()` due to fundamental changes in Foundry's V10 update. These methods will be removed in a future update
- _Effects_ - Fully removed deprecated methods: `.addPostOverride()`, `.reachTowards()`, `.gridSize()`, `.startPoint()`, `.endPoint()`

### Version 2.2.4

- _Effects_ - Fixed `.rotateTowards()`'s `rotationOffset` parameter not working properly
-

### Version 2.2.3

- Re-released 2.2.2, git pulled a fast one and the changes in that version never got out

### Version 2.2.2

- _Animation_ - Fixed `.rotateTowards()` throwing errors (again)
- _Effects_ - Fixed `.atLocation()` with `randomOffset: true` would cause weird effects with `.stretchTo()`
- _Effects_ - Fixed error that would sometimes pop up during startup if the template layer has not been initialized

### Version 2.2.1

- _Animation_ - Fixed `.rotateTowards()` throwing errors
- _Effects_ - Fixed `.loopProperty()` with property `scale` would incorrectly scale effect
-

### Version 2.2.0 (last V9 update, except maybe some bug fixes)

**Additions:**

- _Effects_ - Added `.tieToDocuments()` which allows you to tie an effect to Foundry documents - such as Active Effects or Tokens. When these are deleted, the effect is automatically ended.
- _Effects_ - Added secondary `offset` parameter to `.atLocation()`, `.attachTo()`, `.rotateTowards()`, `.from()`, and `.stretchTo()` which can be used to offset the location of the source or target
  - Note: This means that `.offset()` is becoming deprecated - it will remain for a few versions with a silent warning
- _Effects_ - Added `.spriteScale()` which can be used to scale the sprite of the effect separately from `.scale()`

**Tweaks:**

- _Animations_ - Renamed `.rotateTowards()`'s secondary parameter's `offset` property to be more accurately named `rotationOffset`
- _Effects_ - Upgraded `.animateProperty()` and `.loopProperty()` to be additive, which means two animations can now target the same property on the same effect
- _Effects_ - Renamed `.rotateTowards()`'s secondary parameter's `offset` property to be more accurately named `rotationOffset`

**Fixes:**

- _Sequencer_ - Fixed issue where copying the file path of a Database entry that has multiple ranges would always copy the file path for the middle-most range
- _Sequencer_ - Rewrote the database traversal method to be more robust and carry metadata down to lower children
- _Effects_ - Fixed long-running issue with lag and performance impact from Sequencer on some computers - the cause was the `.screenSpace()` layers, which have now been reworked. A setting to disable the Above UI Screenspace effects layer has been added to further support impacted individuals.
- _Effects_ - Fixed `randomOffset` secondary option on `.attachTo()` not working
- _Effects_ - Fixed `.scaleToObject()` and `.scale()` not playing nicely together
- _Effects_ - Fixed loop markers not properly working

### Version 2.1.14

- _Sequencer_ - Removed PIXI fix for Foundry .webm tiles to apply premultiplied alpha, native Foundry behavior is now active
- _Effects_ - Fixed fatal canvas errors when `persistTokenPrototype` was active and masked to the target of the effect
- _Effects_ - Added warning when using `persistTokenPrototype` with masks _other_ than masks applied to the source target
- _Effects_ - Added support for `.file()` to override `.from()`'s file while keeping the other settings intact
- _Effects_ - Improved robustness of placeable object document retrieval

### Version 2.1.13

- _Sequencer_ - Removed stray `console.log`
- _Sequencer_ - Fixed Ouija board macro error, slightly improved effect positioning
- _Effects_ - Added `.spriteRotation()` which allows you set the rotation of the effect in place - this differs from `.rotate()` in the sense that this is applied only locally to the sprite, after any other offsets or transformations

### Version 2.1.12

- _Effects_ - Fixed `.strechTo()` with parameter `attachTo: true` resulting in no stretching

### Version 2.1.11

- _Effects_ - Fixed effects attached to temporary templates causing errors in core Foundry code
- _Effects_ - Effects attached to temporary objects (like warpgate cursors) are now propagated to other clients (call `.locally()` to make it only appear for the creator)

### Version 2.1.10

- _Sequencer_ - Fixed Sequencer Effect Manager not accepting Foundry documents as object references when filtering for effects
- _Sequencer_ - Fixed Sequencer Effect Player showing private database entries
- _Effects_ - Fixed attached effects not showing up for non-GMs

### Version 2.1.9

- _Sequencer_ - Unlocked keybinds so that users may configure their own keybinds for Sequencer's layers
- _Sequencer_ - Added support for `minDelay` and `maxDelay` on `.waitUntilFinished()`, so you can now have a random wait delay between sections
- _Effects_ - Added `fromEnd` to `.animateProperty()` which causes the animation to play at the end of the effect's duration
- _Effects_ - Added `gridUnits` support to `.animateProperty()` and `.loopProperty()` when using `position.x` or `position.y` as the animated target
- _Effects_ - Added `gridUnits` as a secondary option to both `.offset()` and `.spriteOffset()`
- _Effects_ - Fixed persistent prototype token effects not applying on every instance of its token
- _Effects_ - Fixed `.playbackRate()` only adjusting effect duration, and not the actual playback rate

### Version 2.1.8

- _Sequencer_ - Added setting to allow clients to disable Sequencer's PIXI alpha fix for base textures

### Version 2.1.7

- _Effects_ - Fixed string normalization

### Version 2.1.6

- _Sequencer_ - Updated compendium of Sequencer macro samples
- _Effects_ - Fixed finding effects by name with accents in them silently failing
- _Effects_ - Fixed `.attachTo()` not following the target's rotation

### Version 2.1.5

- _Effects_ - Fixed switching scenes would sometimes break effects

### Version 2.1.4

- _Effects_ - Fixed issue with hovering over persistent effects attached to objects sometimes causing Foundry's layers to crash
- _Effects_ - Fixed `.animateProperty()` and `.loopProperty()` applying grid-size ratio on animated scales

### Version 2.1.3

- _Effects_ - Fixed attached effects disappearing
- _Effects_ - Fixed `.randomOffset()` not randomly offsetting effects (still deprecated, see 2.1.0 release notes)

### Version 2.1.2 Hotfix

- _Effects_ - Fixed effects sometimes not becoming visible

### Version 2.1.1

- _Sequencer_ - Fixed canvas layer bug that caused performance issues for some users
- _Sequencer_ - Fixed missing default template causing some effects to not play properly
- Added `.aboveLighting()`, which causes the effect to always be visible, regardless of sight, fog of war, or walls.
  - Note that if an effect is attached to an object via `.attachTo()`, you may need to disable `bindVisibilty` if the object is hidden
- _Effects_ - Fixed `.from()`, it now uses the object's image when the effect plays, rather than when the Sequence was first created
- _Effects_ - Fixed highlight box when hovering over effects in the Effect Manager UI not taking effect rotation into account
- _Effects_ - Fixed effects sometimes not fully following its attached object

### Version 2.1.0

**Additions:**

- _Sequencer_ - Added support for the Effect Manager to be able to manipulate effects on other scenes, which means you can now end effects on other scenes than the one you're on via the API
- _Sequencer_ - Added secondary options parameter to `Sequencer.Database.getEntry`, where `softFail: true` will cause the method to not throw errors when an entry was not found.
- _Sequencer_ - Added `Sequencer.EffectManager.getEffectPositionByName` which will allow you retrieve an effect's position by name, in real time
- _Effects_ - Added `.mask()`, which can now clip-mask effects to only show them within tokens, templates, tiles, or drawings - this supports the [Walled Templates module](https://foundryvtt.com/packages/walledtemplates)!
- _Effects_ - Added a secondary options parameter to `.persist()`, which can accept `persistTokenPrototype: true` to persist the effect on the token's prototype data, useful for active effect-based VFX
- _Effects_ - Added vision masking - now token vision affects how much of an effect they can see
- _Effects_ - Added `.xray()` which can be used to turn off vision masking on individual effects
- _Effects_ - Added support in the Sequencer Database for internal effect loops, see the [documentation for more information](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database#Internal-loops)
- _Effects_ - Added `edge` option to `.attachTo()`, which can be set to `inner`, `on`, or `outer` to align the effect on the attached object's edge when used with `align`
- _Effects_ - Added `.screenSpaceAboveUI()`, which causes `.screenSpace()` effects to play above _all_ UI elements in Foundry (use with caution)
- _Effects_ - Added options parameter to `.scaleToObject()`, which can be passed `uniform: true` to cause the scaling to always be uniform (it picks the largest dimension of the object)
- _Macros_ - Added the ability to reference compendiums when creating `.macro()`s in sequences

**Fixes:**

- _Sequencer_ - As `SequencerDatabase` was deprecated in 2.0.0 in favor of `Sequencer.Database`, the former has now been removed
- _Sequencer_ - Adjusted Database methods with more validation so that searching with empty strings won't throw hard to read errors
- _Sequencer_ - Removed bogus Effect Player warning about permissions that no longer reflects what Sequencer does
- _Sequencer_ - Fixed some issues when copying and playing effects through the Database Viewer
- _Effects_ - Fixed effects being invisible to players if the effect was created out of sight (thanks @dev7355608!)
- _Effects_ - Fixed `align` on `.attachTo()` not working as expected when an effect's scale or size was set
- _Effects_ - Fixed blur filter not taking given properties into account
- _Effects_ - The following functions now have loud deprecation warnings:
  - `.addPostOverride()`
  - `.reachTowards()`
  - `.gridSize()`
  - `.startPoint()`
  - `.endPoint()`
- _Effects_ - Deprecated `.randomOffset()` in favor of adding `randomOffset` as a secondary argument on `.atLocation()`, `.stretchTo()`, `.rotateTowards()`, and `.attachTo()`

### Version 2.0.16

- _Sequencer_ - Added japanese localization (thanks to the illustrious Brother Sharp#6921!)

### Version 2.0.15

- _Effects_ - Fixed errors relating to tiling textures
- _Effects_ - Fixed drifting effect animations when FPS dropped
- _Effects_ - Improved performance relating to always updating the position of the sprites, even when attached objects weren't moving
- _Effects_ - Hopefully fixed some memory leaks relating to assets not being deleted properly
- _Effects_ - Fixed attached effects' rotations being funky
- _Effects_ - Fixed effects attached to temporary objects (such as the warpgate crosshair) would not be properly removed from the effect manager

### Version 2.0.14

- _Database_ - Fixed the database sometimes getting confused by paths that have `ft` in them without being range-finding
- _Effects_ - Fixed double-attached effects sometimes resulting in the sprite freezing (or in rare cases, browser crashes), though this type of effect is still expensive!
- _Effects_ - Fixed `rotateTowards` with `attachTo` enabled not respecting actual target position end position
- _Effects_ - Fixed `.rotation()` with `.loopProperty()` on the `spriteContainer`'s `rotation` causing rotational strangeness
- _Effects_ - Fixed `.repeat()` with partial database path not picking random images for each repetition
- _Sounds_ - Fixed error when playing sounds

### Version 2.0.13

- _Effects_ - Fixed flipped tiles and measurable templates (with negative width or height) causing effects to not play on the correct location
- _Effects_ - Fixed `.rotateTowards()` not following the rotation of attached objects
- _Sounds_ - Fixed `.fadeInAudio()` and `.fadeOutAudio()` being broken

### Version 2.0.12

- _Effects_ - Fixed effects with only `.text()` and no `.file()` not working properly
- _Effects_ - Fixed `.text()` combined with `.screenSpace()` would not be scaled properly

### Version 2.0.11

- _Effects_ - Fixed `.extraEndDuration()` not working properly when `.waitUntilFinished()` was provided a negative number
- _Effects_ - Fixed `.noLoop()` effects sometimes not reaching their proper end time when `.endTime()`, `.endTimePerc()` or `.timeRange()` was used

### Version 2.0.10

- _Sequencer_ - Fixed error in `Database.validateEntries()`
- _Sequencer_ - Updated `pre` hooks to cancel the action if any function return `false`
- _Sequencer_ - Updated Rope and Chain macros in compendium
- _Effects_ - Added `.tilingTexture()` - this will replace the `tiling` parameter on `.stretchTo()` in the long term
- _Effects_ - Deleting the object an effect is attached to will now actually trigger the effect's `.fadeOut()`, `.scaleOut()` etc

### Version 2.0.9 Hotfix

- _Effects_ - Fixed nasty issue with rotation on effects
- _Effects_ - Made all effects have an assumed internal grid size of 100

### Version 2.0.8

- _Sequencer_ - Added rope and chain sample macros to the Sequencer macro compendium
- _Sequencer_ - Removed non-functional Chain Lightning macro from macro collection
- _Sequencer_ - Added warnings to Preloader when it is given invalid parameters
- _Effects_ - Added `tiling` as an option to `.stretchTo()`
- _Effects_ - Fixed `.randomRotation()` not working with `.attachTo()`
- _Effects_ - Fixed issue with effects with a defined width and height were still being scaled by the scene-effect grid size difference

### Version 2.0.7

- _Sequencer_ - Fixed broken macro in the Ouija example
- _Animations_ - Fixed various animation methods not resulting accurate movement or teleportation
- _Effects_ - Fixed `.randomRotation()` not working

### Version 2.0.6

- _Sequencer_ - Improved intelligence of webm cache
- _Effects_ - Added `.private()` method to hide effects in the effect manager - DO NOT USE IF YOU DO NOT KNOW WHAT YOU ARE DOING
- _Effects_ - Fixed issue where ending effects by name would cause other effects without a name to get \_ended
- _Effects_ - Fixed issue where filtering for effects with the Effect Manager would cause it to split the given name on each whitespace

### Version 2.0.5 Hotfix Hotfix

- _Effects_ - Hotfix for the hotfix. It's just hotfixes all the way down, man.

### Version 2.0.4 Hotfix

- _Effects_ - Fixed some modules causing Sequencer to complain
- _Effects_ - Actually fixed copying objects would not copy the effects on it

### Version 2.0.3

- _Effects_ - Fixed some issues regarding file paths on ForgeVTT, though they did most of the legwork on their side
- _Effects_ - Fixed issue where `.scaleToObject()` would fail to scale to the object properly
- _Effects_ - Fixed Effect Manager not finding effects to end when it was only provided an object
- _Effects_ - Fixed copying tokens and other objects with ongoing effects would not properly play it for everyone
- _Effects_ - Fixed screenspace effects would sometimes not play properly

### Version 2.0.2

- _Sequencer_ - Fixed the preloader throwing error about recursion
- _Effects_ - Fixed rotational animations not working properly
- _Effects_ - Fixed the update interface not allowing attribute paths like core Foundry does
- _Effects_ - Fixed effects lingering for other users after their attached objects were deleted
- _Effects_ - Fixed issues with using `.from()` on tiles

### Version 2.0.1

- _Sequencer_ - Fixed preloader throwing error about missing functions
- _Sequencer_ - Fixed Effect Manager complaining if trying to filter effects by name while some effects didn't have a valid name
- _Effects_ - Added the ability to use Effects as elements to play other Effects on
- _Effects_ - Added cache-busting for when the Sequencer .webm cache would get larger than 1GB
- _Effects_ - Fixed persistent effects attached to WarpGate crosshairs throwing errors
- _Effects_ - Fixed `cacheLocation` throwing errors regarding missing function
- _Effects_ - Fixed `endedSequencerEffect` being called too late for users to be able to use its parameters
- _Effects_ - Fixed error when deleting the object an effect was attached to through both `.attachTo()` and `.stretchTo()`

### Version 2.0.0

**Breaking changes:**

- _Sequencer_ - Sequencer now requires the `socketlib` module
- _Sequencer_ - All existing persistent effects created using 1.X.X Sequencer will be updated to the 2.0.0 system, but it's nigh impossible to catch all the edge cases, so please report any strangeness!
- _Effects_ - Removed support for audio methods on effects (hardly used and caused a whole host of problems)
- _Effects_ - Deprecated `.reachTowards()` and renamed it to `.stretchTo()`. The deprecated method will be removed in 2.1.0.
- _Effects_ - Deprecated `.addPostOverride()`, please use `.addOverride()` instead. The deprecated method will be removed in 2.1.0.
- _Effects_ - Deprecated `.gridSize()`, `.startPoint()`, and `.endPoint()` in favor for `.template({ gridSize, startPoint, endPoint })`. The deprecated methods will be removed in 2.1.0.
- _Effects_ - Removed deprecated method `.JB2A()`

**Tweaks:**

- _Sounds & Effects_ - Tweaked `.forUsers()` to also accept player names (case-sensitive) instead of just IDs
- _Effects_ - Tweaked attached effects' layer handling - effects can now be attached but exist below _all_ Tokens, for example
- _Effects_ - Tweaked `.filter()` to allow being called multiple times, which now layers the filters in the order they were created

**Additions:**

- _Sequencer_ - Added selection tool to the Effect Layer - select, move, reattach, and delete effects on the canvas!
- _Sequencer_ - Added `updateEffects` to the Effect Manager's API
- _Sequencer_ - Added `updateSequencerEffect` hook
- _Sequencer_ - Added support to `.macro()`s to be able to supply additional arguments (requires the Advanced Macros module)
- _Sequencer_ - Added wildcard support when filtering for named effects in the Effect Manager's API (such as `getEffects`, `endEffects`, etc)
- _Sequencer_ - Added support to filter for `source` and `target` in the Effect Manager's API (such as `getEffects`, `endEffects`, etc)
- _Sequencer_ - Added "private" boolean flag to `Sequencer.Database.registerEntries()` which causes the entries to not be visible in the Database Viewer and Effect Player
- _Sequencer_ - Added Setting to be able to hide Sequencer's tools on the toolbar
- _Sequencer_ - Added checkbox to Database Viewer to show all ranges of a single effect, which is by default set to false
- _Sequencer_ - Added `Sequencer.Helpers`, a library of useful methods - check them out on the wiki: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Helper-Functions
- _Animations_ - Added `.hide()` and `.show()` to hide or show the animated object
- _Effects_ - Added more secondary options parameters to `.stretchTo()`, which accepts:
  - At long last, this can now `attachTo` (boolean) to the given target. Combine with `.attachTo()` to link an effect between two tokens!
  - `onlyX` (boolean), if set to true, this will cause stretchTo to only stretch the X axis of the sprite towards the target (keeping Y at 1.0, or your given scale)
- _Effects_ - Added support to `.file()` for an object map containing the feet range and filepath key-value pair. Check out the file wiki entry to understand what this means: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#file
- _Effects_ - Added secondary options parameter to `.attachTo()`, which accepts:
  - `align` (string, default "center"), accepts `top-left`, `center`, `left`, `bottom-right`, etc. Read the wiki: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#attach-to
  - `bindVisibility` (boolean, default true), if set to false, the effect will not be hidden if the attached object is hidden
  - `bindAlpha` (boolean, default true), if set to false, the effect's alpha will be independent of the attached object
  - `followRotation` (boolean, default true), if set to false, the effect will not follow the rotation of the attached object
- _Effects_ - Added options to `.size()` which allows for `{ gridUnits: true }` - this makes the size given to the method scale to the scene's grid, instead of setting the exact width and height
- _Effects_ - Added the same option as above to `.animateProperty()` and `.loopProperty()`, which only works if you animate the `width` or `height`

**Fixes:**

- _Sequencer_ - Fixed module permissions settings being slightly wonky
- _Sequencer_ - Fixed number inputs not throwing errors on `NaN` values
- _Animations_ - Fixed users not being able to teleport or move tokens they do not own
- _Animations_ - Fixed `.moveSpeed()` not affecting the duration of the animation
- _Animations_ - Fixed `.delay()` not being respected
- _Effects_ - Fixed memory leak where effect textures were not properly destroyed
- _Effects_ - Adjusted `.origin()` to be able to accept a `Document` object to infer the UUID from
- _Effects_ - Fixed `.from()` not taking mirror x/y into account on tokens
- _Effects_ - Tokens with effects attached to them can now be \_ended by anyone who can update the token (owners of the token, GMs, etc)
- _Effects_ - Increased default resolution of `.text()` to 10 (should increase quality)
- _Effects_ - Fixed `.screenSpace()` effects still being affected by grid size normalization

### Version 1.3.5

- _Sequencer_ - Fixed Permissions being broken in the latest Foundry update, and moved Sequencer specific permissions into module settings instead
- _Effects_ - <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> Breaking change <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> - Fixed issue where setting the `.size()` of an effect and then scaling it would result in unexpected behavior. As a result, `.scaleIn()` and `.scaleOut()` now function as _multipliers_ to the existing scale on the effect

### Version 1.3.4

- _Sequencer_ - Added popup warning the first time a GM opens the Effect Player to tell them about the custom Permissions
- _Sequencer_ - Added button to open Foundry's Permissions directly from the Effect Player how-to page

### Version 1.3.3

- _Sounds_ - Fixed `.fadeInAudio()` and `.fadeOutAudio()` being broken

### Version 1.3.2

- _Sequencer_ - Minor backend updates to flag handling
- _Effects_ - Fixed static images failing to load in v9
- _Effects_ - Fixed effects attached to tokens that were copied to another scene would not play
- _Effects_ - Suppressed recent deprecation warnings until the next release
- _Effects_ - Reverted some code that would break persisting effects

### Version 1.3.1

- _Sequencer_ - Fixed minor spelling issue

### Version 1.3.0

- _Sequencer_ - Sequencer is now v9 ready!
- _Sequencer_ - Improved search accuracy functionality on the Effect Player
- _Animations_ - Added `relativeToCenter` option to `.teleportTo()` and `.moveTowards()`, which will offset the location relative to the object's center, effectively centering the animated object on the location - use with `.snapToGrid()` for reliable snapping!
- _Animations_ - Fixed `.fadeOut()`, `.fadeOutAudio()`, and `.rotateOut()` not correctly setting the duration of the animation, causing `.waitUntilFinished()` to not actually wait for the animation to finish
- _Effects_ - Deprecated `.JB2A()` as the recommended workflow is now to use Database paths

### Version 1.2.12 Hotfix

- _Effects_ - Fixed `.animateProperty()` and `.loopProperty()` applying animations that were already complete

### Version 1.2.11

- _Sequencer_ - Added French localization (thanks to Elfenduil)
- _Sequencer_ - Fixed error with `Sequencer.Database.validateEntries()` throwing an error
- _Effects_ - Improved handling of the `Glow` filter when used with `.fadeIn()` and `.fadeOut()`
  - Due to this change, it is now recommended that if you use `.animateProperty()` or `.loopProperty()` on the `sprite`'s `alpha` property to instead use it on the `alphaFilter`'s `alpha` property
- _Macros_ - Updated the Misty Step macro to be more generic and not specifically _require_ MidiQOL

### Version 1.2.10

- _Sequencer_ - Fixed misspelled permission which caused players to not be able to see the toolbar buttons
- _Sequencer_ - Added `End All Effects` button to the Effect Manager

### Version 1.2.9

- _Sequencer_ - Removed error from the Effect Manager when no effects were removed
- _Effects_ - Fixed `.randomOffset()` on tiles would result in pretty crazy behavior

### Version 1.2.8

- _Sequencer_ - Added sidebar tool permissions, you can now hide them from players
- _Effects_ - Added `.origin()` which provides a way to tag an effect with a string you can then search for with the Effect Manager
- _Effects_ - Added support for using both `.reachTowards()` and `.scale()` and will now scale the effect whilst keeping the range finding correct

### Version 1.2.7 Hotfix

- _Sounds_ - ACTUALLY Fixed sounds being broken

### Version 1.2.6 Hotfix

- _Sounds_ - Fixed sounds being broken

### Version 1.2.5

- _Sequencer_ - Made hooks `createSequencerEffect` and `endedSequencerEffect` instead supply the CanvasEffect itself, rather than its data
- _Effects_ - Fixed bug that caused effects to linger for other clients after having been \_ended

### Version 1.2.4

- _Sequencer_ - Fixed error caused by preload option on Sequencer Effect Player
- _Sequencer_ - Fixed error when pressing ESC in the Sequencer Layer
- _Sequencer_ - Fixed permissions not being loaded properly
- _Effects & Animations_ - Added `.tint()` which allows you to tint effects, tokens, and tiles

### Version 1.2.3

- _Sequencer_ - Added granular permissions - check it out in Configure Settings -> Open Permissions Configuration
- _Sequencer_ - Added localization support
- _Sequencer_ - Fixed the Sequencer Player throwing an error if the layer was active while switching scene

### Version 1.2.2

- _Sequencer_ - Added Stretch or Move checkbox to Sequencer Player
- _Sequencer_ - Added Move Speed input to Sequencer Player

### Version 1.2.1

- _Sequencer_ - Fixed file picker being broken

### Version 1.2.0

- _Sequencer_ - Added the [Sequencer Effect Player](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Player)!
- _Sequencer_ - Refactored the Sequencer Animation Engine, which fixes some animation funkiness
- _Sequencer_ - Fixed the Sequencer Preloader sometimes not succeeding and getting stuck
- _Animations_ - Removed the `.snapToSquare()` method, use `.snapToGrid()` instead
- _Effects_ - Added `.spriteOffset()` which allows you to add an offset to the effect's sprite's location
- _Effects_ - Added optional boolean parameters to `.randomizeMirrorX()` and `.randomizeMirrorY()`

### Version 1.1.5

- _Effects_ - Fixed bug that caused all effects to stay transparent after playing an effect for specific user
- _Effects_ - Fixed bug with `.missed()` and `.reachTowards()` failing to play any effect
- _Effects_ - Fixed all effects sharing users

### Version 1.1.4

- _Sequencer_ - Fixed error in the Sequencer Preloader when pre-loading files from Database paths
- _Effects_ - Fixed bug that caused persistent effects to end when a client connected after it was created

### Version 1.1.3

- _Sequencer_ - Added `sequencerEffectManagerReady` hook which is called when every effect has been set up on the scene that's currently loaded
- _Sequencer_ - Added `validateEntries` method to the Sequencer Database, which is helpful for module creators to validate their asset collections to the database
- _Sequencer_ - Added `getPathsUnder` method to the Sequencer Database, which retrieves valid collections under a certain database path
- _Sequencer_ - Minor speed improvements to how the database retrieves files
- _Sequencer_ - Removed the requirement for a user to be trusted to use the Database Viewer
- _Sequencer_ - Fixed `Sequencer.EffectManager.endEffects` not throwing error when incorrect or incomplete parameters were given, and instead \_ended all effects (whoops)
- _Effects_ - Made user-created effects that were made to be displayed only for other users also show up for GMs, though saturated and with 50% opacity. This is to ensure no player-to-player abuse would occur
- _Effects_ - Fixed scaled tokens causing effects to not play on the correct location
- _Effects_ - Fixed temporary effects attached to warpgate cursors no longer stays around for longer than they should

### Version 1.1.2

- _Sequencer_ - Removed compatibility warning regarding Perfect Vision as the module was updated to support Sequencer
- _Sequencer_ - Added warning when trying to register database collections under a module name containing dots (as it uses dot-notated paths)

### Version 1.1.1

- _Sequencer_ - Removed Hyperspace sample from compendiums, as it was getting too big
- _Sequencer_ - Added compatibility warning if user has Perfect Vision installed
- _Sequencer_ - Added warning for Hyperspace assets that are going to be removed in a future update, and instead put into a separate module:
  - https://foundryvtt.com/packages/nrsap by Nachtrose#9287 on Discord
- _Sequencer_ - Prepared Sequencer for v9, it _should_ be compatible to test
- _Effects_ - Added `.text()` which allows you to create text snippets on the canvas
- _Effects_ - Added `.from()` which creates an effect based on the given object, effectively copying the object as an effect
- _Effects_ - Added support for `.attachTo()` for temporary measured templates before they have been created, for use with WarpGate
- _Effects_ - Removed warning when `.attachTo()` and `.atLocation()` are used on the same effect - `.attachTo()` always wins out

### Version 1.1.0

- _Sequencer_ - Added hooks:
  - `createSequencerSequence`
  - `endedSequencerSequence`
  - Effects:
    - `preCreateSequencerEffect` - Provides the effect's data
    - `createSequencerEffect` - Provides the effect's data
    - `endedSequencerEffect` - Provides the effect's data
  - Sounds:
    - `preCreateSequencerSound` - Provides the sound's data
    - `createSequencerSound` - Provides the sound's data
    - `endedSequencerSound` - Provides the sound's data
- _Sequencer_ - Hook for `sequencer.ready` is becoming deprecated in favor for `sequencerReady`
- _Sequencer_ - Vastly improved the speed of the Database Viewer (thanks to Naito#1235 on discord!)
- _Effects_ - Added screen space layer for UI effects!
  - Added `.screenSpace()` which causes the effect to be played on the screen rather than in the game canvas
  - Added `.screenSpaceAnchor()` which causes the effect to anchor itself to a side on the screen space layer
  - Added `.screenSpacePosition()`, pretty straightforward what this does, sets the position of the effect in screen space
  - Added `.screenSpaceScale()` which can help you stretch and fit the effect to the screen, even on different screen sizes
- _Effects_ - Added `.spriteAnchor()` which controls the effect's core anchor point within its container (defaults to 0.5 on X and Y)
- _Effects_ - Added support on `.atLocation()` for a secondary options object, which currently accepts:
  - `cacheLocation: boolean` - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- _Effects_ - Added `.snapToGrid()` which snaps the effect to the given location's closest grid section
- _Effects_ - Added `.scaleToObject()` which scales the effect to the bounds of the object, with an optional scalar on top of that
- _Effects_ - Added `.zeroSpriteRotation()` which causes an effect's sprite to remain un-rotated when its container rotates in animations
- _Effects_ - Tweaked `.size()` to also accept only one of height or width, the other will be automatically resized to keep the effect's ratio
- _Effects_ - Fixed `.persist()`ing effects with an end duration that doesn't loop would not properly stop at its end duration
- _Effects_ - Improved look of transparent .webm files
- _Animations_ - Renamed `.snapToSquare()` method to `.snapToGrid()` - the old method will be fully removed in 1.2.0
- _Foundry_ - Added libwrapper patch for .webm transparency not playing correctly in Foundry
- _Sequencer_ - Updated some sample macros
- _Sequencer_ - The `SequencerDatabase` accessor has been removed, and is now accessible with `Sequencer.Database`
- _Sequencer_ - The `SequencerDatabaseViewer` accessor has been removed, and is now accessible with `Sequencer.DatabaseViewer`
- _Sequencer_ - The `SequencerPreloader` accessor is deprecated, and is now accessible with `Sequencer.Preloader`

### Version 1.0.3

- _Sequencer_ - Added animated space backgrounds (thanks to Keirsti on the Foundry VTT discord server)
- _Sequencer_ - Fixed Hyperspace macro placing the hyperspace intro and out incorrectly

### Version 1.0.2 Hotfix

- _Sequencer_ - Changed Effect Viewer icon to something less controversial

### Version 1.0.1

- _Sequencer_ - Renamed `.sequence()` method on Sequences to `.addSequence()` due to internal code conflicts
- _Effects_ - Added `.filter()` - was technically added in 1.0.0, but was left undocumented
- _Effects_ - Fixed `.size()` being scaled to account for grid size differences - it should now set the exact width/height in pixels

### Version 1.0.0

- _Sequencer_ - Added recent Sequencer tools to the menu in the top left - you can disable these in the module settings
- _Sequencer_ - Added `Sequencer.EffectManager` to manage persistent effects - [read more here](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Manager)
- _Sequencer_ - Added the ability for you to implement your own Sequencer functions - [read more here](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Section-Manager)
- _Sequencer_ - `SequencerDatabase` is deprecated, and is now accessible with `Sequencer.Database` - 1.1.0 will remove the old path entirely
- _Sequencer_ - `SequencerDatabaseViewer` is deprecated, and is now accessible with `Sequencer.DatabaseViewer` - 1.1.0 will remove the old path entirely
- _Sequencer_ - `SequencerPreloader` is deprecated, and is now accessible with `Sequencer.Preloader` - 1.1.0 will remove the old path entirely
- _Sequencer_ - Fixed Documents sometimes not properly resolving to their PlaceableObject
- _Sequencer_ - Fixed settings not being client side - whoops
- _Effects_ - Added `.attachTo()` which causes the effect to be attached to a given object
- _Effects_ - Added `.persist()` which causes the effect to become permanent on the canvas until removed
- _Effects_ - Added `.extraEndDuration()` which allows `.persist()`-ed effects to stick around for a bit longer instead of end immediately
- _Effects_ - Tweaked `.missed()` to hit an area only facing the origin of the effect, if it had an origin and target
- _Effects & Sounds_ - Added support for wildcard paths, like `modules/jb2a_patreon/Library/1st_Level/Bardic_Inspiration/BardicInspiration_01_*_400x400.webm`

### Version 0.6.12

- _Sequencer_ - Fixed an issue where the preloader would sometimes fail to preload
- _Effects_ - Fixed effects not playing on hex grids

### Version 0.6.11 Hotfix

- _Effects_ - Fixed range-finding effects sometimes not picking the right distance

### Version 0.6.10

- _Sequencer_ - Improved the search speed of the Database Viewer
- _Sequencer_ - Fixed previewing static images through the Database Viewer
- _Sequencer_ - Fixed bugs that caused the Database to sometimes fail registering new files
- _Effects_ - Fixed issue where `.delay()` would incorrectly contribute towards the effect's `.waitUntilFinished()` duration

### Version 0.6.9 Hotfix

- _Sequencer_ - Fixed the database sometimes failing to get the correct file

### Version 0.6.8 Hotfix

- _Sequencer_ - Fixed database not correctly finding range-based effects

### Version 0.6.7

- _Effects & Sounds_ - Fixed `.locally()` and `.forUsers()` sometimes erroneously remembering users between different effects & sounds
- _Effects_ - Fixed `.scaleIn()` would not take a custom `.size()` into account
- _Effects_ - Fixed static images sometimes not playing due to duration being set to 0ms

### Version 0.6.6

- _Sequencer_ - Added support for preloading files based on database paths
- _Effects & Sounds_ - Added `.locally()` and `.forUsers()`, which allow you to control which users will have the effect and sounds played for them
- _Effects_ - Improved positional handling of Tiles and TileDocuments

### Version 0.6.5

- _Sequencer_ - Updated Sequencer Database Viewer layout to be more user friendly
- _Effects_ - Fixed bug with templates and raw positions not being respected

### Version 0.6.4

- _Sequencer_ - Added Sequencer Database Viewer to the module settings, it allows you to preview effects and copy any files registered with Sequencer by other modules
- _Sequencer_ - Added client-side settings for users to be able to turn off effects and sounds being played locally
- _Effects & Sounds_ - Fixed effects and sounds playing on scenes they did not originate from
- _Effects_ - Added `.size()`, which sets the width and height of the effect in pixels
- _Effects_ - Added `rotate` option to `.moveTowards()`, which defaults to true. If set to false, the effect will not rotate towards the end location.
- _Effects_ - Fixed duration of effects using `.moveTowards()` not being calculated correctly
- _Effects_ - Fixed static image effects' durations also not being calculated correctly

### Version 0.6.3 Hotfix

- _Effects_ - Fixed effects failing to play static images

### Version 0.6.2

- _Sequencer_ - Further small fixes to how the database registers files

### Version 0.6.1

- _Sequencer_ - Removed the need for `.playIf()` to have to be given a function or a boolean
- _Sequencer_ - Fixed issues with the database when files were listed in arrays

### Version 0.6.0

**Breaking:**

- _Effects_ - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.JB2A()` has been altered to set the gridsize to 200, as it was previously set to 100 - this will halve the size all JB2A on-the-spot effects, sorry! <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

**Additions:**

- _Sequencer_ - Added `SequencerPreloader` - you can now preload images, effects, and sounds for your players, read more on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Preloader)
- _Sequencer_ - Added support for templates and time ranges in database structure, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database)
- _Effects_ - Added support for static images such as webp, pngs, jpgs, etc
- _Effects & Sounds_ - Added `.startTime()`, `.startTimePerc()`, `.endTime()`, `.endTimePerc()`, and `.timeRange()`, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#start-time)
- _Sounds_ - Added `.addOverride()`, `.baseFolder()`, and `.setMustache()` support to sounds

**Updates & Fixes:**

- _Sequencer_ - `.play()` now reliably resolves its promise at the end of the entire sequence
- _Effects_ - _Vastly_ improved effect caching and loading speed of effects and sounds
- _Effects_ - Improved object position handling slightly when providing non-foundry class objects to `.atLocation()` and alike
- _Effects_ - Generally improved compatibility with `TokenDocument` and Foundry D&D 5E documents when getting their positions

### Version 0.5.9

- _Effects_ - Added `.addPostOverride()` as an alternative to `.addOverride()`, which executes at the end of the effect data sanitation
- _Effects_ - Fixed `.gridSize()`, `.startPoint()`, and `.endPoint()` not being respected and being overridden by internal logic

### Version 0.5.8 Hotfix

- _Macros_ - Fixed macros throwing error when playing sequence

### Version 0.5.7

- _Effects_ - Fixed templates sometimes not being found
- _Effects_ - Re-added backwards compatibility with old macros that still use `data.distance` in overrides

### Version 0.5.6

- _Sequencer_ - Added alpha version of the Sequencer Database Viewer
- _Effects_ - Added `.randomOffset()` which can add a random offset similar to `.missed()`, but _within_ the bounds of the target token / tile / other. Check out the docs!
- _Effects_ - Fixed `.waitUntilFinished()` not being respected
- _Effects_ - Fixed `.offset()` throwing an error about a missing function
- _Effects_ - Fixed `.repeats()` throwing an error, because the entire function went missing in the last update >.>

### Version 0.5.5 Hotfix

- _Effects_ - Fixed effects sometimes not playing

### Version 0.5.4 Hotfix

- _Effects_ - Fixed melee attacks not picking the right JB2A template

### Version 0.5.3

- _Sequencer_ - Added sound to the Hyperspeed Sample thanks to the wonderful AurelTristen over at [HellScape Tabletop Assets](https://www.patreon.com/HellScapeAssets) (even though they're not specifically focused on sound effects)
- _Effects_ - Fixed major issue with JB2A templates, causing effects to pick the wrong ranged attacks & other shenanigans
- _Effects_ - Fixed effect scale inconsistencies across scenes with different grid sizes

### Version 0.5.2

- _Sequencer_ - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for Foundry Version 0.7.x <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- _Sequencer_ - Refactored animations into a dedicated animation engine
- _Effects_ - Added support for static image effects (.jpeg, .png, etc)
- _Effects_ - Fixed grid size sometimes not being taken into account when playing effects with `.reachTowards()`
- _Sounds_ - Vastly improved and fixed sound implementation, big thanks to ghost#2000!
- _Sounds_ - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for `.fadeIn()` and `.fadeOut()` in Sounds <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

### Version 0.5.1

- _Sequencer_ - Added two sample scenes with macros and accompanying art:
  - An animated Oujia board made by md-mention2reply
  - A Star Wars inspired hyperspeed scene-switching scene, effects, and macro
- _Sequencer_ - Removed Token Ease as dependency until we can solve its conflicts with other modules
- _Effects_ - Fixed effects not auto-centering on tokens
- _Effects_ - Fixed effects not finding the proper location when a previous effect's `.name()` was given
- _Animations_ - Fixed `.rotate()`, `.opacity()`, and `.volume()`, now they work even without having to use their respective in/out functions

### Version 0.5.0

- _Sequencer_ - Module now depends on [Token Ease](https://github.com/fantasycalendar/FoundryVTT-TokenEase)
- _Sequencer_ - Added the Sequencer Database to help content creators! Read more on the [database documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database) how to use it!
- _Effects & Sounds_ - Added support for database collections to the `.file()` method - more info can be found in the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#file)
- _Animations, Effects & Sounds_ - Added the following functions:
  - `.audioVolume()`
  - `.fadeInAudio()`
  - `.fadeOutAudio()`
- _Effects_ - Added support for delays on these methods (e.g. a delay of -500 means it will finish 500ms before the end of the duration):
  - `.rotateOut()`
  - `.fadeOut()`
  - `.scaleOut()`
  - `.fadeOutAudio()`
- _Animations_ - Fixed `.rotateTowards()` to properly rotate towards the target without having to add an offset to properly line them up
- _Effects_ - Made effects more intelligent when determining locations when given partial object data with `id` collections
- _Effects_ - Fixed issues surrounding delays and fades
- _Sounds_ - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.fadeIn()` and `.fadeOut()` will become deprecated in a future version, please switch to `.fadeInAudio()` and `.fadeOutAudio()` <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

### Version 0.4.6 Hotfix

- _Effects_ - Fixed effects not playing on tokens on 0.7.10 and below

### Version 0.4.5

- _Effects_ - Added `.offset()` so that you can offset the effect - an optional parameter allows you to offset in local or canvas space
- _Animations_ - Added `.snapToSquare()`, which causes the given object to be snapped to the square it is moving or teleported towards
- _Animations_ - Fixed `.rotateIn()` and `.rotateOut()` not properly calculating rotation
- _Animations_ - Adjusted `.rotateTowards()` to instead consider the target position as the rotation origin, rather than the object's current position

### Version 0.4.4

- _Animations_ - Added `.animation()` section - animate tokens and tiles! Check out the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Animations) how to use it!
- _Effects_ - Added official support for tiles in `.atLocation()`, `.moveTowards()`, etc
- _Effects_ - Tweaked how effects get locations when dealing with raw template data
- _Sequencer_ - Added `.sequence()` so you can combine multiple sequences into one
- _Sequencer_ - Updated all sample macros to 0.8.x conventions

### Version 0.4.3 Minor Fixes

- _Effects_ - Removed error catch in `.file()` when providing it with something else than string or array
- _Effects_ - Fixed `.belowTokens()` and `.belowTiles()` throwing errors if no boolean was provided

### Version 0.4.2 Hotfix

- _Effects_ - Added `.rotate()` which adds an offset to the effect's rotation
- _Effects_ - Fixed `.moveTowards()` not respecting given easing

### Version 0.4.1

- _Sequencer_ - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> **Breaking Changes**: Removed deprecated `.then()` method <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- _Sequencer_ - Tweaked `.play()` to now return a promise
- _Sequencer_ - Reworked module class structure
- _Sequencer_ - Added debug setting

### Version 0.4.0

- _Sequencer_ - Renamed `.then()` to `.thenDo()` due to JavaScript reasons — <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.then()` will be removed in 0.4.1 <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- _Sequencer_ - Removed the requirement to pass `true` as a second argument to `.then()` (now `.thenDo()`) if the function was async, it will now wait for it to finish if it is an `async function`
- _Effects_ - Added `.mirrorX()` and `.mirrorY()` to mirror the effect on that axis
- _Effects_ - Improved `.JB2A()` to better handle melee weapon attacks
- _Effects_ - Tweaked `.belowTiles()` and `.belowTokens()` to accept an optional boolean parameter whether the effect should play behind the respective element
- _Effects_ - Tweaked effects to assume that .webms have a base 100px internal grid for size consistency

### Version 0.3.13 Hotfix

- _Effects_ - Fixed ANOTHER bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.12

- _Effects_ - Added `.opacity()` which controls the alpha of the effect being played
- _Effects_ - Fixed bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.11

- _Effects_ - Added `.belowTiles()` to play effects below tiles
- _Effects_ - Implemented better order handling - the effects created first will always be on top, each subsequent effect will be played below the previous
- _Effects_ - Added `.zIndex()` for you to have direct control over the order of effects
- _Effects & Sounds_ - Added `.duration()` which can override the duration of an effect or sound
- _Effects & Sounds_ - Tweaked `.waitUntilFinished()` to accept a single number parameter as a delay or to end the effect or sound earlier - read more in the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#wait-until-finished)
- _Sounds_ - Added support for `.fadeIn()` and `.fadeOut()` - easing sadly doesn't work for sounds yet

### Version 0.3.10

- _Sequencer_ - Added macro pack containing examples of Sequencer usages
- _Effects_ - Added the following animated functions:
  - `.scaleIn()`
  - `.scaleOut()`
  - `.rotateIn()`
  - `.rotateOut()`
  - All of these can utilize any of the easings listed here: https://easings.net/
  - Read the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#scale-in) how to use these
- _Effects_ - Added better error reporting when something goes wrong in the sequence
- _Effects_ - Fixed bug with scale sometimes overriding `.reachTowards()`

### Version 0.3.9

- _Effects_ - Added `.belowTokens()` so you can now play effects, well, below tokens
- _Effects_ - Fixed effects not replicating properly (AGAIN)
- _Effects_ - Fixed effects not being able to use `.name()`d effects if they didn't miss - now any effect can be named and be used in future effects

### Version 0.3.8 Hotfix

- _Effects_ - Fixed effects that were supposed to be once-off instead looping

### Version 0.3.7

- _Effects_ - Added `.moveTowards()` and `.moveSpeed()` for missile-like behavior
- _Effects_ - Tweaked the way the effects layer is applied to the canvas' layers
- _Effects_ - Fixed major issue with the way effects that were using `.missed()` and `.name()` were cached
- _Sequencer_ - Removed stray debug code

### Version 0.3.6

- _Effects_ - Added `.fadeIn()` and `.fadeOut()` - you can now make your effects look slightly nicer!
- _Effects_ - Added support for cone and line templates with `.reachTowards()` and `.rotateTowards()` - it now reaches towards the end point of the template
- _Effects_ - Added `.name()` to effects - this will cause the effect's position to be stored and can then be used with `.atLocation()`, `.reachTowards()`, and `.rotateTowards()` to refer to previous effects' locations
  - Example: naming an impact effect with `.name("hit_location")` and making it miss with `.missed()`, and then have a subsequent effect use `.rotateTowards("hit_location")` to rotate towards the previous effect's calculated location
- _Effects_ - Fixed `.scale()` bug that caused it to not properly set the scale and then cause an error upon calling `.play()`
- _Effects_ - Removed `.moves()` for future implementation
- _Sequencer_ - Tweaked `.async()` and `.waitUntilFinished()` handling
  - They now act the same on effect and sounds that only play once, but if it `.repeats()`, `.async()` causes the effect or sound to wait between each repetition, `.waitUntilFinished()` causes the sequencer to wait until the effect or sound has finished executing all of its repetitions, which may or may not wait for each effect or sound to play with `.async()`
- _Sequencer_ - Calling `.play()` now returns the sequence
- _Sequencer_ - Removed `FXMaster` dependency and implemented a custom canvas layer and effects class

### Version 0.3.5 Hotfix

- _Sequencer_ - Fixed `.wait()` breaking due to the `.async()` and `.waitUntilFinished()` swap

### Version 0.3.4 Hotfix

- _Effects_ - Fixed issue that caused the wrong scale to be applied when using `.reachTowards()`

### Version 0.3.3

- _Effects_ - Added `.playIf()` ([docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#play-if)); this allows you to completely ignore playing an effect or sound, depending on a boolean or a function
- _Sounds_ - Added support for `.async()` and `.waitUntilFinished()` for sounds - requires both to be `true` due to code weirdness, I'll be refactoring this in the future
- _Effects_ - Refactored `.scale()` when it was provided with a minimum and maximum value, it now randomizes the scale of the effect when executed instead of when the method was called
- _Effects & Sounds_ - Refactored `.file()` for both effects and sounds so that providing an array of files no longer immediately picks one from the array, but randomly picks a file each time the section is executed
- _Effects & Sounds_ - Refactored how `.delay()` interacted with `.repeats()`, which should result in more consistent behavior
- _Sequencer_ - Swapped the functionality of `.async()` and `.waitUntilFinished()`, and clarified in the docs
- _Sequencer_ - Added support for random range within a `.wait()` block (like, `.wait(500, 1000)` etc)

### Version 0.3.2 - 0.8.x ready!

- _Effects_ - Added `.playbackRate()` to effects, you can now speed up the play rate of your effects
- _Sequencer_ - Tweaked internal handling of `.async()` together with `.waitUntilFinished()` improved
- _Sequencer_ - Tweaked to use `ready` instead of `init` to load module

### Version 0.3.1

- _Effects_ - Refactored `.randomizeMirror()` into `.randomizeMirrorX()` and `.randomizeMirrorY()`
- _Effects_ - Refactored scaling algorithm for `.reachTowards()`
- _Sequencer_ - Added support for random `.wait()` interval

### Version 0.3.0

- _Effects_ - Refactored `.aimTowards()` into `.rotateTowards()` and `.reachTowards()`
- _Effects_ - Refactored how `.missed()` chooses the location to hit and now takes token size into account
- _Effects_ - Added `.JB2A()` to automatically set the effect to handle their sprites in the best way possible
- _Effects_ - Added `.randomizeMirror()` to randomly mirror sprites on the Y axis
- _Effects_ - Added Mustache support in file names

### Version 0.2.0

- _Sequencer_ - Added support for executing macros
- _Sequencer_ - Added support for playing sounds
- _Sequencer_ - Wrapped classes in proxies to simplify fluid interface (gets rid of `.done()` on effects and sounds)

### Version 0.1.0

- First implementation
