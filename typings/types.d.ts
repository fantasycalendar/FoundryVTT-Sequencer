import type {
  AnyFunction,
  AnyArray,
  AnyObject,
  PropertiesOfType,
} from "fvtt-types/utils";
import type { Writable } from "svelte/store";

interface CoreMethods {
  /**
   * Creates a section that will run a function.
   */
  thenDo(inFunc: () => void | Promise<void>): Sequence;

  /**
   * Creates a section that will run a macro based on a name, id, UUID, or a direct reference to a macro.
   */
  macro(
    inMacro: string | Macro.Implementation,
    ...arguments: unknown[]
  ): Sequence;

  /**
   * Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given
   * a second number, a random wait time between the two given numbers will be generated. Both parameters default to 1ms.
   */
  wait(delayMs?: number, delayRangeEndMs?: number): Sequence;

  /**
   * Creates an animation. Until you call any other sections you'll be working on the Animation section.
   */
  animation(inTokenOrInTile?: VisibleFoundryTypes): AnimationSection;

  /**
   * Creates an effect section. Until you call any other sections you'll be working on the Effect section.
   */
  effect(filePath?: string): EffectSection;

  /**
   * Creates a sound section. Until you call any other sections you'll be working on the Sound section.
   */
  sound(filePath?: string): SoundSection;

  /**
   * Creates a scrolling text. Until you call any other sections you'll be working on the Scrolling Text section.
   */
  scrollingText(
    inTarget?: VisibleFoundryTypes | Vector2,
    inText?: string,
    inTextStyle?: object
  ): ScrollingTextSection;

  /**
   * Pans the canvas text. Until you call any other sections you'll be working on the Canvas Pan section.
   */
  canvasPan(
    inTarget?: VisibleFoundryTypes | Vector2,
    inDuration?: number,
    inSpeed?: number
  ): CanvasPanSection;

  /**
   * Creates a crosshair section. Until you call other Sequence methods, you will be working on the Crosshair section.
   */
  crosshair(inName?: string): CrosshairSection;

  /**
   * Adds a location to the sequence and ties it to a string so that it may be used later
   */
  addNamedLocation(
    inName: string,
    inLocation: VisibleFoundryTypes | Vector2
  ): this;

  /**
   * Adds the sections from a given Sequence to this Sequence
   */
  addSequence(
    inSequence: Sequence | EffectSection | AnimationSection | SoundSection
  ): Sequence;

  /**
   * Plays all of this sequence's sections, resolves to the sequence instance
   */
  play(inOptions?: PlayOptions): Promise<Sequence>;

  /**
   * Turns the sequence into an array of objects to be reconstructed later
   */
  toJSON(): Array<object>;

  /**
   * Takes the serialized sequence array and returns a sequence ready to be played
   */
  fromJSON(inJSON: Array<object>): Sequence;
}

interface HasAudio<T> {
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
}

interface HasFiles<T> {
  /**
   * Declares which file to be played. This may also be an array of paths, which will be randomly picked from each
   * time the section is played.
   */
  file(inFile: string | string[]): T;

  /**
   * Defines the base folder that will prepend to the file path. This is mainly just useful to make the file
   * path easier to manage.
   */
  baseFolder(inBaseFolder: string): T;

  /**
   * Sets the Mustache of the filepath. This is applied after the randomization of the filepath, if available.
   */
  setMustache(inMustache: AnyObject): T;
}

interface HasMovement<T> {
  /**
   * Sets the rotation of the effect or animation, which is added on top of the calculated rotation after .rotateTowards() or .randomRotation()
   */
  moveTowards(
    inTarget: VisibleFoundryTypes | Vector2 | string,
    options?: EasingOptionsWithTarget
  ): this;

  /**
   Sets the speed (pixels per frame) to move the target object
   */
  moveSpeed(inSpeed: number): T;
}

interface HasOpacity<T> {
  /**
   * Sets the opacity of the effect. If used with .fadeIn() and/or .fadeOut(), this defines what the effect will fade to/from
   */
  opacity(inOpacity: number): T;

  /**
   * Causes the effect to fade in when played
   */
  fadeIn(durationMs: number, options?: EasingOptions): T;

  /**
   * Causes the effect to fade out at the end of the effect's duration
   */
  fadeOut(durationMs: number, options?: EasingOptions): T;
}

interface HasRotation<T> {
  /**
   * The object gets a random rotation, which means it should not be used with .stretchTo()
   */
  randomRotation(inBool?: boolean): T;

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

interface HasScale<T> {
  /**
   * A method that can take the following:
   *  - A number to set the scale uniformly
   *  - An object with x and y for non-uniform scaling
   *  - Two numbers which the Sequencer will randomly pick a uniform scale between
   */
  scale(inScaleMin: number | ScaleOptions, inScaleMax?: number): T;

  /**
   * Causes the effect to scale when it starts playing
   */
  scaleIn(
    inScale: number | ScaleOptions,
    durationMs: number,
    options?: EasingOptions
  ): T;

  /**
   * Causes the effect to scale at the end of the effect's duration
   */
  scaleOut(
    inScale: number | ScaleOptions,
    durationMs: number,
    options?: EasingOptions
  ): T;
}

interface HasTime<T> {
  /**
   * Sets the start and end time of the section, playing only that range
   */
  timeRange(inMsStart: number, inMsEnd: number): T;

  /**
   * Sets the start time of the section.
   */
  startTime(inMs: number): T;

  /**
   * Sets the start time of the section based on a percentage from its total duration.
   */
  startTimePerc(inPercentage: number): T;

  /**
   * Sets the ending time of the section (from the end).
   */
  endTime(inMs: number): T;

  /**
   * Sets the ending time of the section based on a percentage from the total duration.
   */
  endTimePerc(inPercentage: number): T;
}

interface HasTint<T> {
  /**
   * Tints the target of this section by the color given to the
   */
  tint(inColor: number | HEX): T;
}

interface HasUsers<T> {
  /**
   * Causes section to be executed only locally, and not push to other connected clients.
   */
  locally(inLocally?: boolean): T;

  /**
   * Causes the section to be executed for only a set of users.
   */
  forUsers(inUsers: string | User | Array<string | User>): T;
}

interface HasAnimations<T> {
  /**
   * Animates a property on the target of the animation.
   */
  animateProperty(
    inTarget: string,
    inPropertyName: string,
    inOptions: {
      duration: number;
      from: number;
      to: number;
      delay?: number;
      ease?: string;
      fromEnd?: boolean;
      gridUnits?: boolean;
      screenSpace?: boolean;
    }
  ): this;

  /**
   * Loops a property between a set of values on the target
   */
  loopProperty(
    inTarget: string,
    inPropertyName: string,
    inOptions: {
      duration: number;
      from?: number;
      to?: number;
      values?: Array<number>;
      loops?: number;
      pingPong?: boolean;
      delay?: number;
      ease?: string;
      fromEnd?: boolean;
      gridUnits?: boolean;
      screenSpace?: boolean;
    }
  ): this;
}

interface HasFilters<T> {
  /**
   * Applies a files
   */
  filter(inFilterName: string, inData?: {}, inName?: string): this;
}

interface HasLocation<T> {
  /**
   *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
   *  or a string reference (see .name())
   */
  atLocation(
    inLocation: VisibleFoundryTypes | Vector2 | string,
    inOptions?: {
      cacheLocation?: boolean;
      offset?: Vector2;
      randomOffset?: number;
      gridUnits?: boolean;
      local?: boolean;
    }
  ): this;
}

interface HasName<T> {
  /**
   * Causes the effect to be stored and can then be used  with .atLocation(), .stretchTowards(),
   * and .rotateTowards() to refer to previous effects' locations
   *
   * Named effects and sounds can be ended with their respective managers through the name.
   */
  name(inName: string): this;
}

interface HasText<T> {
  /**
   * Creates a text element, attached to the sprite. The options for the text are available here:
   * https://pixijs.io/pixi-text-style/
   */
  text(inText: string, inOptions?: object): this;
}

type RecursiveElement<T> = T extends object ? T[keyof T] : T;

declare global {
  type EasingOptions = {
    ease?: string;
    delay?: number;
  };

  type RequireAtLeastOne<T> = {
    [K in keyof T]-?: Required<Pick<T, K>> &
      Partial<Pick<T, Exclude<keyof T, K>>>;
  }[keyof T];

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

  type Size = {
    width: number;
    height: number;
  };

  type HEX = `#${string}`;

  type SnappingOptions = {
    CENTER: 1;
    EDGE_MIDPOINT: 2;
    TOP_LEFT_VERTEX: 16;
    TOP_RIGHT_VERTEX: 32;
    BOTTOM_LEFT_VERTEX: 64;
    BOTTOM_RIGHT_VERTEX: 128;
    VERTEX: 240;
    TOP_LEFT_CORNER: 256;
    TOP_RIGHT_CORNER: 512;
    BOTTOM_LEFT_CORNER: 1024;
    BOTTOM_RIGHT_CORNER: 2048;
    CORNER: 3840;
    TOP_SIDE_MIDPOINT: 4096;
    BOTTOM_SIDE_MIDPOINT: 8192;
    LEFT_SIDE_MIDPOINT: 16384;
    RIGHT_SIDE_MIDPOINT: 32768;
    SIDE_MIDPOINT: 61440;
  };

  type VisibleFoundryTypes =
    | Token.Implementation
    | TokenDocument.Implementation
    | Tile.Implementation
    | TileDocument.Implementation
    | Drawing.Implementation
    | DrawingDocument.Implementation
    | MeasuredTemplate.Implementation
    | MeasuredTemplateDocument.Implementation;

  type TemplateData = {
    angle: number;
    t: string;
    texture: object;
    x: number;
    y: number;
    width: number;
    elevation: number;
    distance: number;
    fillColor: string;
    borderAlpha: number;
    borderColor: string;
    direction: number;
    parent: Scene.Implementation;
  };

  type CrosshairsData = {
    borderAlpha?: number;
    textureAlpha?: number;
    textureScale?: number;
    gridHighlight?: boolean;
    icon?: {
      texture?: string;
      borderVisible?: boolean;
    };
    snap?: {
      position?: number;
      resolution?: number; // See https://github.com/foundryvtt/foundryvtt/issues/10014
      size?: number;
      direction?: number;
    };
    lockDrag?: boolean;
    distanceMin?: null | number;
    distanceMax?: null | number;
    label?: {
      text?: string;
      dx?: number;
      dy?: number;
    };
    location?: {
      obj?: null | VisibleFoundryTypes;
      limitMinRange?: number | null;
      limitMaxRange?: number | null;
      showRange?: boolean;
      lockToEdge?: boolean;
      lockToEdgeDirection?: boolean;
      displayRangePoly?: boolean;
      rangePolyFillColor?: number | null;
      rangePolyLineColor?: number | null;
      rangePolyFillAlpha?: number | null;
      rangePolyLineAlpha?: number | null;
      offset?: {
        x?: number;
        y?: number;
      };
      wallBehavior?: string;
    };
    lockManualRotation?: boolean;
  };

  interface CrosshairData extends TemplateData, CrosshairsData {}

  type CrosshairCallbackData = {
    show: AnyFunction;
    move: AnyFunction;
    mouseMove: AnyFunction;
    collide: AnyFunction;
    stopColliding: AnyFunction;
    invalidPlacement: AnyFunction;
    placed: AnyFunction;
    cancel: AnyFunction;
  };

  type CrosshairCallbacks = {
    SHOW: "show";
    MOUSE_MOVE: "mouseMove";
    MOVE: "move";
    COLLIDE: "collide";
    STOP_COLLIDING: "stopColliding";
    INVALID_PLACEMENT: "invalidPlacement";
    PLACED: "placed";
    CANCEL: "cancel";
  };

  type CrosshairPlacementRestrictions = {
    ANYWHERE: "anywhere";
    LINE_OF_SIGHT: "lineOfSight";
    NO_COLLIDABLES: "noCollidables";
  };

  type Shapes = "polygon" | "rectangle" | "circle" | "ellipse" | "roundedRect";

  type ShapeOptions = {
    radius?: number;
    width?: number;
    height?: number;
    points?: Array<[number, number] | { x: number; y: number }>;
    gridUnits?: boolean;
    name?: string;
    fillColor?: HEX | number;
    fillAlpha?: number;
    alpha?: number;
    lineSize?: number;
    lineColor?: HEX | number;
    offset?: {
      x?: number;
      y?: number;
      gridUnits?: boolean;
    };
    anchor?: {
      x?: number;
      y?: number;
    };
    isMask?: boolean;
  };

  type PlayOptions = {
    remote?: boolean;
    preload?: boolean;
    local?: boolean;
  };

  type SequenceOptions = { inModuleName?: string; softFail?: boolean };

  interface Sequence extends CoreMethods {}

  class Sequence {
    /**
     * Declaring the module name when using new Sequence() will make every error or warning caught during the runtime also
     * include the module name, which lets you and other users know which module caused the error.
     */
    constructor(inOptions?: SequenceOptions, softFail?: boolean);

    _customError(self: Section<unknown>, func: string, error: string): Error;
  }

  class AnySection extends Section<unknown> {
    constructor(...args: never);
  }

  abstract class Section<T> {
    readonly shouldWaitUntilFinished: boolean;
    readonly shouldAsync: boolean;
    readonly shouldPlay: boolean;

    constructor(sequence: Sequence);

    readonly sequence: Sequence;
    readonly _sectionStatus: Writable<string>;
    readonly _playIf: boolean;
    readonly _waitUntilFinished: boolean;
    readonly _async: boolean;
    readonly _waitUntilFinishedDelay: [number, number];
    readonly _repetitions: number;
    readonly _currentRepetition: number;
    readonly _repeatDelayMin: number;
    readonly _repeatDelayMax: number;
    readonly _repeatDelay: number;
    readonly _delayMin: number;
    readonly _delayMax: number;
    readonly _basicDelay: number;
    readonly _duration: boolean;

    static niceName: string;

    /**
     * Causes the section to finish running before starting the next section.
     */
    waitUntilFinished(minDelay?: number, maxDelay?: number): T;

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
    delay(msMin: number, msMax?: number): T;

    /**
     * Overrides the duration of this section
     */
    duration(inDuration: number): T;

    /**
     * Appends a preset to the current sequence in place
     */
    preset(presetName: string, ...args: unknown[]): T;
  }

  type ScaleOptions = { x: number; y: number };

  type TeleportToOptions = {
    delay: number;
    relativeToCenter: boolean;
  };

  type BaseRotateTowardsOptions = {
    cacheLocation?: boolean;
    attachTo?: boolean;
    offset?: Vector2;
    randomOffset?: number;
    gridUnits?: boolean;
    local?: boolean;
  };

  type EffectRotateTowardsOptions = BaseRotateTowardsOptions & {
    onlyX?: boolean;
    tiling?: boolean;
    requiresLineOfSight?: boolean;
    hideLineOfSight?: boolean;
  };

  type AnimationRotateTowardsOptions = BaseRotateTowardsOptions & {
    rotationOffset?: number;
    template?: boolean;
  };

  interface AnimationSection
    extends CoreMethods,
      Section<AnimationSection>,
      HasMovement<AnimationSection>,
      HasOpacity<AnimationSection>,
      HasRotation<AnimationSection>,
      HasAudio<AnimationSection>,
      HasTint<AnimationSection> {}

  abstract class AnimationSection {
    /**
     * Sets the target object to be animated
     */
    on(inTarget: VisibleFoundryTypes | string): this;

    /**
     * Sets the location to teleport the target object to
     */
    teleportTo(
      inTarget: VisibleFoundryTypes | Vector2 | string,
      options?: TeleportToOptions
    ): this;

    /**
     * Sets the location to rotate the object to
     */
    rotateTowards(
      inTarget: VisibleFoundryTypes | Vector2 | string,
      options?: AnimationRotateTowardsOptions
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
     * Causes the final location to be snapped to the grid
     */
    snapToGrid(inBool?: boolean): this;

    /**
     * Causes the object to become hidden
     */
    hide(inBool?: boolean): this;

    /**
     * Causes the object to become visible
     */
    show(inBool?: boolean): this;
  }

  type PersistOptions = {
    persistTokenPrototype: boolean;
  };

  type AttachToOptions = {
    align?: string;
    edge?: string;
    bindVisibility?: boolean;
    bindAlpha?: boolean;
    bindScale?: boolean;
    bindElevation?: boolean;
    followRotation?: boolean;
    offset?: Vector2;
    randomOffset?: number;
    gridUnits?: boolean;
    local?: boolean;
  };

  type StretchToOptions = {
    cacheLocation?: boolean;
    attachTo?: boolean;
    onlyX?: boolean;
    tiling?: boolean;
    offset?: Vector2;
    randomOffset?: number;
    gridUnits?: boolean;
    local?: boolean;
    requiresLineOfSight?: boolean;
    hideLineOfSight?: boolean;
  };

  type CopySpriteOptions = {
    cacheLocation?: boolean;
    offset?: Vector2;
    randomOffset?: number;
    gridUnits?: boolean;
    local?: boolean;
  };

  type SpriteOffsetOptions = {
    gridUnits?: boolean;
    local?: boolean;
  };

  type ScaleToObjectOptions = {
    uniform?: boolean;
    considerTokenScale?: boolean;
  };

  type SizeOptions = {
    gridUnits: boolean;
  };

  type TemplateOptions = {
    gridSize: number;
    startPoint: number;
    endPoint: number;
  };

  type ElevationOptions = {
    absolute: boolean;
  };

  type LoopOptions = {
    loopDelay: number;
    loops: number;
    endOnLastLoop: boolean;
  };

  type ScreenSpaceScaleOptions = {
    x?: number;
    y?: number;
    fitX?: boolean;
    fitY?: boolean;
    ratioX?: boolean;
    ratioY?: boolean;
  };

  type TieToOrigin =
    | string
    | PlaceableObject
    | foundry.abstract.Document.Any
    | Array<string | PlaceableObject.Any | foundry.abstract.Document.Any>;

  interface EffectSection
    extends CoreMethods,
      Section<EffectSection>,
      HasFiles<EffectSection>,
      HasAudio<EffectSection>,
      HasMovement<EffectSection>,
      HasOpacity<EffectSection>,
      HasRotation<EffectSection>,
      HasScale<EffectSection>,
      HasTime<EffectSection>,
      HasUsers<EffectSection>,
      HasAnimations<EffectSection>,
      HasFilters<EffectSection>,
      HasTint<EffectSection>,
      HasLocation<EffectSection>,
      HasText<EffectSection>,
      HasName<EffectSection> {}

  abstract class EffectSection {
    /**
     * Causes the effect to persist indefinitely on the canvas until _ended via SequencerEffectManager.endAllEffects() or
     * name the effect with .name() and then end it through SequencerEffectManager.endEffect()
     */
    persist(inBool?: boolean, inOptions?: PersistOptions): this;

    /**
     * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
     * it play half as fast.
     */
    playbackRate(inNumber: number): this;

    /**
     * Causes effects with this sync group to share the same start time - useful if you have multiple
     * duplicated effects that need to play at the same time.
     */
    syncGroup(string: string): this;

    /**
     * Causes the effect to target a location close to the .stretchTowards() location, but not on it.
     */
    missed(inBool?: boolean): this;

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     */
    addOverride(inFunc: AnyFunction): this;

    /**
     * A smart method that can take a reference to an object, or a direct on the canvas to attach an effect to,
     * or a string reference (see .name())
     */
    attachTo(
      inLocation: VisibleFoundryTypes | Vector2 | string,
      inOptions?: AttachToOptions
    ): this;

    /**
     * Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
     * This effectively calculates the proper X scale for the effect to reach the target
     */
    stretchTo(
      inLocation: VisibleFoundryTypes | Vector2 | string,
      inOptions?: StretchToOptions
    ): this;

    /**
     * Sets the location to rotate the object to
     */
    rotateTowards(
      inLocation: VisibleFoundryTypes | Vector2 | string,
      inOptions?: EffectRotateTowardsOptions
    ): this;

    /**
     * Create an effect based on the given object, effectively copying the object as an effect. Useful when you want to do some effect magic on tokens or tiles.
     */
    copySprite(
      inLocation:
        | Token.Implementation
        | Tile.Implementation
        | TokenDocument.Implementation
        | TileDocument.Implementation,
      inOptions?: CopySpriteOptions
    ): this;

    /**
     * Creates a graphical element, attached to the sprite.
     */
    shape(inType: Shapes, inOptions?: ShapeOptions): this;

    /**
     * Causes the effect's sprite to be offset relative to its location based on a given vector
     */
    spriteOffset(inOffset: Vector2, inOptions?: SpriteOffsetOptions): this;

    /**
     * Causes the final effect location to be snapped to the grid
     */
    snapToGrid(inBool?: boolean): this;

    /**
     * Causes the effect to be scaled to the target object's width
     */
    scaleToObject(inScale?: number, inOptions?: ScaleToObjectOptions): this;

    /**
     * Sets the width and the height of the effect in pixels, this size is set before any scaling
     */
    size(inSize: number | Size, inOptions?: SizeOptions): this;

    /**
     * This scales the sprite of the effect, and this method can take the following:
     * - A number to set the scale uniformly
     * - An object with x and y for non-uniform scaling
     * - Two numbers which the Sequencer will randomly pick a uniform scale between
     */
    spriteScale(inScaleMin: number | Vector2, inScaleMax?: number): this;

    /**
     * This defines the internal padding of this effect. Gridsize determines the internal grid size of this effect which will determine how big it is on the canvas
     * relative to the canvas's grid size. Start and end point defines padding at the left and right of the effect
     */
    template(inTemplate?: TemplateOptions): this;

    /**
     * This makes the texture of the effect tile, effectively repeat itself within the sprite's dimensions
     */
    tilingTexture(scale?: Vector2, position?: Vector2): this;

    /**
     *  Anchors the sprite's container according to the given x and y coordinates, or uniformly based on a single number
     */
    anchor(inAnchor: Vector2): this;

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
     */
    spriteAnchor(inAnchor: Vector2): this;

    /**
     *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
     *
     *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
     *  outermost edge of the location the sprite is played at
     */
    center(): this;

    /**
     * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its horizontal axis
     */
    randomizeMirrorX(inBool?: boolean): this;

    /**
     * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its vertical axis
     */
    randomizeMirrorY(inBool?: boolean): this;

    /**
     * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become 1 or -1, effectively
     * mirroring the sprite on its horizontal axis
     */
    mirrorX(inBool?: boolean): this;

    /**
     * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become 1 or -1, effectively
     * mirroring the sprite on its vertical axis
     */
    mirrorY(inBool?: boolean): this;

    /**
     * Causes the effect to play beneath most tokens
     */
    belowTokens(inBool?: boolean): this;

    /**
     * Causes the effect to play beneath most tiles
     */
    belowTiles(inBool?: boolean): this;

    /**
     * Causes the effect to play on top of the vision mask
     */
    aboveLighting(inBool?: boolean): this;

    /**
     * Changes the effect's elevation
     */
    elevation(inElevation?: number, inOptions?: ElevationOptions): this;

    /**
     * Changes the effect's sortLayer, potentially displaying effects below tiles, above tokens or even weather effects
     * in case of identical elevations
     */
    sortLayer(inSortLayer: number): this;

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects the same elevation
     */
    zIndex(inZIndex: number): this;

    /**
     * This method only modifies .persist()-ed effects and causes them to not immediately end, but stick around for the given duration passed to this method.
     */
    extraEndDuration(inExtraDuration: number): this;

    /**
     * Rotates the sprite
     */
    spriteRotation(inAngle: number): this;

    /**
     * Causes the effect to not rotate should its containers rotate
     */
    zeroSpriteRotation(inBool?: boolean): this;

    /**
     * Allows you to control the number of loops and the delays between each loop
     */
    loopOptions(inOptions?: LoopOptions): this;

    /**
     * Causes the effect to not show up in the Effect Manager UI - DO NOT USE UNLESS YOU KNOW WHAT YOU ARE DOING
     */
    private(inBool?: boolean): this;

    /**
     * Causes the effect to be played in screen space instead of world space (where tokens are)
     */
    screenSpace(inBool?: boolean): this;

    /**
     * Causes the effect to be played above all of the UI elements
     */
    screenSpaceAboveUI(inBool?: boolean): this;

    /**
     * Positions the effect in a screen space position, offset from its .screenSpaceAnchor()
     */
    screenSpacePosition(inPosition: Vector2): this;

    /**
     * Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number in screen space
     */
    screenSpaceAnchor(inPosition: number | Vector2): this;

    /**
     * Sets up various properties relating to scale of the effect on the screen
     */
    screenSpaceScale(inOptions: ScreenSpaceScaleOptions): this;

    /**
     * This is for adding extra information to an effect, like the origin of the effect in the form of the item's uuid.
     *
     * The method accepts a string or a Document that has an UUID.
     */
    origin(inOrigin: string | foundry.abstract.Document.Any): this;

    /**
     * Ties the effect to any number of documents in Foundry - if those get deleted, the effect is ended.
     */
    tieToDocuments(inOrigin: TieToOrigin): this;

    /**
     * Masks the effect to the given object or objects. If no object is given, the effect will be masked to the source of the effect.
     */
    mask(inObject?: VisibleFoundryTypes | Array<VisibleFoundryTypes>): this;

    /**
     * Causes the effect to be visible through walls
     */
    xray(inBool?: boolean): this;
  }

  type LocationEffect = {
    type: keyof typeof CONFIG.soundEffects | (string & {});
    intensity: number;
  };

  type SoundLocationOptions = {
    radius: number;
    walls: boolean;
    easing: boolean;
    gmAlways: boolean;
    baseEffect: LocationEffect;
    muffledEffect: LocationEffect;
  };

  type Channel = PropertiesOfType<NonNullable<typeof game.audio>, AudioContext>;

  type FadeInAudio = {
    duration: number;
    ease: string;
    delay: number;
  };

  type FadeOutAudio = {
    duration: number;
    ease: string;
    delay: number;
  };

  type CanvasEffectObject =
    | string
    | { x: number; y: number }
    | VisibleFoundryTypes;

  type InitializedDocument =
    | Token.Implementation
    | TokenDocument.Implementation["_object"]
    | Tile.Implementation
    | TileDocument.Implementation["_object"]
    | Drawing.Implementation
    | DrawingDocument.Implementation["_object"]
    | MeasuredTemplate.Implementation
    | MeasuredTemplateDocument.Implementation["_object"];

  type UninitializedNameOffset = {
    setup?: never;
    seed: number;
    source: CanvasEffectObject | undefined;
    target: CanvasEffectObject | undefined;
  };

  type InitializedNameOffset = {
    setup: true;
    seed: number;
    source: CanvasEffectObject | undefined;
    target: CanvasEffectObject | undefined;
    sourceObj: InitializedDocument | false;
    targetObj: InitializedDocument | false;
    twister: foundry.dice.MersenneTwister;
  };

  type NameOffsetMap = {
    [K: string]: UninitializedNameOffset | InitializedNameOffset;
  };

  type ObjectCanvasData = {
    x: number;
    y: number;
    width: number;
    height: number;
    elevation: number;
    cachedLocation: boolean;
  };

  type SoundDataSource = {
    file: string;
    forcedIndex: boolean;
    customRange: boolean;
  };

  type SoundData = {
    id: string;
    play: boolean;
    src: SoundDataSource;
    source: string | ObjectCanvasData;
    offset: {
      x: number;
      y: number;
    };
    randomOffset: boolean;
    locationOptions: SoundLocationOptions;
    loop: boolean;
    volume: number;
    channel: Channel;
    fadeIn: FadeInAudio;
    fadeOut: FadeOutAudio;
    startTime: number;
    duration: number;
    sceneId: string;
    users: User.Implementation[];
    name: string;
    origin: foundry.abstract.Document.Any | string;
    seed: string;
    nameOffsetMap: NameOffsetMap;
  };

  interface SoundSection
    extends CoreMethods,
      Section<SoundSection>,
      HasFiles<SoundSection>,
      HasAudio<SoundSection>,
      HasName<SoundSection>,
      HasTime<SoundSection>,
      HasLocation<SoundSection> {}

  abstract class SoundSection {
    /**
     * Adds a function that will run at the end of the sound serialization step, but before it is played. Allows direct
     * modifications of sound's data.
     */
    addOverride(
      inFunc: (sound: SoundSection, data: SoundData) => SoundData
    ): this;

    /**
     * Radius in number of squares/hexes this sound will be played within. The distance is determined by the scene's grid size.
     */
    radius(inNumber: number): this;

    /**
     * Whether the sound will be completely blocked by walls.
     */
    constrainedByWalls(inBool: boolean): this;

    /**
     * Whether the sound will have its volume eased by the distance from its origin.
     */
    distanceEasing(inBool: boolean): this;

    /**
     * Set the sound output channel.
     */
    audioChannel(inString: String): this;

    /**
     * Whether the sound will play for GMs as if they were hearing it at the origin of the sound.
     */
    alwaysForGMs(inBool: boolean): this;

    /**
     * An effect to be applied on the sound when it is heard as per normal, with no walls blocking the sound.
     */
    baseEffect(options: SoundEffect): this;

    /**
     * An effect to be applied on the sound when it is heard through a wall.
     */
    muffledEffect(options: SoundEffect): this;
  }

  type SoundEffect = {
    type: string;
    intensity: number;
  };

  interface ScrollingTextSection
    extends CoreMethods,
      Section<ScrollingTextSection>,
      HasLocation<EffectSection>,
      HasText<EffectSection>,
      HasUsers<EffectSection> {}

  abstract class ScrollingTextSection {
    /**
     * The original anchor point where the text appears
     */
    anchor(inAnchor: string | number): this;

    /**
     * The direction in which the text scrolls
     */
    direction(inDirection: string | number): this;

    /**
     * An amount of randomization between [0, 1] applied to the initial position
     */
    jitter(inDirection: number): this;
  }

  type ShakeOptions = {
    duration?: number;
    strength?: number;
    frequency?: number;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    rotation?: boolean;
  };

  interface CanvasPanSection
    extends CoreMethods,
      Section<CanvasPanSection>,
      HasLocation<EffectSection>,
      HasUsers<EffectSection> {}

  abstract class CanvasPanSection {
    /**
     * Sets the speed (pixels per frame) of the canvas pan
     */
    speed(inSpeed: number): this;

    /**
     * Sets the zoom level of the canvas pan
     */
    scale(inScale: number): this;

    /**
     * Locks the canvas at the given location for the given duration
     */
    lockView(inDuration: number): this;

    /**
     * Shakes the canvas
     */
    shake(inOptions?: ShakeOptions): this;
  }

  type LabelOptions = {
    dx?: number;
    dy?: number;
  };

  type DistanceOptions = {
    min?: number;
    max?: number;
  };

  type IconOptions = {
    borderVisible?: boolean;
  };

  type CrosshairLocationOptions = {
    limitMinRange?: null | number;
    limitMaxRange?: null | number;
    showRange?: boolean;
    lockToEdge?: boolean;
    lockToEdgeDirection?: boolean;
    offset?: {
      x?: number;
      y?: number;
    };
    wallBehavior?: string;
    displayRangePoly?: boolean;
    rangePolyFillColor?: null | number;
    rangePolyLineColor?: null | number;
    rangePolyFillAlpha?: null | number;
    rangePolyLineAlpha?: null | number;
  };

  type TextureOptions = {
    alpha: number;
    scale: 1;
  };

  type CrosshairCallbackFunction = {
    (type: "show", placeable: CrosshairsPlaceable): void;
    (type: "mouseMove", placeable: CrosshairsPlaceable): void;
    (type: "move", placeable: CrosshairsPlaceable): void;
    (
      type: "collide",
      placeable: CrosshairsPlaceable,
      collisions: foundry.canvas.geometry.edges.PolygonVertex[]
    ): void;
    (type: "stopColliding", placeable: CrosshairsPlaceable): void;
    (
      type: "invalidPlacement",
      position: { source: ObjectCanvasData; target: ObjectCanvasData }
    ): void;
    (
      type: "placed",
      position: { source: ObjectCanvasData; target: ObjectCanvasData }
    ): void;
    (type: "cancel"): void;
  };

  interface CrosshairSection
    extends CoreMethods,
      Section<CrosshairSection>,
      HasName<EffectSection> {}

  abstract class CrosshairSection {
    /**
     * Sets the type of MeasurableTemplate to create, see CONST.MEASURED_TEMPLATE_TYPES
     */
    type(inType: string): this;

    /**
     * Sets a custom label to be set as a part of this crosshair
     */
    label(inText: string, inOptions: LabelOptions): this;

    /**
     * Sets how the position of the crosshair should snap on the grid
     */
    snapPosition(inSnap: number): this;

    /**
     * Sets the distance for the crosshair - or radius for a circular crosshair
     */
    distance(inDistance: number, inOptions: DistanceOptions): this;

    /**
     * Configures the angle of the crosshair - mostly used for the width of cone crosshairs
     */
    angle(inAngle: number): this;

    /**
     * Configures the direction degrees for the crosshair - mostly used for cone and ray crosshairs
     */
    direction(inDirection: number): this;

    /**
     * Configures the width for the crosshair - used for ray crosshairs
     */
    width(inWidth: number): this;

    /**
     * Configures the  increments the direction should snap along
     */
    snapDirection(inSnapDirection: number): this;

    /**
     * Toggles whether the crosshair can be manually rotated
     */
    lockManualRotation(inBool: boolean): this;

    /**
     * Toggles whether the crosshair's end position can be dragged
     * @param inBool
     */
    lockDrag(inBool: boolean): this;

    /**
     * Configures the custom icon to be used on the crosshair
     */
    icon(inTexture: string, inOptions: IconOptions): this;

    /**
     * Sets the border transparency of the crosshair
     */
    borderAlpha(inColor: number): this;

    /**
     * Sets the border color of the crosshair
     */
    borderColor(inColor: HEX | number): this;

    /**
     * Sets the fill color of the crosshair
     */
    fillColor(inColor: HEX | number): this;

    /**
     * Configures the source location of the crosshair, usually to limit it around the target placeable object, or to
     * cause it to be limited within a certain range of the placeable object
     */
    location(
      inLocation: VisibleFoundryTypes | Vector2 | string,
      inOptions?: CrosshairLocationOptions
    ): this;

    /**
     * Causes the crosshair to spawn a measurable template identical to the crosshair
     */
    persist(inBool: boolean): this;

    /**
     * Toggles whether this crosshair should highlight the grid
     */
    gridHighlight(inBool: boolean): this;

    /**
     * Adds a callback function for certain crosshair events
     */
    callback(
      inString: keyof CrosshairCallbackData,
      inFunction: CrosshairCallbackFunction
    ): this;

    /**
     * Sets the texture used by the crosshair
     */
    texture(inTexture: string, inOptions?: TextureOptions): this;
  }

  /**
   * Stub
   */
  class CrosshairsPlaceable {}

  abstract class SequencerFile {}

  type GetEntryOptions = {
    softFail?: boolean;
  };

  abstract class SequencerDatabase {
    /**
     *  Registers a set of entries to the database on the given module name
     */
    registerEntries(
      inModuleName: string,
      inEntries: object,
      isPrivate?: boolean,
      override?: boolean
    ): boolean;

    /**
     *  Validates the entries under a certain module name, checking whether paths to assets are correct or not
     */
    validateEntries(inModuleName: string): Promise<void>;

    /**
     *  Quickly checks if the entry exists in the database
     */
    entryExists(inString: string): boolean;

    /**
     *  Gets the entry in the database by a dot-notated string
     */
    getEntry(
      inString: string,
      inOptions?: GetEntryOptions
    ): SequencerFile | Array<SequencerFile> | boolean;

    /**
     *  Gets all files under a database path
     */
    getAllFileEntries(inDBPath: string): Array<string> | boolean;

    /**
     *  Get all valid entries under a certain path
     */
    getPathsUnder(inPath: string): Array<string>;

    /**
     *  Get all valid entries under a certain path
     */
    searchFor(inPath: string): Array<string> | boolean;
  }

  abstract class SequencerPreloader {
    /**
     * Causes each connected client (including the caller) to fetch and cache the provided file(s) locally, vastly improving loading speed of those files.
     */
    preload(
      inSrc: string | Array<string>,
      showProgressBar?: boolean
    ): Promise<void>;

    /**
     * Caches provided file(s) locally, vastly improving loading speed of those files.
     */
    preloadForClients(
      inSrc: string | Array<string>,
      showProgressBar?: boolean
    ): Promise<void>;
  }

  type RandomArrayElementOptions = {
    recurse?: boolean;
    twister?: boolean;
    index?: boolean;
  };

  type RandomObjectElementOptions<Recurse extends boolean | undefined> = {
    recurse?: Recurse;
    twister?: boolean;
  };

  type RandomObjectElementReturn<
    O extends object,
    Recurse extends boolean | undefined
  > = Recurse extends true ? RecursiveElement<O[keyof O]> : O[keyof O];

  abstract class SequencerHelpers {
    /**
     * Wait for a duration.
     */
    wait(ms: number): Promise<void>;

    /**
     * Clamps a value between two numbers
     */
    clamp(num: number, min: number, max: number): number;

    /**
     * This function interpolates between p1 and p2 based on a normalized value of t, determined by the ease provided (string or function)
     */
    interpolate(p1: number, p2: number, t: number, ease?: string): number;

    /**
     * Returns a floating point number between a minimum and maximum value
     */
    random_float_between(min: number, max: number): number;

    /**
     * Returns an integer between a minimum and maximum value
     */
    random_int_between(min: number, max: number): number;

    /**
     * Returns a shuffled copy of the original array.
     */
    shuffle_array<T extends AnyArray>(inArray: T): T;

    /**
     * Returns a random element in the given array
     */
    random_array_element<T>(
      inArray: readonly T[],
      inOptions?: RandomArrayElementOptions
    ): T;

    /**
     *  Returns a random element in the given object
     */
    random_object_element<
      O extends object,
      Recurse extends boolean | undefined = undefined
    >(inObject: O, inOptions?: RandomObjectElementOptions<Recurse>): any;

    /**
     *  Turns an array containing multiples of the same string, objects, etc, and removes duplications, and returns a fresh array
     */
    make_array_unique<T extends AnyArray>(inArray: T): T;
  }

  abstract class SequencerSectionManager {
    /**
     * Registers a class by a name that will then be available through the Sequencer
     */
    registerSection(
      inModuleName: string,
      inMethodName: string,
      inClass: AnySection,
      overwrite?: boolean
    ): boolean;
  }

  abstract class SequencerDatabaseViewer {
    /**
     * Opens the Sequencer database viewer
     */
    show(): Promise<void>;
  }

  abstract class SequencerEffectPlayer {
    /**
     * Opens the Sequencer Effects UI with the player tab open
     */
    show(): Promise<void>;
  }

  type InFilters = {
    object?: string | VisibleFoundryTypes;
    name?: string;
    sceneId?: string;
    source?: PlaceableObject | Document | String;
    target?: PlaceableObject | Document | String;
    origin?: String;
  };

  /**
   * Stub
   */
  class CanvasEffect {}

  abstract class SequencerEffectManager {
    /**
     * Opens the Sequencer Effects UI with the effects tab open
     */
    show(): Promise<void>;

    /**
     * Returns all of the currently running effects on the canvas
     */
    get effects(): Array<any>;

    /**
     * Get effects that are playing on the canvas based on a set of filters
     */
    getEffects(options: InFilters): Array<any>;

    /**
     * Updates effects based on a set of filters
     */
    updateEffects(
      options: RequireAtLeastOne<
        InFilters & {
          effects?: string | CanvasEffect | Array<string> | Array<CanvasEffect>;
        }
      >
    ): Promise<Array<any>>;

    /**
     * End effects that are playing on the canvas based on a set of filters
     */
    endEffects(
      options: RequireAtLeastOne<
        InFilters & {
          effects?: string | CanvasEffect | Array<string> | Array<CanvasEffect>;
        }
      >
    ): Promise<void>;

    /**
     * End all effects that are playing on the canvas
     */
    endAllEffects(inSceneId?: string, push?: boolean): Promise<void>;

    /**
     * If an effect has been named its position will be cached, which can be retrieved with this method
     */
    getEffectPositionByName(inName: string): Vector2;
  }

  /**
   * Stub
   */
  class CrosshairsDocument {}

  abstract class SequencerSoundManager {
    /**
     * Opens the Sequencer Manager UI with the sounds tab open
     */
    show(): Promise<void>;

    /**
     * Returns all the currently running sounds
     */
    get sounds(): Array<any>;

    /**
     * Get sounds that are playing based on a set of filters
     */
    getSounds(options: { name?: string; sceneId?: string }): Array<any>;

    /**
     * End sounds that are playing based on a set of filters
     */
    endSounds(options: {
      name?: string;
      sceneId?: string;
      effects:
        | string
        | foundry.audio.Sound.Any
        | Array<string>
        | Array<foundry.audio.Sound.Any>;
    }): Promise<void>;

    /**
     * End all sounds that are playing
     */
    endAllSounds(inSceneId?: string, push?: boolean): Promise<void>;
  }

  abstract class SequencerCrosshair {
    CALLBACKS: CrosshairCallbacks;
    PLACEMENT_RESTRICTIONS: CrosshairPlacementRestrictions;

    /**
     * Show a configurable crosshair
     */
    show(
      crosshair?: Partial<CrosshairData>,
      callbacks?: CrosshairCallbackData
    ): Promise<TemplateData>;

    /**
     * Show a configurable crosshair based a foundry PlaceableObject
     */
    showToken(
      obj: VisibleFoundryTypes,
      crosshair?: CrosshairData,
      callbacks?: CrosshairCallbackData
    ): Promise<TemplateData>;

    /**
     * Collect overlapping placeable objects of a crosshair of a given placeable type
     */
    collect(
      crosshair?: CrosshairsDocument,
      types?: String | Array<string>,
      filterMethod?: AnyFunction
    ): Array<Document>;
  }

  abstract class SequencerPresets {
    /**
     * Adds a preset that can then be used in sequences through .preset()
     */
    add(
      inName: string,
      inFunction: AnyFunction,
      overwrite?: boolean
    ): Map<string, AnyFunction>;

    /**
     * Retrieves all presets
     */
    getAll(): Map<string, AnyFunction>;

    /**
     * Retrieves preset based on its name
     */
    get(name: string, exact: boolean): AnyFunction;
  }

  namespace Sequencer {
    const BaseSection: AnySection;
    const Database: SequencerDatabase;
    const Presets: SequencerPresets;
    const Preloader: SequencerPreloader;
    const Helpers: SequencerHelpers;
    const DatabaseViewer: SequencerDatabaseViewer;
    const Player: SequencerEffectPlayer;
    const SectionManager: SequencerSectionManager;
    const EffectManager: SequencerEffectManager;
    const SoundManager: SequencerSoundManager;
    const Crosshair: SequencerCrosshair;

    function registerEase(
      easeName: string,
      easeFunction: (t: number) => number,
      overwrite?: boolean
    ): void;
  }
}
