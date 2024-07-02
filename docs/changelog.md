## Changelog

## Version 3.2.9
- *Effects* - Fixed effects with `.attachTo()` sometimes throwing errors and causing the scene to freeze
- *Effects* - Fixed `.mask()`ed effects not following measured templates correctly

## Version 3.2.8
- *Sequencer* - Fixed Sequencer Manager throwing A DIFFERENT error when trying to see active
- *Effects* - Fixed `.persist()` effects not looping when first created (but would loop if enough time had passed & user had refreshed - very odd)

## Version 3.2.7 Hotfix
- *Effects* - Fixed `.persist()` effects not looping

## Version 3.2.6
- *Sequencer* - Fixed Sequencer Manager throwing an error when trying to see active Sequences
- *Effects* - Added `.sortLayer()` to be able to more directly control which layer the effect lands on (only in Foundry v12)
  - This also fixes `.belowTokens()` being below tiles
  - Thank you Codas on GitHub!
- *Effects* - Added `.loopOptions()` to allow users to control how an effect loops
- *Effects* - Deprecated `.noLoop()` in favor of the above, will be elevated to loud deprecation in a future major version

## Version 3.2.5
- *Effects* - Updated documentation to include `.volume()`, `.fadeInAudio()`, and `.fadeOutAudio()`
- *Effects* - Fixed some issues with effect scaling when using `.loopProperty()` and `.animateProperty()`
- *Sounds* - Fixed `Sequencer.SoundManager.endAllSounds()` not ending all sounds
- *Sounds* - Fixed `Sequencer.SoundManager.endSounds()` sometimes not correctly ending the right sounds
- *Sounds* - Fixed calling `.sound()` would break sequences in both Foundry v11 and v12

## Version 3.2.4
- *Sequencer* - Fixed `.preset()` not working when called directly on a sequence (thanks MrVauxs!)
- *Effects* - Added deprecation warning to `.file()` instead of an error when giving it a second boolean parameter
- *Effects* - Fixes to the isometric module - may still not be 100%, but it shouldn't error anymore
- *Sounds* - Fixed sounds not playing on v11 (again!)

## Version 3.2.3 Hotfix
- *Effects* - Fixed issue with effects not playing their full duration

## Version 3.2.2
- *Sequencer* - ACTUALLY fixed welcome message being posted multiple times in bigger worlds (will also get rid of duplicates)
- *Effects* - Fixed `.animateProperty()` and `.loopProperty()` not working when used on `alphaFilter`
- *Effects* - Fixed effects that were attached to temporary templates (like warpgate's crosshairs) not disappearing after the crosshair had been placed
- *Effects* - Fixed issue with `complete`-loop type effects not playing correctly

## Version 3.2.1
- *Sequencer* - Fixed welcome message being posted multiple times on The Forge - my apologies for this
- *Sequencer* - Fixed `Sequencer.Preloader` not being properly set up (thanks Codas on github!)
- *Effects* - Added `antialiasing` optional argument to `.file()` - expects `PIXI.SCALEMODES.LINEAR` or `PIXI.SCALEMODES.NEAREST`
- *Effects* - Fixed `.moveTowards()` not working
- *Effects* - Fixed `.animateProperty()` and `.loopProperty()` not properly animating effects
- *Effects* - Fixed `.timeRange()` and `.endTime()` not working properly
- *Sounds* - Fixed `.atLocation()` incorrectly throwing errors when on Foundry v12 (thanks Codas on github!)
- *Sounds* - Fixed sounds not working on Foundry v11

## Version 3.2.0
- *Sequencer* - Added support for FoundryVTT v12 while remaining backwards compatible with v11
- *Sequencer* - Added startup chat message with links to relevant external resources
- *Sequencer* - Added support for the [Isometric module](https://foundryvtt.com/packages/grape_juice-isometrics) (thanks grape_juice for their assistance with this integration!) 
- *Sequencer* - Added `Sequencer.SoundManager` which is a sound interface that mirrors `Sequencer.EffectManager`
- *Effects* - Greatly improved responsiveness of attached effects actually following their targets more accurately
- *Effects* - Removed deprecated methods `.offset()` and `.randomOffset()` as those should now be done with the relevant location-based secondary parameters
- *Effects* - Added `.syncGroup()` which allows you to synchronize the playback of multiple effects in the same scene
- *Effects* - Tweaked `.scaleToObject()` to cache its target's scale when first created, unless paired with `.attachTo()` and `bindScale` (see below)
- *Effects* - Added `bindScale` (defaults to `true`) to `.attachTo()`, that if combined with `.scaleToObject()` it will always scale with the object
- *Effects* - Fixed `.tint()` not being applied when used with `.attachTo()` and `.stretchTo()` with `{ attachTo: true }`
- *Effects* - Tweaked `.attachTo()`'s `followRotation` to be named `bindRotation` (will remain backwards compatible until 3.3.0 before becoming deprecated)
- *Sounds* - Added support for the following methods (see the [`.sound()` documentation](https://fantasycomputer.works/FoundryVTT-Sequencer/#/api/sound) for more info):
  - `.name()`
  - `.origin()`
  - Below only in Foundry v12:
    - `.atLocation()`
    - `.radius()`
    - `.constrainedByWalls()`
    - `.distanceEasing()`
    - `.alwaysForGMs()`
    - `.baseEffect()`
    - `.muffledEffect()`

## Version 3.1.4
- *Effects* - Added better support for the Walled Templates module
- *Effects* - Fixed effects becoming invisible when using both `offset` and `local` with just a source location and no target
- *Effects* - Fixed `.shape()`s `isMask` property not working when the shape type was set to `polygon`
- *Sounds* - Fixed "End All Sounds" button not working in the Sequencer Manager

## Version 3.1.3
- *Sequencer* - Removed stray debugger, whoops
- *Animations* - Fixed `.rotateTowards()` being off by a few degrees
- *Effects* - Added `.temporary()`, which causes an effect to not set any flags on any objects, which means a refresh will make the effect disappear
- *Effects* - Fixed `.zIndex()` not working with `.screenSpace()`
- *Effects* - Fixed `offset`'s `local` modifier not applying correctly when using `.stretchTo()` and the like

## Version 3.1.2
- *Sequencer* - Fixed Sequencer's ready hooks sometimes not firing when canvas was fully ready
- *Effects* - Improved persistent effects behavior when pasted across scenes 

## Version 3.1.1
- *Effects* - Fixed `.shape()` with `mask: true` not masking its parent
- *Effects* - Hopefully fixed issues surrounding effects sometimes not being cleared properly
- *Effects* - Fixed effects in v11 sometimes ending up in the top left corner after switching scenes

## Version 3.1.0
- *Sequencer* - Fixed a bug in the database when copying some file paths would not work properly
- *Effects* - Added `.aboveInterface()`

## Version 3.0.14
- *Sequencer* - Improved Database-to-Database binding when considering custom metadata
- *Animations* - Fixed cases where if a newly created token had `.animation()`s applied to them would sometimes fail due to `Token#mesh` not being initialized (Thanks LukeAbby & TMinz)
- *Effects* - Vastly improved `.mask()` performance and behavior all thanks to dev7355608!
- *Effects* - Fixed a rare case where range-finding effects would fail to determine the right video file to play

## Version 3.0.13
- *Effects* - Added `.randomSpriteRotation()`
- *Effects* - Fixed a bug with cached locations and `.mask()`
- *Effects* - Fixed database-to-database mappings

## Version 3.0.12
- *Sequencer* - Fixed console error caused by the clean-up of old expired effects (Thanks LukeAbby on Github!)
- *Sequencer* - Added `fullyQualified` secondary parameter to `Sequencer.Database.getPathsUnder()` (Thanks LukeAbby on Github!)
- *Animations* - Added support for elevation in `.teleportTo()`
- *Canvas Pan* - Fixed `.canvasPan()` not working other clients than the executing client
- *Effects* - Slightly adjusted how `.missed()` interacts with `.stretchTo()` when two tokens are right next to each other
- *Effects* - Fixed `.playbackRate()` causing effects to have the incorrect amount of playback time
- *Effects* - Fixed `.rotateTowards()` not working with `.text()`

## Version 3.0.11
- *Sequencer* - Made PIXI fix settings default to being turned off
- *Sequencer* - Fixed strange interaction with `.preset()` not working when certain functions were called in the preset
- *Sequencer* - In Foundry v11, `.macro()` now requires the secondary parameter to be an object, as the behavior of Advanced Macros have been partially integrated in v11
- *Effects* - Fixed some persistent effects not being deleted from scenes after their attached sources were deleted
- *Effects* - Fixed effects targeting drawings not properly using the drawing position and dimensions
- *Effects* - Fixed `.playbackRate()` not working well with internal loops and `.persist()`

## Version 3.0.10
- *Sequencer* - Fixed Effect Player not working in Foundry v11
- *Sequencer* - Fixed private modules showing up in the Database Viewer

## Version 3.0.9
- *Canvas Pan* - Added `.shake()` which can be used to add camera shake to the canvas
- *Effects* - Fixed glow filter not working in v11
- *Effects* - Fixed `.belowTokens()` being below tiles as well

## Version 3.0.8
- *Effects* - Fixed `stretchTo()` effects sometimes not being visible

## Version 3.0.7
- *Effects* - Added `requiresLineOfSight` and `hideLineOfSight` to the secondary arguments of `.stretchTo()`
  - This requires `attachTo` to be true in `stretchTo()`
  - `requiresLineOfSight` causes the effect to immediately end if the line of sight between the source and target is broken
  - `hideLineOfSight` modifies the above behavior to temporarily hide the effect until the line of sight is unbroken
- *Effects* - Fixed the "External Effect Opacity" setting, which causes effects playing for other players to show up as faint for GMs to let them know that players has effects playing for them, but would not work if the opacity was set to 0
- *Effects* - Improved dual-attached effects performance

## Version 3.0.6
- *Sequencer* - Fixed issue with Sequencer trying to make users migrate tokens and effects they do not own 
- *Effects* - Fixed effects not updating reliably when the target's opacity and/or hidden status changes

## Version 3.0.5
- *Effects* - Fixed support for google bucket files (it meant to be `video/x-webm` instead of `video/webm-x`)
- *Effects* - Fixed dual attached effects disappearing once going beyond the range of the initial effect

## Version 3.0.4
- *Effects* - Added support for file buckets that contain `video/webm-x` files (mostly Google Buckets)
- *Effects* - Fixed `.scaleToObject()` taking into account token scale when it should not (unless `considerTokenScale` is set to `true`)

## Version 3.0.3
- *Sequencer* - Fixed edge case with `.addSequence()` that would cause a sequence to ignore `softFail`
- *Effects & Sounds* - Removed secondary boolean argument for `.file()` as it is covered by the Sequence-wide soft fail

### Version 3.0.2
- *Sequencer* - Added backwards compatibility to the old format of `new Sequence(moduleName, softFail)`
- *Sequencer* - Added `remote` support for `.wait()`
- *Sequencer* - Added `moduleName` and `softFail` support for `remote`
- *Animations* - Fixed `.snapToGrid()` sometimes not working well on hex scenes 
- *Effects* - Fixed `.xray()` causing effects to disappear
- *Sounds* - Fixed `softFail` not working properly

### Version 3.0.1
- *Effects* - Fixed `cacheLocation` not working on effect locations
- *Effects* - Fixed dual attached effects not working

### Version 3.0.0
- *Sequencer* - Updated Sequencer Database Viewer:
  - Improved UI and added nested tree view
  - Added ctrl modifier to buttons that copy paths, which adds quotes around the copied paths
- *Sequencer* - Updated Sequencer Effect Player:
  - Improved UI based on the design of MatthijsKok on github - thanks a lot for the inspiration!
- *Sequencer* - Reworked the Sequencer Effect Manager to the Sequencer Manager:
  - Added the ability to stop running sounds
  - Added a Sequence view where you can see the sequences as they are running, and stop the entire execution or their individual sections
- *Sequencer* - Added `.scrollingText()` which allows playing scrolling text on the canvas for users
- *Sequencer* - Added `.canvasPan()` which allows panning the canvas for connected users
- *Sequencer* - Added `.toJSON()` and `.fromJSON()` to Sequences to be able to be serialized and deserialized; only sequences with effects, sounds, and scrolling texts can be serialized
- *Sequencer* - Added options to `.play()`, which may contain an object; currently supports `{ remote: true/false }` which will serialize the sequence (see above), and send it to each client for local playback, instead of the person running the sequence sending data to clients as it is being executed
- *Sequencer* - Added database support for `_timestamps` metadata on effect files, which will trigger the `sequencerEffectTimestamp` hook when effects reach the point of the timestamps for that file
- *Sequencer* - Added support for flipbook-type effects through a `_flipbook` database tag
- *Animations* - Improved playback of movement, fade in/out, and rotation animations on tokens
- *Effects* - Added `CanvasEffect#addAnimatedProperties`, which will allow you to easily add animations to properties of existing effects
- *Effects* - Improved screenspace above UI effect performance by not rendering the extra canvas when not in use
- *Effects* - Fixed screenspace effects being affected by the vision mask
- *Effects* - Fixed `.stretchTo()` effects would be visible when not in vision
- *Effects* - Fixed `.fadeOut()` and `.scaleOut()` not working at all
- *Effects* - Reworked how effects are replicated on linked tokens when `.persist()`'s `persistPrototypeToken` is enabled, improving performance

### Version 2.414
- *Sequencer* - Included missing CSS file

### Version 2.413
- *Sequencer* - Added support for database paths that resolve to other database paths
- *Sequencer* - Isolated Sequencer's styling so that it doesn't leak out into other modules or systems
- *Effects* - Fixed `.loopProperty()` not respecting `loops: 0`
- *Effects* - Fixed `.animateProperty()` not keeping track of relative values when animating the same property multiple times
- *Effects* - Fixed named screenspace effects without a specific location not playing and throwing errors
- *Sounds* - Fixed `softFail` not allowing sounds to softly fail

### Version 2.412
- *Sequencer* - Added setting to hide/show the Sequencer buttons in the left sidebar when in the token controls
- *Animation* - Fixed `.moveTowards()` going into infinite loop if the source and targets are on top of each other
- *Effects* - Fixed `.shape()` taking grid size into account multiple times
- *Effects* - Fixed `.volume()`, `.fadeInAudio()`, and `.fadeOutAudio()` not working on webms with embedded audio 

### Version 2.411
- *Sequencer* - Fixed infinite recursion when using `.waitUntilFinished()` in the middle of a sequence
- *Sequencer* - Undid some minor issues in the database viewer

### Version 2.410
- *Sequencer* - Added support for playing sounds in the Sequencer Database (thank you ZotyDev for the pull request!)
- *Sequencer* - Calling methods on the sequence that it does not have will be attempted to be cast to the last section
- *Sequencer* - You can now provide `false` as an argument to `.waitUntilFinished()`, which will negate its call
- *Effects* - Fixed animations on `alphaFilter`'s `alpha` not working

### Version 2.49
- We don't talk about this version

### Version 2.4.8
- *Effects* - Fixed rectangle measurable templates would be off by 45 degrees
- *Effects* - Fixed tokens with locked rotation would cause attached effects to be rotated anyway
- *Effects* - Fixed `.tint()` not applying to `.stretchTo()` effects

### Version 2.4.7
- *Effects* - Actually fixed shapes

### Version 2.4.6
- *Effects* - Fixed effects with only shapes would not play properly
- *Effects* - Fixed error when users tried to play effects even when `softFail` was set to `true`

### Version 2.4.5
- *Effects* - Fixed effects playing on the same scene as the user's current scene, even if the target of the effect was on another scene
- *Effects* - Fixed `.from()` not working with the new `softFail` sequence parameter
- *Effects* - Fixed being able to pass non-valid parameters to `.atLocation()` and similar functions without errors

### Version 2.4.4
- *Sequencer* - Tweaked the arguments to `new Sequence("moduleName")` to `new Sequence(inOptions)` - it now takes a single object that can contain:
  - `moduleName` <string> - The name of the module that is creating this sequence - this is for other users to know which module used Sequencer
  - `softFail` <boolean> - Setting this to `true` causes any failures to find files for effects, sounds, or macros to softly fail, rather than halt the entire sequence
- *Effects* - Tweaked `.shape()`s parent to be the `spriteContainer` rather than the `sprite`, so that animations to the sprite doesn't affect the shapes
- *Effects* - Fixed `.shape()` not considering their offset with `isMask` enabled  

### Version 2.4.3
- *Sequencer* - Switched `Disable Pixi Fix` to `Enable Pixi Fix` to make it more consistent with other settings
- *Sequencer* - Added `Enable Global Pixi Fix` which fixes the alpha on animated tiles if enabled (use with caution) 
- *Effects* - Fixed `.atLocation()` and `.persist()` throwing errors and thus failing to persist the effect on the scene
- *Effects* - Slight tweaks to visibility logic of effects to be more consistent
- *Effects* - Tweaked `.attachTo()`'s `align` and `edge` to not consider token scale when determining the edge of the token

### Version 2.4.2
- *Sequencer* - Added `Sequencer.Presets` which allows you to create and save reusable bits of sequences
- *Sequencer* - Added `.preset()` which allows you to use the aforementioned presets
- *Sequencer* - Added optional `considerTokenScale` to the optional `options` parameter to `.scaleToObject()`, you can set it to `true` in order for the visual effect to also consider the token scale
- *Sequencer* - Added support for persistent visual effects on "fake" tokens created by Multilevel Tokens (only supports effects that are applied to the prototype token) 
- *Sequencer* - Slightly improved the speed of document updates when visual effects are first applied
- *Sequencer* - Added a throttled console warning when the Photosensitive Mode is enabled and a client is trying to play effects (only warns once every 10 seconds when effects are played)
- *Effects* - Fixed `.scaleToObject()` always taking token scale into account, which it shouldn't do by default

### Version 2.4.1
- *Effects* - Fixed minor typo in `.mask()`

### Version 2.4.0
- *Sequencer* - Added `Seqencer.EffectManager` to the autocomplete types
- *Sequencer* - Fixed minor issue with the Effect Manager sometimes trying to load non-existent effect data
- *Effects* - Added `.shape()`, which allows you to create simple shapes on the canvas
  - See: <https://fantasycomputer.works/FoundryVTT-Sequencer/#/api/effect?id=shape>
- *Effects* - Fixed `.attachTo()` would attempt to apply flags on temporary templates such as warpgate crosshairs

### Version 2.3.21
- *Sequencer* - Fixed interaction with the `Advanced Macros` module past version 1.19.2 (Thanks MrVaux!)
- *Sequencer* - Fixed issue with `Sequencer.Helpers.shuffle_array` not handling complex arrays very well
- *Effects* - Fixed `.from()` not taking token scale into account

### Version 2.3.20
- *Sounds* - Fixed sounds not working

### Version 2.3.19
- *Sequencer* - Created a new wiki for Sequencer:
  - <https://fantasycomputer.works/FoundryVTT-Sequencer/> 
- *Sequencer* - Added full support for Sequencer typings in the ***Monaco Macro Editor*** (thanks to laquasicinque for your initial work!)
- *Sequencer* - Changed all settings to use Foundry v10's `requiresReload` instead of reloading the app
- *Sequencer* - Removed compendium of sample macros, in favor of the new wiki
- *Effects* - Added further support for webm's loaded through S3 buckets (files with type `application/octet-stream` now supported)
- *Sounds* - Sounds' `.file()` now has a secondary parameter to allow a false-y primary input to soft fail, instead of halting the entire Sequence

### Version 2.3.18
- *Sequencer* - Added support for Foundry's photosensitive setting, which disables all effects without impacting other functionality 
- *Sequencer* - Fixed incompatibility with the Foundry team's ***A House Divided*** adventure, the scenes should no longer appear to have a dark overlay
- *Sequencer* - Updated `.macro()` to work with the latest version of the ***Advanced Macros*** module

### Version 2.3.17
- *Effects* - Fixed `.tieToDocuments()` not working for embedded documents on unlinked tokens

### Version 2.3.16
- *Effects* - Adjusted approach when ending effects when using `.tieToDocuments()`

### Version 2.3.15
- *Sequencer* - Fixed registering similar named modules in the database would cause the second to not register properly 

### Version 2.3.14
- *Effects* - ACTUALLY fixed `.tieToDocuments()` (send help)

### Version 2.3.13
- *Effects* - Fixed deeper issue with `.tieToDocuments()` as it was not recognizing actors or items as parents in respect to UUIDs

### Version 2.3.12
- *Effects* - Fixed `.missed()` and `.stretchTo()`'s `randomOffset` having weird interactions when `.name()` was used to play effects at target locations
- *Effects* - Fixed `.tieToDocuments()` throwing errors and not removing effects when the tied documents were deleted 

### Version 2.3.11
- *Sequencer* - Added `Sequencer.Database.inverseFlattenedEntries` which is a map object with the key being the file path and the value being the database path for that file
- *Effects* - Added `bindElevation` (default `true`) as a secondary argument to `.attachTo()` which can be used to make effects not follow the target's elevation
- *Effects* - Made `.elevation()` be relative to the target of the effect by default, you can pass a secondary object with `absolute: true` to make it absolutely elevated on the scene
- *Effects* - Improved internal logic when trying to play effects on clients who have disabled them - previously it had a chance to throw an error when clients with effects disabled would run sequences that included effects (as they would not know the duration of the effect)

### Version 2.3.10
- *Effects* - Fixed race condition when deleting multiple attached effects in a row would leave some lingering effects

### Version 2.3.9
- *Effects* - Fixed effects sticking around after deleting the document they were attached to
- *Effects* - Fixed error when deleting documents relating to named effects
- *Effects* - Fixed setting the position of screenspace effects would not work

### Version 2.3.8
- *Sequencer* - Removed double declaration of socketlib hook
- *Effects* - Fixed error if no scenes has been created yet
- *Effects* - Fixed screenspace effects not working without setting its location
- *Effects* - Fixed `.animateProperty()` not working very well with `width` and `height`
- *Effects* - Improved the way effects interacts with Foundry hooks (it is more efficient)

### Version 2.3.7
- *Effects* - Fixed `.rotateTowards()`'s `rotationOffset` parameter not working properly

### Version 2.3.6
- *Effects* - Fixed multiple `.attachTo()` and `.strechTo()` with `attach: true` sometimes causing crashes due to overloading Foundry's tick function
- *Effects* - Fixed ColorMatrix `hue` and `.animateProperty()` not working well together
- *Effects* - Fixed `.atLocation()` with `randomOffset: true` would cause weird effects with `.stretchTo()`

### Version 2.3.5
- *Sequencer* - Removed Ouija Board example macros, this is now a separate module made by md-mention2reply, check it out!
    - <https://foundryvtt.com/packages/ouija-board-for-sequencer>
- *Sequencer* - Updated module manifest to be more V10 compatible
- *Effects* - Fixed ColorMatrix `hue` property to be able to be animated with `animateProperty()` and `.loopProperty()`
- *Effects* - Fixed `.mask()` not working with tiles or measurable templates
- *Effects* - Fixed mirror and random mirror X/Y not actually flipping the effect

### Version 2.3.4
- *Animations* - Fixed `.rotateTowards()` throwing update error

### Version 2.3.3
- *Effects* - Fixed code to remove deprecation warning when both `.mask()` and `.persist()` was used
- *Effects* - Fixed rare issue where the temporary template layer would not be initialized and would cause Sequencer to error and stop working 
- *Effects* - Fixed Sequencer Effects Player deprecation warnings
- *Effects* - Added warning to console for players trying to play effects when they do not have permission to do so
  - I realize warnings is not desired in most cases, but this has been an ongoing point of support, so to preserve my own sanity, this is just how it is now.

### Version 2.3.2 (Both Foundry V9 and V10)
- *Animation* - Fixed `.rotateTowards()` throwing errors
- *Effects* - Fixed `.loopProperty()` with property `scale` would incorrectly scale effect

### Version 2.3.1
- *Effects* - Fixed `.from()` and `.mask()` throwing errors about missing files

### Version 2.3.0 (V10 only)
- *Sequencer* - Added Spanish localization (thanks to Git-GoR!)
- *Effects* - Re-enabled `scale.x` and `scale.y` on `.animateProperty()` and `.loopProperty()` 
- *Effects* - Deprecated `.belowTokens()` and `.belowTiles()` in favor of `.elevation()` due to fundamental changes in Foundry's V10 update. These methods will be removed in a future update
- *Effects* - Fully removed deprecated methods: `.addPostOverride()`, `.reachTowards()`, `.gridSize()`, `.startPoint()`, `.endPoint()`

### Version 2.2.4
- *Effects* - Fixed `.rotateTowards()`'s `rotationOffset` parameter not working properly
- 
### Version 2.2.3
- Re-released 2.2.2, git pulled a fast one and the changes in that version never got out

### Version 2.2.2
- *Animation* - Fixed `.rotateTowards()` throwing errors (again)
- *Effects* - Fixed `.atLocation()` with `randomOffset: true` would cause weird effects with `.stretchTo()`
- *Effects* - Fixed error that would sometimes pop up during startup if the template layer has not been initialized

### Version 2.2.1
- *Animation* - Fixed `.rotateTowards()` throwing errors
- *Effects* - Fixed `.loopProperty()` with property `scale` would incorrectly scale effect
- 
### Version 2.2.0 (last V9 update, except maybe some bug fixes)
**Additions:**
- *Effects* - Added `.tieToDocuments()` which allows you to tie an effect to Foundry documents - such as Active Effects or Tokens. When these are deleted, the effect is automatically ended.
- *Effects* - Added secondary `offset` parameter to `.atLocation()`, `.attachTo()`, `.rotateTowards()`, `.from()`, and `.stretchTo()` which can be used to offset the location of the source or target
  - Note: This means that `.offset()` is becoming deprecated - it will remain for a few versions with a silent warning
- *Effects* - Added `.spriteScale()` which can be used to scale the sprite of the effect separately from `.scale()`

**Tweaks:**
- *Animations* - Renamed `.rotateTowards()`'s secondary parameter's `offset` property to be more accurately named `rotationOffset`
- *Effects* - Upgraded `.animateProperty()` and `.loopProperty()` to be additive, which means two animations can now target the same property on the same effect
- *Effects* - Renamed `.rotateTowards()`'s secondary parameter's `offset` property to be more accurately named `rotationOffset`

**Fixes:**
- *Sequencer* - Fixed issue where copying the file path of a Database entry that has multiple ranges would always copy the file path for the middle-most range
- *Sequencer* - Rewrote the database traversal method to be more robust and carry metadata down to lower children
- *Effects* - Fixed long-running issue with lag and performance impact from Sequencer on some computers - the cause was the `.screenSpace()` layers, which have now been reworked. A setting to disable the Above UI Screenspace effects layer has been added to further support impacted individuals.
- *Effects* - Fixed `randomOffset` secondary option on `.attachTo()` not working
- *Effects* - Fixed `.scaleToObject()` and `.scale()` not playing nicely together
- *Effects* - Fixed loop markers not properly working

### Version 2.1.14
- *Sequencer* - Removed PIXI fix for Foundry .webm tiles to apply premultiplied alpha, native Foundry behavior is now active
- *Effects* - Fixed fatal canvas errors when `persistTokenPrototype` was active and masked to the target of the effect
- *Effects* - Added warning when using `persistTokenPrototype` with masks _other_ than masks applied to the source target
- *Effects* - Added support for `.file()` to override `.from()`'s file while keeping the other settings intact
- *Effects* - Improved robustness of placeable object document retrieval

### Version 2.1.13
- *Sequencer* - Removed stray `console.log`
- *Sequencer* - Fixed Ouija board macro error, slightly improved effect positioning
- *Effects* - Added `.spriteRotation()` which allows you set the rotation of the effect in place - this differs from `.rotate()` in the sense that this is applied only locally to the sprite, after any other offsets or transformations

### Version 2.1.12
- *Effects* - Fixed `.strechTo()` with parameter `attachTo: true` resulting in no stretching

### Version 2.1.11
- *Effects* - Fixed effects attached to temporary templates causing errors in core Foundry code
- *Effects* - Effects attached to temporary objects (like warpgate cursors) are now propagated to other clients (call `.locally()` to make it only appear for the creator)

### Version 2.1.10
- *Sequencer* - Fixed Sequencer Effect Manager not accepting Foundry documents as object references when filtering for effects
- *Sequencer* - Fixed Sequencer Effect Player showing private database entries
- *Effects* - Fixed attached effects not showing up for non-GMs

### Version 2.1.9 
- *Sequencer* - Unlocked keybinds so that users may configure their own keybinds for Sequencer's layers
- *Sequencer* - Added support for `minDelay` and `maxDelay` on `.waitUntilFinished()`, so you can now have a random wait delay between sections
- *Effects* - Added `fromEnd` to `.animateProperty()` which causes the animation to play at the end of the effect's duration
- *Effects* - Added `gridUnits` support to `.animateProperty()` and `.loopProperty()` when using `position.x` or `position.y` as the animated target
- *Effects* - Added `gridUnits` as a secondary option to both `.offset()` and `.spriteOffset()`
- *Effects* - Fixed persistent prototype token effects not applying on every instance of its token
- *Effects* - Fixed `.playbackRate()` only adjusting effect duration, and not the actual playback rate

### Version 2.1.8
- *Sequencer* - Added setting to allow clients to disable Sequencer's PIXI alpha fix for base textures

### Version 2.1.7
- *Effects* - Fixed string normalization

### Version 2.1.6
- *Sequencer* - Updated compendium of Sequencer macro samples
- *Effects* - Fixed finding effects by name with accents in them silently failing
- *Effects* - Fixed `.attachTo()` not following the target's rotation

### Version 2.1.5
- *Effects* - Fixed switching scenes would sometimes break effects

### Version 2.1.4
- *Effects* - Fixed issue with hovering over persistent effects attached to objects sometimes causing Foundry's layers to crash
- *Effects* - Fixed `.animateProperty()` and `.loopProperty()` applying grid-size ratio on animated scales

### Version 2.1.3
- *Effects* - Fixed attached effects disappearing
- *Effects* - Fixed `.randomOffset()` not randomly offsetting effects (still deprecated, see 2.1.0 release notes)

### Version 2.1.2 Hotfix
- *Effects* - Fixed effects sometimes not becoming visible

### Version 2.1.1
- *Sequencer* - Fixed canvas layer bug that caused performance issues for some users
- *Sequencer* - Fixed missing default template causing some effects to not play properly
- Added `.aboveLighting()`, which causes the effect to always be visible, regardless of sight, fog of war, or walls.
  - Note that if an effect is attached to an object via `.attachTo()`, you may need to disable `bindVisibilty` if the object is hidden
- *Effects* - Fixed `.from()`, it now uses the object's image when the effect plays, rather than when the Sequence was first created
- *Effects* - Fixed highlight box when hovering over effects in the Effect Manager UI not taking effect rotation into account
- *Effects* - Fixed effects sometimes not fully following its attached object 

### Version 2.1.0
**Additions:**
- *Sequencer* - Added support for the Effect Manager to be able to manipulate effects on other scenes, which means you can now end effects on other scenes than the one you're on via the API
- *Sequencer* - Added secondary options parameter to `Sequencer.Database.getEntry`, where `softFail: true` will cause the method to not throw errors when an entry was not found. 
- *Sequencer* - Added `Sequencer.EffectManager.getEffectPositionByName` which will allow you retrieve an effect's position by name, in real time
- *Effects* - Added `.mask()`, which can now clip-mask effects to only show them within tokens, templates, tiles, or drawings - this supports the [Walled Templates module](https://foundryvtt.com/packages/walledtemplates)!
- *Effects* - Added a secondary options parameter to `.persist()`, which can accept `persistTokenPrototype: true` to persist the effect on the token's prototype data, useful for active effect-based VFX
- *Effects* - Added vision masking - now token vision affects how much of an effect they can see
- *Effects* - Added `.xray()` which can be used to turn off vision masking on individual effects 
- *Effects* - Added support in the Sequencer Database for internal effect loops, see the [documentation for more information](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database#Internal-loops)
- *Effects* - Added `edge` option to `.attachTo()`, which can be set to `inner`, `on`, or `outer` to align the effect on the attached object's edge when used with `align` 
- *Effects* - Added `.screenSpaceAboveUI()`, which causes `.screenSpace()` effects to play above _all_ UI elements in Foundry (use with caution)
- *Effects* - Added options parameter to `.scaleToObject()`, which can be passed `uniform: true` to cause the scaling to always be uniform (it picks the largest dimension of the object)
- *Macros* - Added the ability to reference compendiums when creating `.macro()`s in sequences

**Fixes:**
- *Sequencer* - As `SequencerDatabase` was deprecated in 2.0.0 in favor of `Sequencer.Database`, the former has now been removed
- *Sequencer* - Adjusted Database methods with more validation so that searching with empty strings won't throw hard to read errors
- *Sequencer* - Removed bogus Effect Player warning about permissions that no longer reflects what Sequencer does
- *Sequencer* - Fixed some issues when copying and playing effects through the Database Viewer
- *Effects* - Fixed effects being invisible to players if the effect was created out of sight (thanks @dev7355608!)
- *Effects* - Fixed `align` on `.attachTo()` not working as expected when an effect's scale or size was set
- *Effects* - Fixed blur filter not taking given properties into account
- *Effects* - The following functions now have loud deprecation warnings:
    - `.addPostOverride()`
    - `.reachTowards()`
    - `.gridSize()`
    - `.startPoint()`
    - `.endPoint()`
- *Effects* - Deprecated `.randomOffset()` in favor of adding `randomOffset` as a secondary argument on `.atLocation()`, `.stretchTo()`, `.rotateTowards()`, and `.attachTo()`

### Version 2.0.16
- *Sequencer* - Added japanese localization (thanks to the illustrious Brother Sharp#6921!)

### Version 2.0.15
- *Effects* - Fixed errors relating to tiling textures
- *Effects* - Fixed drifting effect animations when FPS dropped
- *Effects* - Improved performance relating to always updating the position of the sprites, even when attached objects weren't moving
- *Effects* - Hopefully fixed some memory leaks relating to assets not being deleted properly 
- *Effects* - Fixed attached effects' rotations being funky
- *Effects* - Fixed effects attached to temporary objects (such as the warpgate crosshair) would not be properly removed from the effect manager 

### Version 2.0.14
- *Database* - Fixed the database sometimes getting confused by paths that have `ft` in them without being range-finding
- *Effects* - Fixed double-attached effects sometimes resulting in the sprite freezing (or in rare cases, browser crashes), though this type of effect is still expensive!
- *Effects* - Fixed `rotateTowards` with `attachTo` enabled not respecting actual target position end position
- *Effects* - Fixed `.rotation()` with `.loopProperty()` on the `spriteContainer`'s `rotation` causing rotational strangeness
- *Effects* - Fixed `.repeat()` with partial database path not picking random images for each repetition
- *Sounds* - Fixed error when playing sounds

### Version 2.0.13
- *Effects* - Fixed flipped tiles and measurable templates (with negative width or height) causing effects to not play on the correct location
- *Effects* - Fixed `.rotateTowards()` not following the rotation of attached objects
- *Sounds* - Fixed `.fadeInAudio()` and `.fadeOutAudio()` being broken

### Version 2.0.12
- *Effects* - Fixed effects with only `.text()` and no `.file()` not working properly
- *Effects* - Fixed `.text()` combined with `.screenSpace()` would not be scaled properly 

### Version 2.0.11
- *Effects* - Fixed `.extraEndDuration()` not working properly when `.waitUntilFinished()` was provided a negative number
- *Effects* - Fixed `.noLoop()` effects sometimes not reaching their proper end time when `.endTime()`, `.endTimePerc()` or `.timeRange()` was used

### Version 2.0.10
- *Sequencer* - Fixed error in `Database.validateEntries()`
- *Sequencer* - Updated `pre` hooks to cancel the action if any function return `false`
- *Sequencer* - Updated Rope and Chain macros in compendium
- *Effects* - Added `.tilingTexture()` - this will replace the `tiling` parameter on `.stretchTo()` in the long term
- *Effects* - Deleting the object an effect is attached to will now actually trigger the effect's `.fadeOut()`, `.scaleOut()` etc

### Version 2.0.9 Hotfix
- *Effects* - Fixed nasty issue with rotation on effects
- *Effects* - Made all effects have an assumed internal grid size of 100

### Version 2.0.8
- *Sequencer* - Added rope and chain sample macros to the Sequencer macro compendium
- *Sequencer* - Removed non-functional Chain Lightning macro from macro collection
- *Sequencer* - Added warnings to Preloader when it is given invalid parameters
- *Effects* - Added `tiling` as an option to `.stretchTo()`
- *Effects* - Fixed `.randomRotation()` not working with `.attachTo()`
- *Effects* - Fixed issue with effects with a defined width and height were still being scaled by the scene-effect grid size difference

### Version 2.0.7
- *Sequencer* - Fixed broken macro in the Ouija example
- *Animations* - Fixed various animation methods not resulting accurate movement or teleportation
- *Effects* - Fixed `.randomRotation()` not working

### Version 2.0.6
- *Sequencer* - Improved intelligence of webm cache 
- *Effects* - Added `.private()` method to hide effects in the effect manager - DO NOT USE IF YOU DO NOT KNOW WHAT YOU ARE DOING
- *Effects* - Fixed issue where ending effects by name would cause other effects without a name to get _ended
- *Effects* - Fixed issue where filtering for effects with the Effect Manager would cause it to split the given name on each whitespace 

### Version 2.0.5 Hotfix Hotfix
- *Effects* - Hotfix for the hotfix. It's just hotfixes all the way down, man.

### Version 2.0.4 Hotfix
- *Effects* - Fixed some modules causing Sequencer to complain 
- *Effects* - Actually fixed copying objects would not copy the effects on it

### Version 2.0.3
- *Effects* - Fixed some issues regarding file paths on ForgeVTT, though they did most of the legwork on their side
- *Effects* - Fixed issue where `.scaleToObject()` would fail to scale to the object properly
- *Effects* - Fixed Effect Manager not finding effects to end when it was only provided an object
- *Effects* - Fixed copying tokens and other objects with ongoing effects would not properly play it for everyone
- *Effects* - Fixed screenspace effects would sometimes not play properly 

### Version 2.0.2
- *Sequencer* - Fixed the preloader throwing error about recursion
- *Effects* - Fixed rotational animations not working properly
- *Effects* - Fixed the update interface not allowing attribute paths like core Foundry does
- *Effects* - Fixed effects lingering for other users after their attached objects were deleted
- *Effects* - Fixed issues with using `.from()` on tiles

### Version 2.0.1
- *Sequencer* - Fixed preloader throwing error about missing functions
- *Sequencer* - Fixed Effect Manager complaining if trying to filter effects by name while some effects didn't have a valid name
- *Effects* - Added the ability to use Effects as elements to play other Effects on
- *Effects* - Added cache-busting for when the Sequencer .webm cache would get larger than 1GB
- *Effects* - Fixed persistent effects attached to WarpGate crosshairs throwing errors
- *Effects* - Fixed `cacheLocation` throwing errors regarding missing function
- *Effects* - Fixed `endedSequencerEffect` being called too late for users to be able to use its parameters
- *Effects* - Fixed error when deleting the object an effect was attached to through both `.attachTo()` and `.stretchTo()` 

### Version 2.0.0
**Breaking changes:**
- *Sequencer* - Sequencer now requires the `socketlib` module
- *Sequencer* - All existing persistent effects created using 1.X.X Sequencer will be updated to the 2.0.0 system, but it's nigh impossible to catch all the edge cases, so please report any strangeness!
- *Effects* - Removed support for audio methods on effects (hardly used and caused a whole host of problems)
- *Effects* - Deprecated `.reachTowards()` and renamed it to `.stretchTo()`. The deprecated method will be removed in 2.1.0.
- *Effects* - Deprecated `.addPostOverride()`, please use `.addOverride()` instead. The deprecated method will be removed in 2.1.0.
- *Effects* - Deprecated `.gridSize()`, `.startPoint()`, and `.endPoint()` in favor for `.template({ gridSize, startPoint, endPoint })`. The deprecated methods will be removed in 2.1.0.
- *Effects* - Removed deprecated method `.JB2A()`

**Tweaks:**
- *Sounds & Effects* - Tweaked `.forUsers()` to also accept player names (case-sensitive) instead of just IDs
- *Effects* - Tweaked attached effects' layer handling - effects can now be attached but exist below _all_ Tokens, for example
- *Effects* - Tweaked `.filter()` to allow being called multiple times, which now layers the filters in the order they were created

**Additions:**
- *Sequencer* - Added selection tool to the Effect Layer - select, move, reattach, and delete effects on the canvas!
- *Sequencer* - Added `updateEffects` to the Effect Manager's API
- *Sequencer* - Added `updateSequencerEffect` hook
- *Sequencer* - Added support to `.macro()`s to be able to supply additional arguments (requires the Advanced Macros module)
- *Sequencer* - Added wildcard support when filtering for named effects in the Effect Manager's API (such as `getEffects`, `endEffects`, etc)
- *Sequencer* - Added support to filter for `source` and `target` in the Effect Manager's API (such as `getEffects`, `endEffects`, etc)
- *Sequencer* - Added "private" boolean flag to `Sequencer.Database.registerEntries()` which causes the entries to not be visible in the Database Viewer and Effect Player
- *Sequencer* - Added Setting to be able to hide Sequencer's tools on the toolbar
- *Sequencer* - Added checkbox to Database Viewer to show all ranges of a single effect, which is by default set to false
- *Sequencer* - Added `Sequencer.Helpers`, a library of useful methods - check them out on the wiki: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Helper-Functions
- *Animations* - Added `.hide()` and `.show()` to hide or show the animated object
- *Effects* - Added more secondary options parameters to `.stretchTo()`, which accepts:
    - At long last, this can now `attachTo` (boolean) to the given target. Combine with `.attachTo()` to link an effect between two tokens!
    - `onlyX` (boolean), if set to true, this will cause stretchTo to only stretch the X axis of the sprite towards the target (keeping Y at 1.0, or your given scale)
- *Effects* - Added support to `.file()` for an object map containing the feet range and filepath key-value pair. Check out the file wiki entry to understand what this means: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#file
- *Effects* - Added secondary options parameter to `.attachTo()`, which accepts:
    - `align` (string, default "center"), accepts `top-left`, `center`, `left`, `bottom-right`, etc. Read the wiki: https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#attach-to
    - `bindVisibility` (boolean, default true), if set to false, the effect will not be hidden if the attached object is hidden
    - `bindAlpha` (boolean, default true), if set to false, the effect's alpha will be independent of the attached object
    - `followRotation` (boolean, default true), if set to false, the effect will not follow the rotation of the attached object
- *Effects* - Added options to `.size()` which allows for `{ gridUnits: true }` - this makes the size given to the method scale to the scene's grid, instead of setting the exact width and height
- *Effects* - Added the same option as above to `.animateProperty()` and `.loopProperty()`, which only works if you animate the `width` or `height`

**Fixes:**
- *Sequencer* - Fixed module permissions settings being slightly wonky
- *Sequencer* - Fixed number inputs not throwing errors on `NaN` values
- *Animations* - Fixed users not being able to teleport or move tokens they do not own
- *Animations* - Fixed `.moveSpeed()` not affecting the duration of the animation
- *Animations* - Fixed `.delay()` not being respected
- *Effects* - Fixed memory leak where effect textures were not properly destroyed
- *Effects* - Adjusted `.origin()` to be able to accept a `Document` object to infer the UUID from
- *Effects* - Fixed `.from()` not taking mirror x/y into account on tokens
- *Effects* - Tokens with effects attached to them can now be _ended by anyone who can update the token (owners of the token, GMs, etc)
- *Effects* - Increased default resolution of `.text()` to 10 (should increase quality)
- *Effects* - Fixed `.screenSpace()` effects still being affected by grid size normalization

### Version 1.3.5
- *Sequencer* - Fixed Permissions being broken in the latest Foundry update, and moved Sequencer specific permissions into module settings instead
- *Effects* - <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> Breaking change <img src="images/siren.gif" width="18px" height="18px" alt="Siren"> - Fixed issue where setting the `.size()` of an effect and then scaling it would result in unexpected behavior. As a result, `.scaleIn()` and `.scaleOut()` now function as _multipliers_ to the existing scale on the effect

### Version 1.3.4
- *Sequencer* - Added popup warning the first time a GM opens the Effect Player to tell them about the custom Permissions
- *Sequencer* - Added button to open Foundry's Permissions directly from the Effect Player how-to page

### Version 1.3.3
- *Sounds* - Fixed `.fadeInAudio()` and `.fadeOutAudio()` being broken

### Version 1.3.2
- *Sequencer* - Minor backend updates to flag handling
- *Effects* - Fixed static images failing to load in v9
- *Effects* - Fixed effects attached to tokens that were copied to another scene would not play
- *Effects* - Suppressed recent deprecation warnings until the next release
- *Effects* - Reverted some code that would break persisting effects

### Version 1.3.1
- *Sequencer* - Fixed minor spelling issue

### Version 1.3.0
- *Sequencer* - Sequencer is now v9 ready!
- *Sequencer* - Improved search accuracy functionality on the Effect Player
- *Animations* - Added `relativeToCenter` option to `.teleportTo()` and `.moveTowards()`, which will offset the location relative to the object's center, effectively centering the animated object on the location - use with `.snapToGrid()` for reliable snapping!
- *Animations* - Fixed `.fadeOut()`, `.fadeOutAudio()`, and `.rotateOut()` not correctly setting the duration of the animation, causing `.waitUntilFinished()` to not actually wait for the animation to finish
- *Effects* - Deprecated `.JB2A()` as the recommended workflow is now to use Database paths

### Version 1.2.12 Hotfix
- *Effects* - Fixed `.animateProperty()` and `.loopProperty()` applying animations that were already complete

### Version 1.2.11
- *Sequencer* - Added French localization (thanks to Elfenduil)
- *Sequencer* - Fixed error with `Sequencer.Database.validateEntries()` throwing an error
- *Effects* - Improved handling of the `Glow` filter when used with `.fadeIn()` and `.fadeOut()`
    - Due to this change, it is now recommended that if you use `.animateProperty()` or `.loopProperty()` on the `sprite`'s `alpha` property to instead use it on the `alphaFilter`'s `alpha` property
- *Macros* - Updated the Misty Step macro to be more generic and not specifically _require_ MidiQOL

### Version 1.2.10
- *Sequencer* - Fixed misspelled permission which caused players to not be able to see the toolbar buttons
- *Sequencer* - Added `End All Effects` button to the Effect Manager

### Version 1.2.9
- *Sequencer* - Removed error from the Effect Manager when no effects were removed
- *Effects* - Fixed `.randomOffset()` on tiles would result in pretty crazy behavior

### Version 1.2.8
- *Sequencer* - Added sidebar tool permissions, you can now hide them from players
- *Effects* - Added `.origin()` which provides a way to tag an effect with a string you can then search for with the Effect Manager
- *Effects* - Added support for using both `.reachTowards()` and `.scale()` and will now scale the effect whilst keeping the range finding correct

### Version 1.2.7 Hotfix
- *Sounds* - ACTUALLY Fixed sounds being broken

### Version 1.2.6 Hotfix
- *Sounds* - Fixed sounds being broken

### Version 1.2.5
- *Sequencer* - Made hooks `createSequencerEffect` and `endedSequencerEffect` instead supply the CanvasEffect itself, rather than its data
- *Effects* - Fixed bug that caused effects to linger for other clients after having been _ended

### Version 1.2.4
- *Sequencer* - Fixed error caused by preload option on Sequencer Effect Player
- *Sequencer* - Fixed error when pressing ESC in the Sequencer Layer
- *Sequencer* - Fixed permissions not being loaded properly
- *Effects & Animations* - Added `.tint()` which allows you to tint effects, tokens, and tiles

### Version 1.2.3
- *Sequencer* - Added granular permissions - check it out in Configure Settings -> Open Permissions Configuration
- *Sequencer* - Added localization support
- *Sequencer* - Fixed the Sequencer Player throwing an error if the layer was active while switching scene

### Version 1.2.2
- *Sequencer* - Added Stretch or Move checkbox to Sequencer Player
- *Sequencer* - Added Move Speed input to Sequencer Player

### Version 1.2.1
- *Sequencer* - Fixed file picker being broken

### Version 1.2.0
- *Sequencer* - Added the [Sequencer Effect Player](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Player)!
- *Sequencer* - Refactored the Sequencer Animation Engine, which fixes some animation funkiness
- *Sequencer* - Fixed the Sequencer Preloader sometimes not succeeding and getting stuck
- *Animations* - Removed the `.snapToSquare()` method, use `.snapToGrid()` instead
- *Effects* - Added `.spriteOffset()` which allows you to add an offset to the effect's sprite's location
- *Effects* - Added optional boolean parameters to `.randomizeMirrorX()` and `.randomizeMirrorY()`

### Version 1.1.5
- *Effects* - Fixed bug that caused all effects to stay transparent after playing an effect for specific user
- *Effects* - Fixed bug with `.missed()` and `.reachTowards()` failing to play any effect
- *Effects* - Fixed all effects sharing users

### Version 1.1.4
- *Sequencer* - Fixed error in the Sequencer Preloader when pre-loading files from Database paths
- *Effects* - Fixed bug that caused persistent effects to end when a client connected after it was created

### Version 1.1.3
- *Sequencer* - Added `sequencerEffectManagerReady` hook which is called when every effect has been set up on the scene that's currently loaded
- *Sequencer* - Added `validateEntries` method to the Sequencer Database, which is helpful for module creators to validate their asset collections to the database
- *Sequencer* - Added `getPathsUnder` method to the Sequencer Database, which retrieves valid collections under a certain database path
- *Sequencer* - Minor speed improvements to how the database retrieves files
- *Sequencer* - Removed the requirement for a user to be trusted to use the Database Viewer
- *Sequencer* - Fixed `Sequencer.EffectManager.endEffects` not throwing error when incorrect or incomplete parameters were given, and instead _ended all effects (whoops)
- *Effects* - Made user-created effects that were made to be displayed only for other users also show up for GMs, though saturated and with 50% opacity. This is to ensure no player-to-player abuse would occur
- *Effects* - Fixed scaled tokens causing effects to not play on the correct location
- *Effects* - Fixed temporary effects attached to warpgate cursors no longer stays around for longer than they should

### Version 1.1.2
- *Sequencer* - Removed compatibility warning regarding Perfect Vision as the module was updated to support Sequencer
- *Sequencer* - Added warning when trying to register database collections under a module name containing dots (as it uses dot-notated paths)

### Version 1.1.1
- *Sequencer* - Removed Hyperspace sample from compendiums, as it was getting too big
- *Sequencer* - Added compatibility warning if user has Perfect Vision installed
- *Sequencer* - Added warning for Hyperspace assets that are going to be removed in a future update, and instead put into a separate module:
    - https://foundryvtt.com/packages/nrsap by Nachtrose#9287 on Discord
- *Sequencer* - Prepared Sequencer for v9, it _should_ be compatible to test
- *Effects* - Added `.text()` which allows you to create text snippets on the canvas
- *Effects* - Added `.from()` which creates an effect based on the given object, effectively copying the object as an effect
- *Effects* - Added support for `.attachTo()` for temporary measured templates before they have been created, for use with WarpGate
- *Effects* - Removed warning when `.attachTo()` and `.atLocation()` are used on the same effect - `.attachTo()` always wins out

### Version 1.1.0
- *Sequencer* - Added hooks:
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
- *Sequencer* - Hook for `sequencer.ready` is becoming deprecated in favor for `sequencerReady`
- *Sequencer* - Vastly improved the speed of the Database Viewer (thanks to Naito#1235 on discord!)
- *Effects* - Added screen space layer for UI effects!
    - Added `.screenSpace()` which causes the effect to be played on the screen rather than in the game canvas
    - Added `.screenSpaceAnchor()` which causes the effect to anchor itself to a side on the screen space layer
    - Added `.screenSpacePosition()`, pretty straightforward what this does, sets the position of the effect in screen space
    - Added `.screenSpaceScale()` which can help you stretch and fit the effect to the screen, even on different screen sizes
- *Effects* - Added `.spriteAnchor()` which controls the effect's core anchor point within its container (defaults to 0.5 on X and Y)
- *Effects* - Added support on `.atLocation()` for a secondary options object, which currently accepts:
    - `cacheLocation: boolean` - causes the given object's location to be cached immediately rather than retrieved during the Sequence's runtime
- *Effects* - Added `.snapToGrid()` which snaps the effect to the given location's closest grid section
- *Effects* - Added `.scaleToObject()` which scales the effect to the bounds of the object, with an optional scalar on top of that
- *Effects* - Added `.zeroSpriteRotation()` which causes an effect's sprite to remain un-rotated when its container rotates in animations
- *Effects* - Tweaked `.size()` to also accept only one of height or width, the other will be automatically resized to keep the effect's ratio
- *Effects* - Fixed `.persist()`ing effects with an end duration that doesn't loop would not properly stop at its end duration
- *Effects* - Improved look of transparent .webm files
- *Animations* - Renamed `.snapToSquare()` method to `.snapToGrid()` - the old method will be fully removed in 1.2.0
- *Foundry* - Added libwrapper patch for .webm transparency not playing correctly in Foundry
- *Sequencer* - Updated some sample macros
- *Sequencer* - The `SequencerDatabase` accessor has been removed, and is now accessible with `Sequencer.Database`
- *Sequencer* - The `SequencerDatabaseViewer` accessor has been removed, and is now accessible with `Sequencer.DatabaseViewer`
- *Sequencer* - The `SequencerPreloader` accessor is deprecated, and is now accessible with `Sequencer.Preloader`

### Version 1.0.3
- *Sequencer* - Added animated space backgrounds (thanks to Keirsti on the Foundry VTT discord server)
- *Sequencer* - Fixed Hyperspace macro placing the hyperspace intro and out incorrectly

### Version 1.0.2 Hotfix
- *Sequencer* - Changed Effect Viewer icon to something less controversial

### Version 1.0.1
- *Sequencer* - Renamed `.sequence()` method on Sequences to `.addSequence()` due to internal code conflicts
- *Effects* - Added `.filter()` - was technically added in 1.0.0, but was left undocumented
- *Effects* - Fixed `.size()` being scaled to account for grid size differences - it should now set the exact width/height in pixels

### Version 1.0.0
- *Sequencer* - Added recent Sequencer tools to the menu in the top left - you can disable these in the module settings
- *Sequencer* - Added `Sequencer.EffectManager` to manage persistent effects - [read more here](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Effect-Manager)
- *Sequencer* - Added the ability for you to implement your own Sequencer functions - [read more here](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Section-Manager)
- *Sequencer* - `SequencerDatabase` is deprecated, and is now accessible with `Sequencer.Database` - 1.1.0 will remove the old path entirely
- *Sequencer* - `SequencerDatabaseViewer` is deprecated, and is now accessible with `Sequencer.DatabaseViewer` - 1.1.0 will remove the old path entirely
- *Sequencer* - `SequencerPreloader` is deprecated, and is now accessible with `Sequencer.Preloader` - 1.1.0 will remove the old path entirely
- *Sequencer* - Fixed Documents sometimes not properly resolving to their PlaceableObject
- *Sequencer* - Fixed settings not being client side - whoops
- *Effects* - Added `.attachTo()` which causes the effect to be attached to a given object
- *Effects* - Added `.persist()` which causes the effect to become permanent on the canvas until removed
- *Effects* - Added `.extraEndDuration()` which allows `.persist()`-ed effects to stick around for a bit longer instead of end immediately
- *Effects* - Tweaked `.missed()` to hit an area only facing the origin of the effect, if it had an origin and target
- *Effects & Sounds* - Added support for wildcard paths, like `modules/jb2a_patreon/Library/1st_Level/Bardic_Inspiration/BardicInspiration_01_*_400x400.webm`

### Version 0.6.12
- *Sequencer* - Fixed an issue where the preloader would sometimes fail to preload
- *Effects* - Fixed effects not playing on hex grids

### Version 0.6.11 Hotfix
- *Effects* - Fixed range-finding effects sometimes not picking the right distance

### Version 0.6.10
- *Sequencer* - Improved the search speed of the Database Viewer
- *Sequencer* - Fixed previewing static images through the Database Viewer
- *Sequencer* - Fixed bugs that caused the Database to sometimes fail registering new files
- *Effects* - Fixed issue where `.delay()` would incorrectly contribute towards the effect's `.waitUntilFinished()` duration

### Version 0.6.9 Hotfix
- *Sequencer* - Fixed the database sometimes failing to get the correct file

### Version 0.6.8 Hotfix
- *Sequencer* - Fixed database not correctly finding range-based effects

### Version 0.6.7
- *Effects & Sounds* - Fixed `.locally()` and `.forUsers()` sometimes erroneously remembering users between different effects & sounds
- *Effects* - Fixed `.scaleIn()` would not take a custom `.size()` into account
- *Effects* - Fixed static images sometimes not playing due to duration being set to 0ms

### Version 0.6.6
- *Sequencer* - Added support for preloading files based on database paths
- *Effects & Sounds* - Added `.locally()` and `.forUsers()`, which allow you to control which users will have the effect and sounds played for them
- *Effects* - Improved positional handling of Tiles and TileDocuments

### Version 0.6.5
- *Sequencer* - Updated Sequencer Database Viewer layout to be more user friendly
- *Effects* - Fixed bug with templates and raw positions not being respected

### Version 0.6.4
- *Sequencer* - Added Sequencer Database Viewer to the module settings, it allows you to preview effects and copy any files registered with Sequencer by other modules
- *Sequencer* - Added client-side settings for users to be able to turn off effects and sounds being played locally
- *Effects & Sounds* - Fixed effects and sounds playing on scenes they did not originate from
- *Effects* - Added `.size()`, which sets the width and height of the effect in pixels
- *Effects* - Added `rotate` option to `.moveTowards()`, which defaults to true. If set to false, the effect will not rotate towards the end location.
- *Effects* - Fixed duration of effects using `.moveTowards()` not being calculated correctly
- *Effects* - Fixed static image effects' durations also not being calculated correctly

### Version 0.6.3 Hotfix
- *Effects* - Fixed effects failing to play static images

### Version 0.6.2
- *Sequencer* - Further small fixes to how the database registers files

### Version 0.6.1
- *Sequencer* - Removed the need for `.playIf()` to have to be given a function or a boolean
- *Sequencer* - Fixed issues with the database when files were listed in arrays

### Version 0.6.0
**Breaking:**
- *Effects* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.JB2A()` has been altered to set the gridsize to 200, as it was previously set to 100 - this will halve the size all JB2A on-the-spot effects, sorry! <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

**Additions:**
- *Sequencer* - Added `SequencerPreloader` - you can now preload images, effects, and sounds for your players, read more on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Preloader)
- *Sequencer* - Added support for templates and time ranges in database structure, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/How-to:-Sequencer-Database)
- *Effects* - Added support for static images such as webp, pngs, jpgs, etc
- *Effects & Sounds* - Added `.startTime()`, `.startTimePerc()`, `.endTime()`, `.endTimePerc()`, and `.timeRange()`, more info on the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#start-time)
- *Sounds* - Added `.addOverride()`, `.baseFolder()`, and `.setMustache()` support to sounds

**Updates & Fixes:**
- *Sequencer* - `.play()` now reliably resolves its promise at the end of the entire sequence
- *Effects* - *Vastly* improved effect caching and loading speed of effects and sounds
- *Effects* - Improved object position handling slightly when providing non-foundry class objects to `.atLocation()` and alike
- *Effects* - Generally improved compatibility with `TokenDocument` and Foundry D&D 5E documents when getting their positions

### Version 0.5.9
- *Effects* - Added `.addPostOverride()` as an alternative to `.addOverride()`, which executes at the end of the effect data sanitation
- *Effects* - Fixed `.gridSize()`, `.startPoint()`, and `.endPoint()` not being respected and being overridden by internal logic

### Version 0.5.8 Hotfix
- *Macros* - Fixed macros throwing error when playing sequence

### Version 0.5.7
- *Effects* - Fixed templates sometimes not being found
- *Effects* - Re-added backwards compatibility with old macros that still use `data.distance` in overrides

### Version 0.5.6
- *Sequencer* - Added alpha version of the Sequencer Database Viewer
- *Effects* - Added `.randomOffset()` which can add a random offset similar to `.missed()`, but *within* the bounds of the target token / tile / other. Check out the docs!
- *Effects* - Fixed `.waitUntilFinished()` not being respected
- *Effects* - Fixed `.offset()` throwing an error about a missing function
- *Effects* - Fixed `.repeats()` throwing an error, because the entire function went missing in the last update >.>

### Version 0.5.5 Hotfix
- *Effects* - Fixed effects sometimes not playing

### Version 0.5.4 Hotfix
- *Effects* - Fixed melee attacks not picking the right JB2A template

### Version 0.5.3
- *Sequencer* - Added sound to the Hyperspeed Sample thanks to the wonderful AurelTristen over at [HellScape Tabletop Assets](https://www.patreon.com/HellScapeAssets) (even though they're not specifically focused on sound effects)
- *Effects* - Fixed major issue with JB2A templates, causing effects to pick the wrong ranged attacks & other shenanigans
- *Effects* - Fixed effect scale inconsistencies across scenes with different grid sizes

### Version 0.5.2
- *Sequencer* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for Foundry Version 0.7.x <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Refactored animations into a dedicated animation engine
- *Effects* - Added support for static image effects (.jpeg, .png, etc)
- *Effects* - Fixed grid size sometimes not being taken into account when playing effects with `.reachTowards()`
- *Sounds* - Vastly improved and fixed sound implementation, big thanks to ghost#2000!
- *Sounds* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> Removed support for `.fadeIn()` and `.fadeOut()` in Sounds <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

### Version 0.5.1
- *Sequencer* - Added two sample scenes with macros and accompanying art:
    - An animated Oujia board made by md-mention2reply
    - A Star Wars inspired hyperspeed scene-switching scene, effects, and macro
- *Sequencer* - Removed Token Ease as dependency until we can solve its conflicts with other modules
- *Effects* - Fixed effects not auto-centering on tokens
- *Effects* - Fixed effects not finding the proper location when a previous effect's `.name()` was given
- *Animations* - Fixed `.rotate()`, `.opacity()`, and `.volume()`, now they work even without having to use their respective in/out functions

### Version 0.5.0
- *Sequencer* - Module now depends on [Token Ease](https://github.com/fantasycalendar/FoundryVTT-TokenEase)
- *Sequencer* - Added the Sequencer Database to help content creators! Read more on the [database documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Sequencer-Database) how to use it!
- *Effects & Sounds* - Added support for database collections to the `.file()` method - more info can be found in the [docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#file)
- *Animations, Effects & Sounds* - Added the following functions:
    - `.audioVolume()`
    - `.fadeInAudio()`
    - `.fadeOutAudio()`
- *Effects* - Added support for delays on these methods (e.g. a delay of -500 means it will finish 500ms before the end of the duration):
    - `.rotateOut()`
    - `.fadeOut()`
    - `.scaleOut()`
    - `.fadeOutAudio()`
- *Animations* - Fixed `.rotateTowards()` to properly rotate towards the target without having to add an offset to properly line them up
- *Effects* - Made effects more intelligent when determining locations when given partial object data with `id` collections
- *Effects* - Fixed issues surrounding delays and fades
- *Sounds* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.fadeIn()` and `.fadeOut()` will become deprecated in a future version, please switch to `.fadeInAudio()` and `.fadeOutAudio()` <img src="images/siren.gif" width="12px" height="12px" alt="Siren">

### Version 0.4.6 Hotfix
- *Effects* - Fixed effects not playing on tokens on 0.7.10 and below

### Version 0.4.5
- *Effects* - Added `.offset()` so that you can offset the effect - an optional parameter allows you to offset in local or canvas space
- *Animations* - Added `.snapToSquare()`, which causes the given object to be snapped to the square it is moving or teleported towards
- *Animations* - Fixed `.rotateIn()` and `.rotateOut()` not properly calculating rotation
- *Animations* - Adjusted `.rotateTowards()` to instead consider the target position as the rotation origin, rather than the object's current position

### Version 0.4.4
- *Animations* - Added `.animation()` section - animate tokens and tiles! Check out the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Animations) how to use it!
- *Effects* - Added official support for tiles in `.atLocation()`, `.moveTowards()`, etc
- *Effects* - Tweaked how effects get locations when dealing with raw template data
- *Sequencer* - Added `.sequence()` so you can combine multiple sequences into one
- *Sequencer* - Updated all sample macros to 0.8.x conventions

### Version 0.4.3 Minor Fixes
- *Effects* - Removed error catch in `.file()` when providing it with something else than string or array
- *Effects* - Fixed `.belowTokens()` and `.belowTiles()` throwing errors if no boolean was provided

### Version 0.4.2 Hotfix
- *Effects* - Added `.rotate()` which adds an offset to the effect's rotation
- *Effects* - Fixed `.moveTowards()` not respecting given easing

### Version 0.4.1
- *Sequencer* - <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> **Breaking Changes**: Removed deprecated `.then()` method <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Tweaked `.play()` to now return a promise
- *Sequencer* - Reworked module class structure
- *Sequencer* - Added debug setting

### Version 0.4.0
- *Sequencer* - Renamed `.then()` to `.thenDo()` due to JavaScript reasons — <img src="images/siren.gif" width="12px" height="12px" alt="Siren"> `.then()` will be removed in 0.4.1 <img src="images/siren.gif" width="12px" height="12px" alt="Siren">
- *Sequencer* - Removed the requirement to pass `true` as a second argument to `.then()` (now `.thenDo()`) if the function was async, it will now wait for it to finish if it is an `async function`
- *Effects* - Added `.mirrorX()` and `.mirrorY()` to mirror the effect on that axis
- *Effects* - Improved `.JB2A()` to better handle melee weapon attacks
- *Effects* - Tweaked `.belowTiles()` and `.belowTokens()` to accept an optional boolean parameter whether the effect should play behind the respective element
- *Effects* - Tweaked effects to assume that .webms have a base 100px internal grid for size consistency

### Version 0.3.13 Hotfix
- *Effects* - Fixed ANOTHER bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.12
- *Effects* - Added `.opacity()` which controls the alpha of the effect being played
- *Effects* - Fixed bug with `.belowTiles()` sometimes not playing below tiles

### Version 0.3.11
- *Effects* - Added `.belowTiles()` to play effects below tiles
- *Effects* - Implemented better order handling - the effects created first will always be on top, each subsequent effect will be played below the previous
- *Effects* - Added `.zIndex()` for you to have direct control over the order of effects
- *Effects & Sounds* - Added `.duration()` which can override the duration of an effect or sound
- *Effects & Sounds* - Tweaked `.waitUntilFinished()` to accept a single number parameter as a delay or to end the effect or sound earlier - read more in the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#wait-until-finished)
- *Sounds* - Added support for `.fadeIn()` and `.fadeOut()` - easing sadly doesn't work for sounds yet

### Version 0.3.10
- *Sequencer* - Added macro pack containing examples of Sequencer usages
- *Effects* - Added the following animated functions:
    - `.scaleIn()`
    - `.scaleOut()`
    - `.rotateIn()`
    - `.rotateOut()`
    - All of these can utilize any of the easings listed here: https://easings.net/
    - Read the [documentation](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki/Effects#scale-in) how to use these
- *Effects* - Added better error reporting when something goes wrong in the sequence
- *Effects* - Fixed bug with scale sometimes overriding `.reachTowards()`

### Version 0.3.9
- *Effects* - Added `.belowTokens()` so you can now play effects, well, below tokens
- *Effects* - Fixed effects not replicating properly (AGAIN)
- *Effects* - Fixed effects not being able to use `.name()`d effects if they didn't miss - now any effect can be named and be used in future effects

### Version 0.3.8 Hotfix
- *Effects* - Fixed effects that were supposed to be once-off instead looping

### Version 0.3.7
- *Effects* - Added `.moveTowards()` and `.moveSpeed()` for missile-like behavior
- *Effects* - Tweaked the way the effects layer is applied to the canvas' layers
- *Effects* - Fixed major issue with the way effects that were using `.missed()` and `.name()` were cached
- *Sequencer* - Removed stray debug code

### Version 0.3.6
- *Effects* - Added `.fadeIn()` and `.fadeOut()` - you can now make your effects look slightly nicer!
- *Effects* - Added support for cone and line templates with `.reachTowards()` and `.rotateTowards()` - it now reaches towards the end point of the template
- *Effects* - Added `.name()` to effects - this will cause the effect's position to be stored and can then be used with `.atLocation()`, `.reachTowards()`, and `.rotateTowards()` to refer to previous effects' locations
    - Example: naming an impact effect with `.name("hit_location")` and making it miss with `.missed()`, and then have a subsequent effect use `.rotateTowards("hit_location")` to rotate towards the previous effect's calculated location
- *Effects* - Fixed `.scale()` bug that caused it to not properly set the scale and then cause an error upon calling `.play()`
- *Effects* - Removed `.moves()` for future implementation
- *Sequencer* - Tweaked `.async()` and `.waitUntilFinished()` handling
    - They now act the same on effect and sounds that only play once, but if it `.repeats()`, `.async()` causes the effect or sound to wait between each repetition, `.waitUntilFinished()` causes the sequencer to wait until the effect or sound has finished executing all of its repetitions, which may or may not wait for each effect or sound to play with `.async()`
- *Sequencer* - Calling `.play()` now returns the sequence
- *Sequencer* - Removed `FXMaster` dependency and implemented a custom canvas layer and effects class

### Version 0.3.5 Hotfix
- *Sequencer* - Fixed `.wait()` breaking due to the `.async()` and `.waitUntilFinished()` swap

### Version 0.3.4 Hotfix
- *Effects* - Fixed issue that caused the wrong scale to be applied when using `.reachTowards()`

### Version 0.3.3
- *Effects* - Added `.playIf()` ([docs](https://github.com/fantasycalendar/FoundryVTT-Sequencer/wiki#play-if)); this allows you to completely ignore playing an effect or sound, depending on a boolean or a function
- *Sounds* - Added support for `.async()` and `.waitUntilFinished()` for sounds - requires both to be `true` due to code weirdness, I'll be refactoring this in the future
- *Effects* - Refactored `.scale()` when it was provided with a minimum and maximum value, it now randomizes the scale of the effect when executed instead of when the method was called
- *Effects & Sounds* - Refactored `.file()` for both effects and sounds so that providing an array of files no longer immediately picks one from the array, but randomly picks a file each time the section is executed
- *Effects & Sounds* - Refactored how `.delay()` interacted with `.repeats()`, which should result in more consistent behavior
- *Sequencer* - Swapped the functionality of `.async()` and `.waitUntilFinished()`, and clarified in the docs
- *Sequencer* - Added support for random range within a `.wait()` block (like, `.wait(500, 1000)` etc)

### Version 0.3.2 - 0.8.x ready!
* *Effects* - Added `.playbackRate()` to effects, you can now speed up the play rate of your effects
* *Sequencer* - Tweaked internal handling of `.async()` together with `.waitUntilFinished()` improved
* *Sequencer* - Tweaked to use `ready` instead of `init` to load module

### Version 0.3.1
- *Effects* - Refactored `.randomizeMirror()` into `.randomizeMirrorX()` and `.randomizeMirrorY()`
- *Effects* - Refactored scaling algorithm for `.reachTowards()`
- *Sequencer* - Added support for random `.wait()` interval

### Version 0.3.0
- *Effects* - Refactored `.aimTowards()` into `.rotateTowards()` and `.reachTowards()`
- *Effects* - Refactored how `.missed()` chooses the location to hit and now takes token size into account
- *Effects* - Added `.JB2A()` to automatically set the effect to handle their sprites in the best way possible
- *Effects* - Added `.randomizeMirror()` to randomly mirror sprites on the Y axis
- *Effects* - Added Mustache support in file names

### Version 0.2.0
- *Sequencer* - Added support for executing macros
- *Sequencer* - Added support for playing sounds
- *Sequencer* - Wrapped classes in proxies to simplify fluid interface (gets rid of `.done()` on effects and sounds)

### Version 0.1.0
- First implementation
