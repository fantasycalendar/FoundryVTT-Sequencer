import * as lib from "../lib/lib.js";
import { is_real_number } from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";
import flagManager from "../utils/flag-manager.js";
import SequencerFileCache from "../modules/sequencer-file-cache.js";
import CONSTANTS from "../constants.js";

export default class EffectSection extends Section {
  constructor(inSequence, inFile = "") {
    super(inSequence);
    this._deserializedData = null;
    this._file = inFile;
    this._text = null;
    this._source = null;
    this._stretchTo = null;
    this._attachTo = null;
    this._from = null;
    this._anchor = null;
    this._spriteAnchor = null;
    this._randomOffset = null;
    this._missed = null;
    this._private = null;
    this._randomMirrorX = null;
    this._randomMirrorY = null;
    this._mirrorX = null;
    this._mirrorY = null;
    this._playbackRate = null;
    this._template = null;
    this._overrides = [];
    this._zIndex = null;
    this._offset = null;
    this._spriteOffset = null;
    this._size = null;
    this._persist = null;
    this._persistOptions = null;
    this._zeroSpriteRotation = null;
    this._extraEndDuration = null;
    this._noLoop = null;
    this._tilingTexture = null;
    this._snapToGrid = null;
    this._scaleToObject = null;
    this._screenSpace = null;
    this._screenSpaceAboveUI = null;
    this._screenSpaceAnchor = null;
    this._screenSpacePosition = null;
    this._screenSpaceScale = null;
    this._elevation = null;
    this._masks = [];
    this._tiedDocuments = [];
    this._selfMask = false;
    this._temporaryEffect = false;
    this._spriteRotation = 0;
    this._randomSpriteRotation = false;
    this._isRangedEffect = null;
    this._offsetLegacy = null;
    this._randomOffsetLegacy = null;
    this._aboveLighting = null;
    this._aboveInterface = null;
    this._spriteScaleMin = 1.0;
    this._spriteScaleMax = null;
    this._isometric = null;
    this._shapes = [];
    this._xray = null;
    this._playEffect = true;
  }

  static niceName = "Effect";

  /**
   * @private
   */
  get _target() {
    return this._stretchTo || this._rotateTowards || this._moveTowards || false;
  }

  static debounceWarning() {
    lib.custom_warning(
      "Sequencer",
      "Effect | This user does not have permissions to play effects. This can be configured in Sequencer's module settings."
    );
  }

  /**
   * Causes the effect to persist indefinitely on the canvas until _ended via SequencerEffectManager.endAllEffects() or
   * name the effect with .name() and then end it through SequencerEffectManager.endEffect()
   *
   * @param {Boolean} [inBool=true] inBool
   * @param {Object} [inOptions={}] inOptions
   * @returns {EffectSection}
   */
  persist(inBool = true, inOptions = {}) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "persist",
        "inBool must be of type boolean"
      );
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "persist",
        `inOptions must be of type object`
      );
    inOptions = foundry.utils.mergeObject(
      {
        id: foundry.utils.randomID(),
        persistTokenPrototype: false,
      },
      inOptions
    );
    if (typeof inOptions.persistTokenPrototype !== "boolean")
      throw this.sequence._customError(
        this,
        "persist",
        "inOptions.persistTokenPrototype must be of type boolean"
      );
    this._persist = inBool;
    this._persistOptions = inOptions;
    return this;
  }

  /**
   * Causes the effect to become temporary, which means it will not be stored in the flags of any object,
   * even if it .persist() is called
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  temporary(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "temporary",
        "inBool must be of type boolean"
      );
    this._temporaryEffect = inBool || this._temporaryEffect;
    return this;
  }

  /**
   * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
   * it play half as fast.
   *
   * @param {Number} inNumber
   * @returns {EffectSection}
   */
  playbackRate(inNumber = 1.0) {
    if (!lib.is_real_number(inNumber))
      throw this.sequence._customError(
        this,
        "playbackRate",
        "inNumber must be of type number"
      );
    this._playbackRate = inNumber;
    return this;
  }

  /**
   * Causes the effect to target a location close to the .stretchTowards() location, but not on it.
   *
   * @param {Boolean} [inBool=true] inBool
   * @returns {EffectSection}
   */
  missed(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "missed",
        "inBool must be of type boolean"
      );
    this._missed = inBool;
    return this;
  }

  /**
   * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
   * modifications of effect's data. For example, it could be manipulated to change which file will be used based
   * on the distance to the target.
   *
   * @param {Function} inFunc
   * @returns {EffectSection}
   */
  addOverride(inFunc) {
    if (!lib.is_function(inFunc))
      throw this.sequence._customError(
        this,
        "addOverride",
        "The given function needs to be an actual function."
      );
    this._overrides.push(inFunc);
    return this;
  }

  /**
   *  A smart method that can take a reference to an object, or a direct on the canvas to attach an effect to,
   *  or a string reference (see .name())
   *
   * @param {Object|String} inObject
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  attachTo(inObject, inOptions = {}) {
    if (!inObject || !(typeof inObject === "object" || typeof inObject === "string")) {
      throw this.sequence._customError(
        this,
        "attachTo",
        `inObject is invalid, and must be of type of object, string, placeable object, or document`
      );
    }
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "attachTo",
        `inOptions must be of type object`
      );
    inOptions = foundry.utils.mergeObject(
      {
        align: "center",
        edge: "on",
        bindVisibility: true,
        bindAlpha: true,
        bindElevation: true,
	      bindScale: true,
        bindRotation: true,
        offset: false,
        randomOffset: false,
        gridUnits: false,
        local: false,
      },
      inOptions
    );

    const validatedObject = this._validateLocation(inObject);
    if (validatedObject === undefined)
      throw this.sequence._customError(
        this,
        "attachTo",
        "could not find given object"
      );

    let isValidObject = true;
    if (typeof inObject === "string") {
      isValidObject =
        validatedObject instanceof Token ||
        validatedObject instanceof TokenDocument ||
        validatedObject instanceof Tile ||
        validatedObject instanceof TileDocument ||
        validatedObject instanceof Drawing ||
        validatedObject instanceof DrawingDocument ||
        validatedObject instanceof MeasuredTemplate ||
        validatedObject instanceof MeasuredTemplateDocument ||
        validatedObject instanceof CanvasEffect;
      if (!isValidObject) {
        this.sequence._showWarning(
          this,
          "attachTo",
          "Only Tokens, Tiles, Drawings, and MeasuredTemplates may have attached effects - will play effect on target's location"
        );
      }
    }

    const aligns = Object.keys(canvaslib.alignments);
    if (
      typeof inOptions.align !== "string" ||
      !aligns.includes(inOptions.align)
    ) {
      throw this.sequence._customError(
        this,
        "attachTo",
        `inOptions.align must be of type string, one of: ${aligns.join(", ")}`
      );
    }
    if (
      typeof inOptions.edge !== "string" ||
      !(
        inOptions.edge === "on" ||
        inOptions.edge === "inner" ||
        inOptions.edge === "outer"
      )
    ) {
      throw this.sequence._customError(
        this,
        "attachTo",
        `inOptions.edge must of type string with the value of either "on", "inner", or "outer"`
      );
    }
    if (typeof inOptions.bindVisibility !== "boolean")
      throw this.sequence._customError(
        this,
        "attachTo",
        `inOptions.bindVisibility must be of type boolean`
      );
		if (inOptions.followRotation !== undefined) {
			inOptions.bindRotation = inOptions.followRotation;
			this.sequence._showWarning(
				this,
				"attachTo",
				"inOptions.followRotation is deprecated, please use inOptions.bindRotation instead"
			);
		}
    if (typeof inOptions.bindRotation !== "boolean")
      throw this.sequence._customError(
        this,
        "attachTo",
        `inOptions.bindRotation must be of type boolean`
      );
    if (typeof inOptions.bindAlpha !== "boolean")
      throw this.sequence._customError(
        this,
        "attachTo",
        "inOptions.bindAlpha must be of type boolean"
      );
    if (typeof inOptions.bindElevation !== "boolean")
      throw this.sequence._customError(
        this,
        "attachTo",
        "inOptions.bindElevation must be of type boolean"
      );
    if (typeof inOptions.bindScale !== "boolean")
      throw this.sequence._customError(
        this,
        "attachTo",
        "inOptions.bindScale must be of type boolean"
      );
    if (
      !(
        typeof inOptions.randomOffset === "boolean" ||
        lib.is_real_number(inOptions.randomOffset)
      )
    )
      throw this.sequence._customError(
        this,
        "attachTo",
        "inOptions.randomOffset must be of type boolean or number"
      );

    this._source = validatedObject;

    if (inOptions.offset) {
      const offsetData = this._validateOffset(
        "attachTo",
        inOptions.offset,
        inOptions
      );
      this._offset = {
        source: offsetData,
        target: this._offset?.target ?? false,
      };
    }

    this._randomOffset = {
      source: inOptions.randomOffset,
      target: this._randomOffset?.target ?? false,
    };

    this._attachTo = {
      active: isValidObject,
      align: inOptions.align,
      edge: inOptions.edge,
      bindVisibility: inOptions.bindVisibility,
      bindAlpha: inOptions.bindAlpha,
      bindScale: inOptions.bindScale,
      bindElevation: inOptions.bindElevation,
      bindRotation: inOptions.bindRotation,
    };
    return this;
  }

  /**
   *  Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
   *  This effectively calculates the proper X scale for the effect to reach the target
   *
   * @param {Object|String} inLocation
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  stretchTo(inLocation, inOptions = {}) {
    if (!inLocation || !(typeof inLocation === "object" || typeof inLocation === "string")) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        `inLocation is invalid, and must be of type of object, string, placeable object, or document`
      );
    }
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "stretchTo",
        `inOptions must be of type object`
      );
    inOptions = foundry.utils.mergeObject(
      {
        cacheLocation: false,
        attachTo: false,
        onlyX: false,
        tiling: false,
        offset: false,
        randomOffset: false,
        gridUnits: false,
        local: false,
        requiresLineOfSight: false,
        hideLineOfSight: false,
      },
      inOptions
    );
    const validatedObject = this._validateLocation(inLocation);
    if (validatedObject === undefined)
      throw this.sequence._customError(
        this,
        "stretchTo",
        "could not find position of given object"
      );
    if (typeof inOptions.cacheLocation !== "boolean")
      throw this.sequence._customError(
        this,
        "stretchTo",
        "inOptions.cacheLocation must be of type boolean"
      );
    if (typeof inOptions.attachTo !== "boolean")
      throw this.sequence._customError(
        this,
        "stretchTo",
        "inOptions.attachTo must be of type boolean"
      );
    if (typeof inOptions.onlyX !== "boolean")
      throw this.sequence._customError(
        this,
        "stretchTo",
        "inOptions.onlyX must be of type boolean"
      );
    if (typeof inOptions.tiling !== "boolean")
      throw this.sequence._customError(
        this,
        "stretchTo",
        "inOptions.tiling must be of type boolean"
      );
    if (
      !(
        typeof inOptions.randomOffset === "boolean" ||
        lib.is_real_number(inOptions.randomOffset)
      )
    )
      throw this.sequence._customError(
        this,
        "stretchTo",
        "inOptions.randomOffset must be of type boolean or number"
      );

    if (inOptions.cacheLocation && inOptions.attachTo) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "cacheLocation and attachTo cannot both be true - pick one or the other"
      );
    }

    if (typeof inOptions.requiresLineOfSight !== "boolean") {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "requiresLineOfSight must be of type boolean"
      );
    }

    if (!inOptions.attachTo && inOptions.requiresLineOfSight) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "requiresLineOfSight requires that attachTo is true"
      );
    }

    if (typeof inOptions.hideLineOfSight !== "boolean") {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "hideLineOfSight must be of type boolean"
      );
    }

    if (!inOptions.requiresLineOfSight && inOptions.hideLineOfSight) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "hideLineOfSight requires that requiresLineOfSight is true"
      );
    }

    if (inOptions.tiling) this.tilingTexture();

    if (inOptions.offset) {
      const offsetData = this._validateOffset(
        "stretchTo",
        inOptions.offset,
        inOptions
      );
      this._offset = {
        source: this._offset?.source ?? false,
        target: offsetData,
      };
    }

    this._randomOffset = {
      source: this._randomOffset?.source ?? false,
      target: inOptions.randomOffset,
    };

    this._stretchTo = {
      target: inOptions.cacheLocation
        ? canvaslib.get_object_canvas_data(validatedObject, { measure: true })
        : validatedObject,
      attachTo: inOptions.attachTo,
      onlyX: inOptions.onlyX,
      requiresLineOfSight: inOptions.requiresLineOfSight,
      hideLineOfSight: inOptions.hideLineOfSight,
    };

    return this;
  }

  /**
   * Sets the location to rotate the object to
   *
   * @param {object|string} inLocation
   * @param {object} inOptions
   * @returns this
   */
  rotateTowards(inLocation, inOptions = {}) {
    if (!inLocation || !(typeof inLocation === "object" || typeof inLocation === "string")) {
      throw this.sequence._customError(
        this,
        "inLocation",
        `inLocation is invalid, and must be of type of object, string, placeable object, or document`
      );
    }
    inOptions = foundry.utils.mergeObject(
      {
        rotationOffset: 0,
        cacheLocation: false,
        attachTo: false,
        offset: false,
        randomOffset: false,
        local: false,
        gridUnits: false,
      },
      inOptions
    );
    if (!lib.is_real_number(inOptions.rotationOffset))
      throw this.sequence._customError(
        this,
        "rotateTowards",
        "inOptions.rotationOffset must be of type number"
      );
    if (typeof inOptions.attachTo !== "boolean")
      throw this.sequence._customError(
        this,
        "rotateTowards",
        "inOptions.attachTo must be of type boolean"
      );
    if (typeof inOptions.cacheLocation !== "boolean")
      throw this.sequence._customError(
        this,
        "rotateTowards",
        "inOptions.cacheLocation must be of type boolean"
      );
    const validatedObject = this._validateLocation(inLocation);
    if (!validatedObject)
      throw this.sequence._customError(
        this,
        "rotateTowards",
        "could not find position of given object"
      );

    if (inOptions.offset) {
      const offsetData = this._validateOffset(
        "attachTo",
        inOptions.offset,
        inOptions
      );
      this._offset = {
        source: offsetData,
        target: this._offset?.target ?? false,
      };
    }

    this._randomOffset = {
      source: inOptions.randomOffset,
      target: this._randomOffset?.target ?? false,
    };

    this._rotateTowards = {
      target: inOptions.cacheLocation
        ? canvaslib.get_object_canvas_data(validatedObject, { measure: true })
        : validatedObject,
      rotationOffset: inOptions.rotationOffset,
      cacheLocation: inOptions.cacheLocation,
      attachTo: inOptions.attachTo,
    };

    return this;
  }

  /**
   *  Create an effect based on the given object, effectively copying the object as an effect. Useful when you want to do some effect magic on tokens or tiles.
   *
   * @param {Object} inObject
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  from(inObject, inOptions = {}) {
    if (
      !(
        inObject instanceof Token ||
        inObject instanceof Tile ||
        inObject instanceof TokenDocument ||
        inObject instanceof TileDocument
      )
    ) {
      throw this.sequence._customError(
        this,
        "from",
        "inObject must be of type Token, Tile, TokenDocument, or TileDocument"
      );
    }
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "from",
        `inOptions must be of type object`
      );
    inObject = inObject.document ?? inObject;
    if (!inObject?.texture?.src)
      throw this.sequence._customError(
        this,
        "from",
        "could not find the image for the given object"
      );
    inOptions = foundry.utils.mergeObject(
      {
        cacheLocation: false,
        offset: false,
        randomOffset: false,
        local: false,
        gridUnits: false,
      },
      inOptions
    );
    if (typeof inOptions.cacheLocation !== "boolean")
      throw this.sequence._customError(
        this,
        "from",
        "inOptions.cacheLocation must be of type boolean"
      );
    if (
      !(
        typeof inOptions.randomOffset === "boolean" ||
        lib.is_real_number(inOptions.randomOffset)
      )
    )
      throw this.sequence._customError(
        this,
        "from",
        "inOptions.randomOffset must be of type boolean or number"
      );

    if (inOptions.offset) {
      const offsetData = this._validateOffset(
        "attachTo",
        inOptions.offset,
        inOptions
      );
      this._offset = {
        source: offsetData,
        target: this._offset?.target ?? false,
      };
    }

    this._randomOffset = {
      source: inOptions.randomOffset,
      target: this._randomOffset?.target ?? false,
    };

    this._from = {
      object: inObject,
      options: inOptions,
    };
    return this;
  }

  shape(inType, inOptions = {}) {
    if (typeof inType !== "string")
      throw this.sequence._customError(
        this,
        "shape",
        "type must be of type string"
      );

    if (!Object.values(CONSTANTS.SHAPES).includes(inType)) {
      throw this.sequence._customError(
        this,
        "shape",
        "type must be one of: " + Object.values(CONSTANTS.SHAPES).join(", ")
      );
    }

    if (inType === CONSTANTS.SHAPES.POLY) {
      if (!Array.isArray(inOptions.points)) {
        throw this.sequence._customError(
          this,
          "shape",
          "if creating polygon, inOptions.points must be of type array"
        );
      }
      inOptions.points = inOptions.points.map((point) => {
        if (Array.isArray(point)) {
          if (!is_real_number(point[0]) || !is_real_number(point[1])) {
            throw this.sequence._customError(
              this,
              "shape",
              "inOptions.points must be an array, containing an array of two numbers or objects with x and y number properties"
            );
          }
          return point;
        }
        if (typeof point === "object") {
          if (!is_real_number(point?.x) || !is_real_number(point?.y)) {
            throw this.sequence._customError(
              this,
              "shape",
              "inOptions.points must be an array, containing an array of two numbers or objects with x and y number properties"
            );
          }
          return [point.x, point.y];
        }
      });
    } else if (inType === CONSTANTS.SHAPES.CIRC) {
      if (typeof inOptions.radius !== "number") {
        throw this.sequence._customError(
          this,
          "shape",
          "if creating circle, inOptions.radius must be of type number"
        );
      }
    } else if (
      inType === CONSTANTS.SHAPES.RECT ||
      inType === CONSTANTS.SHAPES.RREC ||
      inType === CONSTANTS.SHAPES.ELIP
    ) {
      if (inOptions.width ^ inOptions.height) {
        inOptions.width = inOptions.width ?? inOptions.height;
        inOptions.height = inOptions.height ?? inOptions.width;
      }
      if (typeof inOptions.width !== "number") {
        throw this.sequence._customError(
          this,
          "shape",
          `if creating rectangle, rounded rectangle, or an ellipse, inOptions.width must be of type number`
        );
      }
      if (typeof inOptions.height !== "number") {
        throw this.sequence._customError(
          this,
          "shape",
          "if creating rectangle, rounded rectangle, or an ellipse, inOptions.height must be of type number"
        );
      }
      if (
        inType === CONSTANTS.SHAPES.RREC &&
        typeof inOptions.radius !== "number"
      ) {
        throw this.sequence._customError(
          this,
          "shape",
          "if creating rounded border rectangle, inOptions.radius must be of type number"
        );
      }
    }

    if (
      inOptions.gridUnits !== undefined &&
      typeof inOptions.gridUnits !== "boolean"
    ) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.gridUnits must be of type boolean"
      );
    }

    if (inOptions.name && typeof inOptions.name !== "string") {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.name must be of type string"
      );
    }

    if (
      inOptions.fillColor &&
      !is_real_number(inOptions.fillColor) &&
      typeof inOptions.fillColor !== "string"
    ) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.fillColor must be of type string (hexadecimal) or number (decimal)"
      );
    } else {
      inOptions.fillColor = lib.parseColor(inOptions.fillColor).decimal;
    }

    if (inOptions.fillAlpha && !is_real_number(inOptions.fillAlpha)) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.fillAlpha must be of type number"
      );
    }

    if (inOptions.alpha && !is_real_number(inOptions.alpha)) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.alpha must be of type number"
      );
    }

    if (inOptions.lineSize && !is_real_number(inOptions.lineSize)) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.lineSize must be of type number"
      );
    }

    if (
      inOptions.lineColor &&
      !is_real_number(inOptions.lineColor) &&
      typeof inOptions.lineColor !== "string"
    ) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.lineColor must be of type string (hexadecimal) or number (decimal)"
      );
    } else {
      inOptions.lineColor = lib.parseColor(inOptions.lineColor).decimal;
    }

    if (inOptions.offset) {
      inOptions.offset = this._validateOffset(
        "shape",
        inOptions.offset,
        inOptions.offset
      );
    }

    if (
      inOptions.texture !== undefined &&
      typeof inOptions.texture !== "string"
    ) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.texture must be of type string"
      );
    }

    if (
      inOptions.isMask !== undefined &&
      typeof inOptions.isMask !== "boolean"
    ) {
      throw this.sequence._customError(
        this,
        "shape",
        "inOptions.isMask must be of type boolean"
      );
    }

    this._shapes.push({
      ...inOptions,
      type: inType,
    });

    return this;
  }

  /**
   *  Causes the effect's sprite to be offset relative to its location based on a given vector
   *
   * @param {Object} inOffset
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  spriteOffset(inOffset, inOptions = {}) {
    if (inOffset === undefined)
      throw this.sequence._customError(
        this,
        "spriteOffset",
        "inOffset must not be undefined"
      );
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "spriteOffset",
        "options must be of type object"
      );
    this._spriteOffset = this._validateOffset(
      "spriteOffset",
      inOffset,
      inOptions
    );
    return this;
  }

  /**
   * Causes the final effect location to be snapped to the grid
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  snapToGrid(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "snapToGrid",
        "inBool must be of type boolean"
      );
    this._snapToGrid = inBool;
    return this;
  }

  /**
   * Causes the effect to be scaled to the target object's width
   *
   * @param {Number} inScale
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  scaleToObject(inScale = 1.0, inOptions = {}) {
    if (!lib.is_real_number(inScale))
      throw this.sequence._customError(
        this,
        "scaleToObject",
        `inScale must be of type number!`
      );
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "scaleToObject",
        "inOptions must be of type object"
      );
    inOptions = foundry.utils.mergeObject(
      {
        scale: inScale,
        considerTokenScale: false,
        uniform: false
      },
      inOptions
    );
    if (typeof inOptions.considerTokenScale !== "boolean")
      throw this.sequence._customError(
        this,
        "scaleToObject",
        "inOptions.considerTokenScale must be of type boolean"
      );
    if (typeof inOptions.uniform !== "boolean")
      throw this.sequence._customError(
        this,
        "scaleToObject",
        "inOptions.uniform must be of type boolean"
      );
    this._scaleToObject = inOptions;
    return this;
  }

  /**
   * Sets the width and the height of the effect in pixels, this size is set before any scaling
   *
   * @param {Number|Object<{width: {Number}, height: {Number}}>} inSize
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  size(inSize, inOptions = {}) {
    if (!lib.is_real_number(inSize) && typeof inSize !== "object")
      throw this.sequence._customError(
        this,
        "size",
        "inSize must be of type number or object"
      );
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "size",
        "inOptions must be of type object"
      );
    if (lib.is_real_number(inSize)) {
      inSize = {
        width: inSize,
        height: inSize,
      };
    }

    if ((inSize.width === undefined) ^ (inSize.height === undefined)) {
      if (inSize.width) {
        if (!lib.is_real_number(inSize.width))
          throw this.sequence._customError(
            this,
            "size",
            "inSize.width must be of type number or string 'auto'"
          );
        inSize["height"] = "auto";
      } else {
        if (!lib.is_real_number(inSize.height))
          throw this.sequence._customError(
            this,
            "size",
            "inSize.height must be of type number or string 'auto'"
          );
        inSize["width"] = "auto";
      }
    }

    inOptions = foundry.utils.mergeObject(
      {
        gridUnits: false,
      },
      inOptions
    );

    if (!lib.is_real_number(inSize.width) && inSize.width !== "auto")
      throw this.sequence._customError(
        this,
        "size",
        "inSize.width must be of type number or string 'auto'"
      );
    if (!lib.is_real_number(inSize.height) && inSize.height !== "auto")
      throw this.sequence._customError(
        this,
        "size",
        "inSize.height must be of type number or string 'auto'"
      );
    if (typeof inOptions.gridUnits !== "boolean")
      throw this.sequence._customError(
        this,
        "size",
        "inOptions.gridUnits must be of type boolean"
      );

    this._size = {
      width: inSize.width ?? canvas.grid.size,
      height: inSize.height ?? canvas.grid.size,
      ...inOptions,
    };
    return this;
  }

  /**
   *  This scales the sprite of the effect, and this method can take the following:
   *  - A number to set the scale uniformly
   *  - An object with x and y for non-uniform scaling
   *  - Two numbers which the Sequencer will randomly pick a uniform scale between
   *
   * @param {number|object} inScaleMin
   * @param {number} [inScaleMax] inScaleMax
   * @returns this
   */
  spriteScale(inScaleMin, inScaleMax) {
    if (!lib.is_real_number(inScaleMin) && typeof inScaleMin !== "object")
      throw this.sequence._customError(
        this,
        "spriteScale",
        "inScale must be of type number or object"
      );
    if (lib.is_real_number(inScaleMin)) {
      if (inScaleMax && !lib.is_real_number(inScaleMax)) {
        throw this.sequence._customError(
          this,
          "spriteScale",
          "if inScaleMin is a number, inScaleMax must also be of type number"
        );
      }
    }
    this._spriteScaleMin = inScaleMin;
    this._spriteScaleMax = inScaleMax ?? false;
    return this;
  }

  /**
   * This defines the internal padding of this effect. Gridsize determines the internal grid size of this effect which will determine how big it is on the canvas
   * relative to the canvas's grid size. Start and end point defines padding at the left and right of the effect
   *
   * @param {Number} gridSize
   * @param {Number} startPoint
   * @param {Number} endPoint
   * @returns {EffectSection}
   */
  template({ gridSize, startPoint, endPoint } = {}) {
    if (gridSize && !lib.is_real_number(gridSize))
      throw this.sequence._customError(
        this,
        "template",
        "gridSize must be of type number"
      );
    if (startPoint && !lib.is_real_number(startPoint))
      throw this.sequence._customError(
        this,
        "template",
        "startPoint must be of type number"
      );
    if (endPoint && !lib.is_real_number(endPoint))
      throw this.sequence._customError(
        this,
        "template",
        "endPoint must be of type number"
      );
    if (!gridSize && !startPoint && !endPoint)
      throw this.sequence._customError(
        this,
        "template",
        "You need to define at least one parameter!"
      );
    if (!this._template) this._template = {};
    if (gridSize) this._template["gridSize"] = gridSize;
    if (startPoint) this._template["startPoint"] = startPoint;
    if (endPoint) this._template["endPoint"] = endPoint;
    return this;
  }

  /**
   * This makes the texture of the effect tile, effectively repeat itself within the sprite's dimensions
   *
   * @param {Object|Number} scale
   * @param {Object} position
   * @returns {EffectSection}
   */
  tilingTexture(scale = { x: 1.0, y: 1.0 }, position = { x: 0, y: 0 }) {
    if (lib.is_real_number(scale)) {
      scale = { x: scale, y: scale };
    }

    scale = { x: scale?.x ?? 1.0, y: scale?.y ?? 1.0 };

    if (!lib.is_real_number(scale.x))
      throw this.sequence._customError(
        this,
        "tilingTexture",
        `scale.x must be of type number!`
      );
    if (!lib.is_real_number(scale.y))
      throw this.sequence._customError(
        this,
        "tilingTexture",
        `scale.y must be of type number!`
      );

    position = { x: position?.x ?? 0, y: position?.y ?? 0 };

    if (!lib.is_real_number(position.x))
      throw this.sequence._customError(
        this,
        "tilingTexture",
        `position.x must be of type number!`
      );
    if (!lib.is_real_number(position.y))
      throw this.sequence._customError(
        this,
        "tilingTexture",
        `position.y must be of type number!`
      );

    this._tilingTexture = {
      scale,
      position,
    };

    return this;
  }

  /**
   *  Anchors the sprite's container according to the given x and y coordinates, or uniformly based on a single number
   *
   * @param {Number|Object} inAnchor
   * @returns {EffectSection}
   */
  anchor(inAnchor) {
    if (lib.is_real_number(inAnchor)) {
      inAnchor = {
        x: inAnchor,
        y: inAnchor,
      };
    }

    inAnchor = {
      x: inAnchor?.x ?? 0.5,
      y: inAnchor?.y ?? 0.5,
    };

    if (!lib.is_real_number(inAnchor.x))
      throw this.sequence._customError(
        this,
        "anchor",
        `inAnchor.x must be of type number!`
      );
    if (!lib.is_real_number(inAnchor.y))
      throw this.sequence._customError(
        this,
        "anchor",
        `inAnchor.y must be of type number!`
      );

    this._anchor = inAnchor;
    return this;
  }

  /**
   *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
   *
   * @param {Number|Object} inAnchor
   * @returns {EffectSection}
   */
  spriteAnchor(inAnchor) {
    if (lib.is_real_number(inAnchor)) {
      inAnchor = {
        x: inAnchor,
        y: inAnchor,
      };
    }

    inAnchor = {
      x: inAnchor?.x ?? 0.5,
      y: inAnchor?.y ?? 0.5,
    };

    if (!lib.is_real_number(inAnchor.x))
      throw this.sequence._customError(
        this,
        "anchor",
        `inAnchor.x must be of type number!`
      );
    if (!lib.is_real_number(inAnchor.y))
      throw this.sequence._customError(
        this,
        "anchor",
        `inAnchor.y must be of type number!`
      );

    this._spriteAnchor = inAnchor;
    return this;
  }

  /**
   *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
   *
   *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
   *  outermost edge of the location the sprite is played at
   *
   * @returns {EffectSection}
   */
  center() {
    this.anchor(0.5);
    return this;
  }

  /**
   * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
   * become 1 or -1, effectively mirroring the sprite on its horizontal axis
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  randomizeMirrorX(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "randomizeMirrorX",
        "inBool must be of type boolean"
      );
    this._randomMirrorX = inBool;
    return this;
  }

  /**
   * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
   * become 1 or -1, effectively mirroring the sprite on its vertical axis
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  randomizeMirrorY(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "randomizeMirrorY",
        "inBool must be of type boolean"
      );
    this._randomMirrorY = inBool;
    return this;
  }

  /**
   * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become 1 or -1, effectively
   * mirroring the sprite on its horizontal axis
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  mirrorX(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "mirrorX",
        "inBool must be of type boolean"
      );
    this._mirrorX = inBool;
    return this;
  }

  /**
   * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become 1 or -1, effectively
   * mirroring the sprite on its vertical axis
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  mirrorY(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "mirrorY",
        "inBool must be of type boolean"
      );
    this._mirrorY = inBool;
    return this;
  }

  /**
   * Causes the effect to play beneath most tokens
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  belowTokens(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "belowTokens",
        "inBool must be of type boolean"
      );
    if (!inBool) return this;
    return this.elevation(0, { absolute: true });
  }

  /**
   * Causes the effect to play beneath most tiles
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  belowTiles(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "belowTokens",
        "inBool must be of type boolean"
      );
    if (!inBool) return this;
    return this.elevation(-1, { absolute: true });
  }

  /**
   * Causes the effect to be played on top of the vision mask
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  aboveLighting(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "aboveLighting",
        "inBool must be of type boolean"
      );
    this._aboveLighting = inBool;
    return this;
  }

  /**
   * Causes the effect to be played on top of interface
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  aboveInterface(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "aboveInterface",
        "inBool must be of type boolean"
      );
    this._aboveInterface = inBool;
    return this;
  }

  /**
   * Changes the effect's elevation
   *
   * @param {Number} inElevation
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  elevation(inElevation, inOptions = {}) {
    if (typeof inElevation !== "number")
      throw this.sequence._customError(
        this,
        "elevation",
        "inElevation must be of type number"
      );
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "elevation",
        `inOptions must be of type object`
      );

    inOptions = foundry.utils.mergeObject(
      {
        elevation: 1,
        absolute: false,
      },
      inOptions
    );

    if (typeof inOptions.absolute !== "boolean")
      throw this.sequence._customError(
        this,
        "elevation",
        "inOptions.absolute must be of type boolean"
      );
    this._elevation = {
      elevation: inElevation,
      absolute: inOptions.absolute,
    };
    return this;
  }

  /**
   * Sets the zIndex of the effect, potentially displaying it on top of other effects the same elevation
   *
   * @param {Number} inZIndex
   * @returns {EffectSection}
   */
  zIndex(inZIndex) {
    if (!lib.is_real_number(inZIndex))
      throw this.sequence._customError(
        this,
        "zIndex",
        "inZIndex must be of type number"
      );
    this._zIndex = inZIndex;
    return this;
  }

  /**
   * This method only modifies .persist()ed effects and causes them to not immediately end, but stick around for the given duration passed to this method.
   *
   * @param {Number} inExtraDuration
   * @returns {EffectSection}
   */
  extraEndDuration(inExtraDuration) {
    if (!lib.is_real_number(inExtraDuration))
      throw this.sequence._customError(
        this,
        "extraEndDuration",
        "inExtraDuration must be of type number"
      );
    this._extraEndDuration = inExtraDuration;
    return this;
  }

  /**
   * Rotates the sprite
   *
   * @param {Number} inAngle
   * @returns {EffectSection}
   */
  spriteRotation(inAngle) {
    if (!lib.is_real_number(inAngle))
      throw this.sequence._customError(
        this,
        "spriteRotation",
        "inAngle must be of type number"
      );
    this._spriteRotation = inAngle;
    return this;
  }

  /**
   * Rotates the sprite
   *
   * @param {Boolean} inBool
   * @returns {EffectSection}
   */
  randomSpriteRotation(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "randomSpriteRotation",
        "inBool must be of type boolean"
      );
    this._randomSpriteRotation = inBool;
    return this;
  }

  /**
   * Causes the effect to not rotate should its container rotate
   *
   * @param {Boolean} [inBool=true] inBool
   * @returns {EffectSection}
   */
  zeroSpriteRotation(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "zeroSpriteRotation",
        "inBool must be of type boolean"
      );
    this._zeroSpriteRotation = inBool;
    return this;
  }

  /**
   * If the effect would loop due to its duration or persistence, this causes it not to
   *
   * @param {Boolean} [inBool=true] inBool
   * @returns {EffectSection}
   */
  noLoop(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "noLoop",
        "inBool must be of type boolean"
      );
    this._noLoop = inBool;
    return this;
  }

  /**
   * Causes the effect to not show up in the Effect Manager UI - DO NOT USE UNLESS YOU KNOW WHAT YOU ARE DOING
   *
   * @param inBool
   * @returns {EffectSection}
   */
  private(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "private",
        "inBool must be of type boolean"
      );
    this._private = inBool;
    return this;
  }

  /**
   * Causes the effect to be played in screen space instead of world space (where tokens are)
   *
   * @param {Boolean} [inBool=true] inBool
   * @returns {EffectSection}
   */
  screenSpace(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpace",
        "inBool must be of type boolean"
      );
    this._screenSpace = inBool;
    this._screenSpaceAnchor = this._screenSpaceAnchor ?? { x: 0.5, y: 0.5 };
    return this;
  }

  /**
   * Causes the effect to be played above all of the UI elements
   *
   * @param {Boolean} [inBool=true] inBool
   * @returns {EffectSection}
   */
  screenSpaceAboveUI(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpaceAboveUI",
        "inBool must be of type boolean"
      );
    this._screenSpaceAboveUI = inBool;
    return this;
  }

  /**
   *  Positions the effect in a screen space position, offset from its .screenSpaceAnchor()
   *
   * @param {Object} inPosition
   * @returns {EffectSection}
   */
  screenSpacePosition(inPosition) {
    inPosition = {
      x: inPosition?.x ?? 0,
      y: inPosition?.y ?? 0,
    };
    if (!lib.is_real_number(inPosition.x))
      throw this.sequence._customError(
        this,
        "screenSpacePosition",
        `inPosition.x must be of type number!`
      );
    if (!lib.is_real_number(inPosition.y))
      throw this.sequence._customError(
        this,
        "screenSpacePosition",
        `inPosition.y must be of type number!`
      );
    this._screenSpacePosition = inPosition;
    return this;
  }

  /**
   *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number in screen space
   *
   * @param {Number|Object} inAnchor
   * @returns {EffectSection}
   */
  screenSpaceAnchor(inAnchor) {
    if (lib.is_real_number(inAnchor)) {
      inAnchor = {
        x: inAnchor,
        y: inAnchor,
      };
    }

    inAnchor = {
      x: inAnchor?.x ?? 0.5,
      y: inAnchor?.y ?? 0.5,
    };

    if (!lib.is_real_number(inAnchor.x))
      throw this.sequence._customError(
        this,
        "screenSpaceAnchor",
        `inAnchor.x must be of type number!`
      );
    if (!lib.is_real_number(inAnchor.y))
      throw this.sequence._customError(
        this,
        "screenSpaceAnchor",
        `inAnchor.y must be of type number!`
      );

    this._screenSpaceAnchor = inAnchor;
    return this;
  }

  /**
   *  Sets up various properties relating to scale of the effect on the screen
   *
   * @param {Object} inOptions
   * @returns {EffectSection}
   */
  screenSpaceScale(inOptions) {
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        `inOptions must be of type object`
      );

    inOptions = foundry.utils.mergeObject(
      {
        x: 1.0,
        y: 1.0,
        fitX: false,
        fitY: false,
        ratioX: false,
        ratioY: false,
      },
      inOptions
    );

    if (!lib.is_real_number(inOptions.x))
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        `inOptions.x must be of type number!`
      );
    if (!lib.is_real_number(inOptions.y))
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        `inOptions.y must be of type number!`
      );
    if (typeof inOptions.fitX !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        "inOptions.fitX must be of type boolean"
      );
    if (typeof inOptions.fitY !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        "inOptions.fitY must be of type boolean"
      );
    if (typeof inOptions.ratioX !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        "inOptions.ratioX must be of type boolean"
      );
    if (typeof inOptions.ratioY !== "boolean")
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        "inOptions.ratioY must be of type boolean"
      );

    if (inOptions.ratioX && inOptions.ratioY)
      throw this.sequence._customError(
        this,
        "screenSpaceScale",
        "both ratioX and ratioY cannot be true, one axis must fit or be set directly"
      );

    this._screenSpaceScale = inOptions;

    return this;
  }

  /**
   * Ties the effect to any number of documents in Foundry - if those get deleted, the effect is ended.
   *
   * @param {String|PlaceableObject|foundry.abstract.Document|Array<String|PlaceableObject|foundry.abstract.Document>} inDocuments
   * @returns {EffectSection}
   */
  tieToDocuments(inDocuments) {
    if (!Array.isArray(inDocuments)) {
      inDocuments = [inDocuments];
    }
    for (let doc of inDocuments) {
      if (
        typeof doc !== "string" &&
        !(doc instanceof PlaceableObject) &&
        !(doc instanceof foundry.abstract.Document)
      ) {
        throw this.sequence._customError(
          this,
          "tieToDocument",
          "inOrigin must be of type string, PlaceableObject, or Document, or an array thereof"
        );
      }
      if (typeof doc === "string") {
        const obj = fromUuidSync(doc);
        if (!obj)
          throw this.sequence._customError(
            this,
            "tieToDocument",
            `could not find document with UUID "${doc}"`
          );
      } else {
        doc = lib.validate_document(doc);
        if (doc instanceof foundry.abstract.Document) {
          doc = doc?.uuid;
          if (!doc)
            throw this.sequence._customError(
              this,
              "tieToDocument",
              "could not find the UUID for the given object"
            );
        }
      }
      this._tiedDocuments.push(doc);
    }
    return this;
  }

  /**
   *  Masks the effect to the given object or objects. If no object is given, the effect will be masked to the source
   *  of the effect.
   *
   * @param {Token/TokenDocument/Tile/TileDocument/Drawing/DrawingDocument/MeasuredTemplate/MeasuredTemplateDocument/Array} inObject
   * @returns {Section}
   */
  mask(inObject) {
    if (!inObject) {
      this._selfMask = true;
      return this;
    }

    if (Array.isArray(inObject)) {
      for (let obj of inObject) {
        this.mask(obj);
      }
      return this;
    }

    const validatedObject = this._validateLocation(inObject);

    const isValidObject =
      validatedObject instanceof TokenDocument ||
      validatedObject instanceof TileDocument ||
      validatedObject instanceof DrawingDocument ||
      validatedObject instanceof MeasuredTemplateDocument;
    if (!isValidObject) {
      throw this.sequence._customError(
        this,
        "mask",
        "A foundry object was provided, but only Tokens, Tiles, Drawings, and MeasuredTemplates may be used to create effect masks"
      );
    }

    this._masks.push(lib.get_object_identifier(validatedObject));

    return this;
  }

  /**
   * Causes the effect to be visible through walls
   *
   * @param inBool
   * @returns {EffectSection}
   */
  xray(inBool = true) {
    if (typeof inBool !== "boolean")
      throw this.sequence._customError(
        this,
        "xray",
        "inBool must be of type boolean"
      );
    this._xray = inBool;
    return this;
  }

  /**
   * Configures the isometric configuration of this effect
   *
   * @param inOptions
   * @returns {EffectSection}
   */
  isometric(inOptions = {}) {
    if (typeof inOptions !== "object")
      throw this.sequence._customError(
        this,
        "isometric",
        `inOptions must be of type object`
      );
    inOptions = foundry.utils.mergeObject(
      {
        overlay: false,
      },
      inOptions
    );
    if (typeof inOptions?.overlay !== "boolean")
      throw this.sequence._customError(
        this,
        "isometric",
        "inOptions.overlay must be of type boolean"
      );
    this._isometric = inOptions;
    return this;
  }

  /**
   * @private
   */
  _expressWarnings() {
    if (this._stretchTo && this._anchor?.x) {
      this.sequence._showWarning(
        this,
        "stretchTo",
        "you have called .stretchTo() and .anchor() - stretchTo will manually set the X axis of the anchor and may not behave like you expect.",
        true
      );
    }
    if (this._stretchTo && this._scaleToObject) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "You're trying to stretch towards an object, while scaling to fit another??? Make up your mind!"
      );
    }
    if (this._stretchTo && this._randomRotation) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "You're trying to stretch towards an object, while trying to randomly rotate the effect? What?"
      );
    }
    if (this._stretchTo && this._moveTowards) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "You're trying to stretch towards an object, while moving towards it? You're insane."
      );
    }
    if (
      this._attachTo &&
      this._stretchTo?.attachTo &&
      (this._startTime || this._endTime) &&
      this._isRangedEffect
    ) {
      throw this.sequence._customError(
        this,
        "stretchTo",
        "Dual-attached range-finding effects combined while using any of the time methods is stable - modern web browsers cannot handle it and it may crash them, so this feature has been disabled."
      );
    }

    const source = this._getSourceObject();
    const target = this._getTargetObject();

    if (
      !this._screenSpace &&
      this._persistOptions?.persistTokenPrototype &&
      this._masks.filter((uuid) => uuid !== source).length > 0
    ) {
      this.sequence._showWarning(
        this,
        "persist",
        "You have applied persistTokenPrototype with multiple masks from objects in the scene - these will not be persisted across scenes!",
        true
      );
    }

    if (!source && !target && !this._screenSpace) {
      throw this.sequence._customError(
        this,
        "play",
        "Could not determine where to play the effect!"
      );
    }
  }

  /**
   * @OVERRIDE
   */
  async preRun() {
    if (this._from) {
      this._file = this._file || this._from.object?.texture?.src;

      if (this._source === null) {
        this._source = this._validateLocation(this._from.object);
      }

      if (this._size === null) {
        const size = canvaslib.get_object_dimensions(this._from.object);
        this._size = {
          width: size?.width ?? canvas.grid.size,
          height: size?.height ?? canvas.grid.size,
          gridUnits: false,
        };
      }

      if (
        this._mirrorX === null &&
        (this._from.object.mirrorX ||
          (this._from.object?.tile && this._from.object?.tile.scale.x < 0))
      ) {
        this._mirrorX = true;
      }

      if (
        this._mirrorY === null &&
        (this._from.object.mirrorY ||
          (this._from.object?.tile && this._from.object?.tile.scale.y < 0))
      ) {
        this._mirrorY = true;
      }

      if (this._angle === null && this._from.object?.rotation) {
        this._angle = -this._from.object.rotation;
      }

      this._randomOffset = {
        source: this._randomOffset?.source ?? this._from.options.randomOffset,
        target: this._randomOffset?.target ?? false,
      };
    }
  }

  /**
   * @OVERRIDE
   * @returns {Promise<void>}
   */
  async run() {
    if (!lib.user_can_do("permissions-effect-create") || !this._playEffect) {
      if (!lib.user_can_do("permissions-effect-create")) {
	      foundry.utils.debounce(EffectSection.debounceWarning, 1000);
      }
      return new Promise((resolve) => {
        resolve();
      });
    }
    if (!this._deserializedData) this._expressWarnings();
    const data = await this._sanitizeEffectData();
    if (Hooks.call("preCreateSequencerEffect", data) === false) return;
    let push =
      !(data?.users?.length === 1 && data?.users?.includes(game.userId)) &&
      !this.sequence.localOnly;
    let canvasEffectData = await Sequencer.EffectManager.play(data, push);
    let totalDuration = this._currentWaitTime;
    if (this._persist) {
      totalDuration += await canvasEffectData.promise;
    } else {
      totalDuration += await canvasEffectData.duration;
    }
    await new Promise((resolve) => setTimeout(resolve, totalDuration));
  }

  /**
   * @private
   */
  _applyTraits() {
    Object.assign(this.constructor.prototype, traits.files);
    Object.assign(this.constructor.prototype, traits.audio);
    Object.assign(this.constructor.prototype, traits.moves);
    Object.assign(this.constructor.prototype, traits.opacity);
    Object.assign(this.constructor.prototype, traits.rotation);
    Object.assign(this.constructor.prototype, traits.scale);
    Object.assign(this.constructor.prototype, traits.time);
    Object.assign(this.constructor.prototype, traits.users);
    Object.assign(this.constructor.prototype, traits.animation);
    Object.assign(this.constructor.prototype, traits.filter);
    Object.assign(this.constructor.prototype, traits.tint);
    Object.assign(this.constructor.prototype, traits.location);
    Object.assign(this.constructor.prototype, traits.offset);
    Object.assign(this.constructor.prototype, traits.text);
    Object.assign(this.constructor.prototype, traits.name);
  }

  /**
   * @private
   */
  async _initialize() {
    if (this._name) {
      if (!this.sequence.nameOffsetMap) {
        this.sequence.nameOffsetMap = {};
      }

      if (!this.sequence.nameOffsetMap[this._name]) {
        const source = this._getSourceObject();
        const target = this._getTargetObject();

        if (this._offsetLegacy && !this._offset) {
          this._offset = {
            source: !target ? this._offsetLegacy : false,
            target: !!target ? this._offsetLegacy : false,
          };
        }

        if (this._randomOffsetLegacy && !this._randomOffset) {
          this._randomOffset = {
            source: !target ? this._randomOffsetLegacy : false,
            target: !!target ? this._randomOffsetLegacy : false,
          };
        }

        this.sequence.nameOffsetMap[this._name] = {
          seed: `${this._name}-${foundry.utils.randomID()}`,
          source: source,
          target: target,
          randomOffset: this._randomOffset,
          missed: this._missed,
          offset: this._offset,
          repetitions: this._repetitions,
          twister: {},
        };
      }
    }

    if (
      !this._file &&
      !this._from &&
      !this._text &&
      !this._shapes.length &&
      this.sequence.softFail
    ) {
      this._playEffect = false;
      return;
    }

    let fileData = this._file
      ? await this._determineFile(this._file)
      : {
          file: this._file,
          forcedIndex: false,
          customRange: false,
        };

    this._isRangedEffect = fileData?.file?.rangeFind;

    if (fileData.customRange || fileData.file?.dbPath) return;

    let exists = false;
    try {
      exists = await SequencerFileCache.srcExists(fileData.file);
    } catch (err) {}

    if (!exists) {
      if (this.sequence.softFail) {
        this._playEffect = false;
        return;
      }
      throw this.sequence._customError(
        this,
        "Play",
        `Could not find file:<br>${fileData.file}`
      );
    }
  }

  /**
   * @private
   */
  _getSourceObject() {
    if (!this._source || typeof this._source !== "object") return this._source;
    if (this._source?.cachedLocation || !this._attachTo) {
      return canvaslib.get_object_canvas_data(this._source);
    }
    return (
      lib.get_object_identifier(this._source) ??
      canvaslib.get_object_canvas_data(this._source)
    );
  }

  /**
   * @private
   */
  _getTargetObject() {
    if (!this._target?.target) return this._target;
    if (typeof this._target.target !== "object") return this._target.target;
    if (
      this._target?.target?.cachedLocation ||
      !(this._stretchTo?.attachTo || this._rotateTowards?.attachTo)
    ) {
      return canvaslib.get_object_canvas_data(this._target.target, true);
    }
    return (
      lib.get_object_identifier(this._target.target) ??
      canvaslib.get_object_canvas_data(this._target.target, true)
    );
  }

  /**
   * @private
   */
  async _sanitizeEffectData() {
    if (this._deserializedData) {
      this._deserializedData.creationTimestamp = +new Date();
      this._deserializedData.remote = true;
      return this._deserializedData;
    }

    const { file, forcedIndex, customRange } =
      this._file && this._playEffect
        ? await this._determineFile(this._file)
        : {
            file: this._file,
            forcedIndex: false,
            customRange: false,
          };

    const source = this._getSourceObject();
    const target = this._getTargetObject();

	  this._temporaryEffect =
		  this._temporaryEffect ||
		  (source instanceof foundry.abstract.Document ||
		  source instanceof MeasuredTemplate
			  ? !lib.is_UUID(source?.uuid)
			  : this._temporaryEffect || false);

    if (this._offsetLegacy) {
      this._offset = {
        source:
          !target && this._offset?.source
            ? this._offsetLegacy
            : this._offset?.source,
        target:
          !!target && this._offset?.target
            ? this._offsetLegacy
            : this._offset?.target,
      };
    }

    if (this._randomOffsetLegacy) {
      this._randomOffset = {
        source:
          !target && this._randomOffset?.source
            ? this._randomOffsetLegacy
            : this._randomOffset?.source,
        target:
          !!target && this._randomOffset?.target
            ? this._randomOffsetLegacy
            : this._randomOffset?.target,
      };
    }

    if (this._selfMask) {
      this._masks.push(
        lib.get_object_identifier(this._source) ??
          canvaslib.get_object_canvas_data(this._source)
      );
    }

    let sceneId = game.user.viewedScene;
    if (lib.is_UUID(source)) {
      const potentialSceneId = source.split(".")[1];
      if (game.scenes.get(potentialSceneId)) {
        sceneId = potentialSceneId;
      }
    } else if (lib.is_UUID(target)) {
      const potentialSceneId = target.split(".")[1];
      if (game.scenes.get(potentialSceneId)) {
        sceneId = potentialSceneId;
      }
    }

    let data = foundry.utils.duplicate({
      /**
       * Core properties
       */
      _id: foundry.utils.randomID(),
      flagVersion: flagManager.latestFlagVersion,
      sequenceId: this.sequence.id,
      creationTimestamp: +new Date(),
      sceneId,
      creatorUserId: game.userId,
      moduleName: this.sequence.moduleName,
      users: this._users ? Array.from(this._users) : false,
      name: this._name,
      origin: this._origin,
      index: this.sequence.effectIndex,
      repetition: this._currentRepetition,
      private: this._private,
      temporary: this._temporaryEffect,
      tiedDocuments: Array.from(new Set(this._tiedDocuments)),

      /**
       * Source/target properties
       */
      source: source,
      target: target,
      rotateTowards: this._rotateTowards,
      stretchTo: this._stretchTo
        ? {
            attachTo: this._stretchTo.attachTo,
            onlyX: this._stretchTo.onlyX,
            requiresLineOfSight: this._stretchTo.requiresLineOfSight,
            hideLineOfSight: this._stretchTo.hideLineOfSight,
          }
        : false,
      moveTowards: this._moveTowards
        ? {
            ease: this._moveTowards.ease,
            rotate: this._moveTowards.rotate,
          }
        : false,

      attachTo: this._attachTo,
      missed: this._missed,

      /**
       * Sprite properties
       */
      file: file?.dbPath ?? file,
      customRange,
      forcedIndex,
      text: this._text,
      tilingTexture: this._tilingTexture,
      masks: Array.from(new Set(this._masks)),
      shapes: this._shapes,
      volume: this._volume,
      isometric: this._isometric,

      // Transforms
      scale: this._getCalculatedScale("scale"),
      spriteScale: this._getCalculatedScale("spriteScale"),
      angle: this._angle,
      size: this._size,
      offset: this._offset,
      anchor: this._anchor,
      spriteOffset: this._spriteOffset,
      spriteAnchor: this._spriteAnchor,
      template: this._template,
      zeroSpriteRotation: this._zeroSpriteRotation,
      randomOffset: this._randomOffset,
      randomRotation: this._randomRotation,
      scaleToObject: this._scaleToObject,
      elevation: this._elevation,
      aboveLighting: this._aboveLighting,
      aboveInterface: this._aboveInterface,
      xray: this._xray,

      // Appearance
      zIndex: this._zIndex,
      opacity: lib.is_real_number(this._opacity) ? this._opacity : 1.0,
      filters: this._filters,
      noLoop: this._noLoop,
      spriteRotation: this._spriteRotation,
      randomSpriteRotation: this._randomSpriteRotation,
      tint: this._tint?.decimal,
      flipX: this._mirrorX || (this._randomMirrorX && Math.random() < 0.5),
      flipY: this._mirrorY || (this._randomMirrorY && Math.random() < 0.5),

      /**
       * Time properties
       */
      duration: this._duration,
      persist: this._persist,
      persistOptions: this._persistOptions,
      playbackRate: this._playbackRate,
      extraEndDuration: this._extraEndDuration,
      time:
        this._startTime || this._endTime
          ? {
              start: lib.is_real_number(this._startTime)
                ? {
                    value: this._startTime,
                    isPerc: this._startPerc,
                  }
                : false,
              end: lib.is_real_number(this._endTime)
                ? {
                    value: this._endTime,
                    isPerc: this._endPerc,
                  }
                : false,
              isRange: this._isRange,
            }
          : false,

      /**
       * Animation properties
       */
      moves: this._moveTowards,
      moveSpeed: this._moveSpeed,
      fadeIn: this._fadeIn,
      fadeOut: this._fadeOut,
      scaleIn: this._scaleIn,
      scaleOut: this._scaleOut,
      rotateIn: this._rotateIn,
      rotateOut: this._rotateOut,
      fadeInAudio: this._fadeInAudio,
      fadeOutAudio: this._fadeOutAudio,
      animations: this._animations,

      /**
       * Screenspace properties
       */
      screenSpace: this._screenSpace,
      screenSpaceAboveUI: this._screenSpaceAboveUI,
      screenSpaceAnchor: this._screenSpaceAnchor,
      screenSpacePosition: this._screenSpacePosition,
      screenSpaceScale: this._screenSpaceScale,

      nameOffsetMap: this.sequence.nameOffsetMap,
    });

    for (let override of this._overrides) {
      data = await override(this, data);
    }

    if (
      (typeof data.file !== "string" || data.file === "") &&
      !data.text &&
      !data.shapes &&
      !data.customRange
    ) {
      throw this.sequence._customError(
        this,
        "file",
        "an effect must have a file, text, or have a shape!"
      );
    }

    // TODO: Revisit this at some point?
    // data = Object.fromEntries(Object.entries(data).filter(entry => entry[1] !== null && entry[1] !== false));

    return data;
  }

  async _serialize() {
    const data = await super._serialize();
    await this.preRun();
    const sectionData = await this._sanitizeEffectData();
    return {
      ...data,
      type: "effect",
      sectionData,
    };
  }

  async _deserialize(data) {
    this._deserializedData = data.sectionData;
    return super._deserialize(data);
  }

  /**
   * @private
   */
  _getCalculatedScale(type) {
    const min = this["_" + type + "Min"];
    const max = this["_" + type + "Max"];

    let scale = min;
    if (lib.is_real_number(min)) {
      if (max && lib.is_real_number(max)) {
        scale = lib.random_float_between(min, max);
      }
      scale = {
        x: scale,
        y: scale,
      };
    }
    return {
      x: scale?.x ?? 1.0,
      y: scale?.y ?? 1.0,
    };
  }
}
