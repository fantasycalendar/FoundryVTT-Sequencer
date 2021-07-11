type MacroReference = Record<string, unknown>;

type EasingOptions = {
  ease?: string;
  delay?: number;
};

type EasingOptionsWithTarget = EasingOptions & {
  target: Vector2;
};

type ExtendedEasingOptions = EasingOptions & {
  duration?: number;
  offset?: number;
  towardsCenter?: boolean;
};
type Vector2 = {
  x: number;
  y: number;
};

declare class CoreMethods {
  /**
   * Creates a section that will run a function.
   */
  thenDo(inFunc: () => void | (() => Promise<void>)): Sequence;
  /**
   * Creates a section that will run a macro based on a name or a direct reference to a macro.
   */
  macro(inMacro: string | Macro, inWaitUntilFinished?: boolean): Sequence;
  /**
   * Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given
   * a second number, a random wait time between the two given numbers will be generated. Both parameters default to 1ms.
   */
  wait(delayMs?: number, delayRangeEndMs?: number): Sequence;
  /**
   * Creates an animation. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Animation section.
   */
  animation(inTokenOrInTile?: Token | Tile): AnimationSection;
  /**
   * Creates an effect section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Effect section.
   */
  effect(filePath?: string): EffectSection;
  /**
   * Creates a sound section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Sound section.
   */
  sound(filePath?: string): SoundSection;
  /**
   * Adds the sections from a given Sequence to this Sequence
   */
  sequence(
    inSequence: Sequence | EffectSection | AnimationSection | SoundSection
  ): Sequence;
  /**
   * Plays all of this sequence's sections, resolves to the sequence instance
   */
  play(): Promise<Sequence>;
}

interface AnimatedSection<T> {
  /**
   * Sets the opacity of the effect. If used with .fadeIn() and/or .fadeOut(), this defines what the effect will fade to/from
   */
  opacity(inOpacity: number): T;
  /**
   * Sets the speed (pixels per frame) to move the target object
   */
  moveSpeed(inSpeed: number): T;
  /**
   * Sets the rotation of the effect or animation, which is added on top of the calculated rotation after .rotateTowards() or .randomRotation()
   */
  rotate(inRotation: number): T;
  /**
   *  Causes the effect to rotate when it starts playing
   */
  rotateIn(degrees: number, duration: number, options?: EasingOptions): T;
  /**
   *  Causes the effect to rotate at the end of the effect's duration
   */
  rotateOut(degrees: number, duration: number, options?: EasingOptions): T;
}

declare interface Sequence extends CoreMethods {}
declare class Sequence {}

declare abstract class Section<T> {
  readonly shouldWaitUntilFinished: boolean;
  readonly shouldAsync: boolean;
  readonly shouldPlay: boolean;
  /**
   * Causes the section to finish running before starting the next section.
   */
  waitUntilFinished(ms?: number): T;
  /**
   * Causes each effect or sound to finish playing before the next one starts playing. This differs from
   * .waitUntilFinished() in the sense that this is for each repetition, whilst .waitUntilFinished() is
   * for the entire section.
   */
  async(): T;
  /**
   * Causes the effect or sound to be repeated n amount of times, with an optional delay. If given inRepeatDelayMin
   * and inRepeatDelayMax, a random repetition delay will be picked for every repetition
   */
  repeats(
    inRepetitions: number,
    inRepeatDelayMin?: number,
    inRepeatDelayMax?: number
  ): T;
  /**
   * Causes the effect or sound to not play, and skip all delays, repetitions, waits, etc. If you pass a function,
   * the function should return something false-y if you do not want the effect or sound to play.
   */
  playIf(condition: boolean | (() => boolean)): T;
  /**
   * Delays the effect or sound from being played for a set amount of milliseconds. If given a second number, a
   * random delay between the two numbers will be generated.
   */
  delay(msMin: number, msMax: number): T;
  /**
   * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
   */
  setMustache(inMustache: Record<string, unknown>): T;
  /**
   * Overrides the duration of an effect or sound
   */
  duration(ms: number): T;
  /**
   * Sets the volume of the sound.
   */
  volume(inVolume: number): T;
  /**
   * Causes the animated section to fade in its audio (if any) when played
   */
  fadeInAudio(duration: number, options?: EasingOptions): T;
  /**
   * Causes the audio to fade out at the end of the animated section's duration
   */
  fadeOutAudio(duration: number, options?: EasingOptions): T;
  /**
   * Causes the effect to fade in when played
   */
  fadeIn(durationMs: number, options?: EasingOptions): T;
  /**
   * Causes the effect to fade out at the end of the effect's duration
   */
  fadeOut(durationMs: number, options?: EasingOptions): T;
}

declare interface AnimationSection
  extends CoreMethods,
    Section<AnimationSection>,
    AnimatedSection<AnimationSection> {}
declare abstract class AnimationSection {
  /**
   * Sets the target object to be animated
   */
  on(inTokenOrTile: Token | Tile | string): this;
  /**
   * Sets the location to move the target object to
   */
  moveTowards(
    inTarget: Token | Tile | Vector2,
    options?: EasingOptionsWithTarget
  ): this;
  /**
   * Sets the location to move the target object to
   */
  rotateTowards(
    target: Token | Tile | Vector2 | string,
    options?: ExtendedEasingOptions
  ): this;
  /**
   * Sets the location to teleport the target object to
   */
  teleportTo(
    inTarget: Token | Tile | Vector2 | string,
    options?: { delay: number; target: Vector2 }
  ): this;
  /**
   * Causes the movement or teleportation to be offset in the X and/or Y axis
   */
  offset(inOffset: Vector2): this;
  /**
   * Causes the movement or teleportation to pick the closest non-intersecting square, if the target is a token or tile
   */
  closestSquare(inBool?: boolean): this;
  /**
   * Causes the final location to be snapped to its square
   */
  snapToSquare(inBool?: boolean): this;
}

declare interface EffectSection
  extends CoreMethods,
    Section<EffectSection>,
    AnimatedSection<EffectSection> {}
declare abstract class EffectSection {
  /**
   * Defines the base folder that will prepend to the file path. This is mainly just useful to make the file
   * path easier to manage.
   */
  baseFolder(inPath: string): this;
  /**
   * Declares which .webm to be played This may also be an array of paths, which will be randomly picked from each
   * time the effect is played.
   */
  file(input: string | string[]): this;
  /**
   *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
   *  or a string reference (see .name())
   */
  atLocation(location: Token | Template | string | Vector2): this;
  /**
   *  Causes the effect to be rotated towards the given token, template, or a direct on the canvas to play the effect at, or a string reference (see .name())
   */
  rotateTowards(location: Token | Template | string | Vector2): this;
  /**
   *  Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
   *  This effectively calculates the proper X scale for the effect to reach the target
   */
  reachTowards(location: Token | Template | string | Vector2): this;
  /**
   *  Causes the effect to move towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
   */
  moveTowards(
    target: Token | Template | string | Vector2,
    options?: EasingOptions
  ): this;
  /**
   *  Causes the effect to be offset relative to its location based on a given vector
   */
  offset(inOffset: Vector2, options?: { local?: boolean }): this;
  /**
   * Causes the effect's position to be stored and can then be used  with .atLocation(), .reachTowards(),
   * and .rotateTowards() to refer to previous effects' locations
   */
  name(inName: string): this;
  /**
   * Causes the effect to target a location close to the .reachTowards() location, but not on it.
   */
  missed(bool: boolean): this;
  /**
   * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
   * modifications of effect's data. For example, it could be manipulated to change which file will be used based
   * on the distance to the target.
   */
  addOverride(
    fn: (
      effect: this,
      data: Record<string, unknown>
    ) => Promise<Record<string, unknown>>
  ): this;
  /**
   * Sets the start point and end point to best work JB2A's effect sprites. This depends on the type of the effect, which
   * the Sequencer figures out from the path.
   */
  JB2A(): this;
  /**
   *  Defines the start point within the given sprite, starting from the left of the sprite. An example
   *  would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the
   *  'anchor point'
   */
  startPoint(inStartPoint: number): this;
  /**
   *  The same as the start point, except from the right and how many pixels to offset the target from
   */
  endPoint(inEndPoint: number): this;
  /**
   * Sets the grid size of the file loaded in the Effect. Some files have an established internal
   * grid, so this will make the effect scale up or down to match the active scene's grid size
   */
  gridSize(gridSize: number): this;
  /**
   *  A method that can take the following:
   *  - A number to set the scale uniformly
   *  - An object with x and y for non-uniform scaling
   *  - Two numbers which the Sequencer will randomly pick a uniform scale between
   */
  scale(scaleFactorOrObj: number | Vector2): this;
  scale(scaleMin: number, scaleMax: number): this;
  /**
   *  Causes the effect to scale when it starts playing
   */
  scaleIn(
    scale: number | Vector2,
    duration: number,
    options?: EasingOptions
  ): this;
  /**
   *  Causes the effect to scale at the end of the effect's duration
   */
  scaleOut(
    scale: number | Vector2,
    duration: number,
    options?: EasingOptions
  ): this;
  /**
   *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
   */
  anchor(anchorPos: number | Vector2): this;
  /**
   *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
   *
   *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
   *  outermost edge of the location the sprite is played at
   */
  center(): this;
  /**
   * The sprite gets a random rotation, which means it should not be used with .reachTowards()
   */
  randomRotation(): this;
  /**
   * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
   * mirroring the sprite on its horizontal axis
   */
  mirrorX(inBool?: boolean): this;
  /**
   * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
   * mirroring the sprite on its vertical axis
   */
  mirrorY(inBool?: boolean): this;
  /**
   * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
   * become 1 or -1, effectively mirroring the sprite on its horizontal axis
   */
  randomizeMirrorX(): this;
  /**
   * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
   * become 1 or -1, effectively mirroring the sprite on its vertical axis
   */
  randomizeMirrorY(): this;
  /**
   * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
   * it play half as fast.
   */
  playbackRate(rate: number): this;
  /**
   * Causes the effect to be played below tokens
   */
  belowTokens(bool?: boolean): this;
  /**
   * Causes the effect to be played below tiles
   */
  belowTiles(bool?: boolean): this;
  /**
   * Sets the zIndex of the effect, potentially displaying it on top of other effects
   */
  zIndex(index: number): this;
}

declare interface SoundSection
  extends CoreMethods,
    Section<SoundSection> {}
declare abstract class SoundSection {
  /**
   * Declares which sound to be played This may also be an array of paths, which will be randomly picked from each
   * time the sound is played.
   */
  file(filePath: string | string[]): this;
}
