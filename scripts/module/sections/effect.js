import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";
import flagManager from "../flag-manager.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import { SequencerFileRangeFind } from "../sequencer-file.js";
import { AboveLightingEffectsLayer } from "../canvas-effects/effects-layer.js";

export default class EffectSection extends Section {

    constructor(inSequence, inFile = "") {
        super(inSequence)
        this._waitUntilFinished = null;
        this._file = inFile;
        this._text = null;
        this._source = null;
        this._stretchTo = null;
        this._attachTo = null;
        this._from = null;
        this._origin = null;
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
        this._name = null;
        this._layer = 2;
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
        this._masks = [];
        this._selfMask = false;

        this._isRangedEffect = null;
        this._randomOffsetLegacy = null;
    }

    /**
     * Causes the effect's position to be stored and can then be used  with .atLocation(), .stretchTowards(),
     * and .rotateTowards() to refer to previous effects' locations
     *
     * @param {string} inName
     * @returns {EffectSection}
     */
    name(inName) {
        if (typeof inName !== "string") throw this.sequence._customError(this, "name", "inName must be of type string");
        this._name = lib.safe_str(inName);
        return this;
    }

    /**
     * Causes the effect to persist indefinitely on the canvas until _ended via SequencerEffectManager.endAllEffects() or
     * name the effect with .name() and then end it through SequencerEffectManager.endEffect()
     *
     * @param {boolean} [inBool=true] inBool
     * @param {object} [inOptions={}] inOptions
     * @returns {EffectSection}
     */
    persist(inBool = true, inOptions={}) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "persist", "inBool must be of type boolean");
        if(typeof inOptions !== "object") throw this.sequence._customError(this, "persist", `inOptions must be of type object`);
        inOptions = foundry.utils.mergeObject({
            persistTokenPrototype: false
        }, inOptions)
        if (typeof inOptions.persistTokenPrototype !== "boolean") throw this.sequence._customError(this, "persist", "inOptions.persistTokenPrototype must be of type boolean");
        this._persist = inBool;
        this._persistOptions = inOptions;
        return this;
    }

    /**
     * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
     * it play half as fast.
     *
     * @param {number} inNumber
     * @returns {EffectSection}
     */
    playbackRate(inNumber = 1.0) {
        if (!lib.is_real_number(inNumber)) throw this.sequence._customError(this, "playbackRate", "inNumber must be of type number");
        this._playbackRate = inNumber;
        return this;
    }

    /**
     * Causes the effect to target a location close to the .stretchTowards() location, but not on it.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    missed(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "missed", "inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection}
     */
    addOverride(inFunc) {
        if (!lib.is_function(inFunc)) throw this.sequence._customError(this, "addOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection}
     */
    addPostOverride(inFunc) {
        this.sequence._showWarning(self, "addPostOverride", "This method has been deprecated, please use .addOverride() instead.", true)
        if (!lib.is_function(inFunc)) throw this.sequence._customError(this, "addPostOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    /**
     *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {object|string} inLocation
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    atLocation(inLocation, inOptions = {}) {
        if(typeof inOptions !== "object") throw this.sequence._customError(this, "atLocation", `inOptions must be of type object`);
        inOptions = foundry.utils.mergeObject({
            cacheLocation: false,
            randomOffset: false
        }, inOptions);
        inLocation = this._validateLocation(inLocation);
        if (inLocation === undefined) throw this.sequence._customError(this, "atLocation", "could not find position of given object");
        if (typeof inOptions.cacheLocation !== "boolean") throw this.sequence._customError(this, "atLocation", "inOptions.cacheLocation must be of type boolean");
        if (!(typeof inOptions.randomOffset === "boolean" || lib.is_real_number(inOptions.randomOffset))) throw this.sequence._customError(this, "atLocation", "inOptions.randomOffset must be of type boolean or number");
        this._source = inOptions.cacheLocation ? canvaslib.get_object_position(inLocation) : inLocation;
        this._randomOffset = {
            source: inOptions.randomOffset,
            target: this._randomOffset?.target ?? false
        }
        return this;
    }

    /**
     *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {object|string} inObject
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    attachTo(inObject, inOptions={}) {
        if(typeof inOptions !== "object") throw this.sequence._customError(this, "attachTo", `inOptions must be of type object`);
        inOptions = foundry.utils.mergeObject({
            align: "center",
            edge: "on",
            bindVisibility: true,
            bindAlpha: true,
            followRotation: true,
            randomOffset: false
        }, inOptions);

        const validatedObject = this._validateLocation(inObject);
        if (validatedObject === undefined) throw this.sequence._customError(this, "attachTo", "could not find given object");

        let isValidObject = true;
        if(typeof inObject === "string"){
            isValidObject = validatedObject instanceof Token
                || validatedObject instanceof TokenDocument
                || validatedObject instanceof Tile
                || validatedObject instanceof TileDocument
                || validatedObject instanceof Drawing
                || validatedObject instanceof DrawingDocument
                || validatedObject instanceof MeasuredTemplate
                || validatedObject instanceof MeasuredTemplateDocument
                || validatedObject instanceof CanvasEffect;
            if (!isValidObject){
                this.sequence._showWarning(this, "attachTo", "Only Tokens, Tiles, Drawings, and MeasuredTemplates may have attached effects - will play effect on target's location");
            }
        }

        const aligns = Object.keys(canvaslib.alignments);
        if (typeof inOptions.align !== "string" || !aligns.includes(inOptions.align)) {
            throw this.sequence._customError(this, "attachTo", `inOptions.align must be of type string, one of: ${aligns.join(', ')}`);
        }
        if(typeof inOptions.edge !== "string" || !(inOptions.edge === "on" || inOptions.edge === "inner" || inOptions.edge === "outer")){
            throw this.sequence._customError(this, "attachTo", `inOptions.edge must of type string with the value of either "on", "inner", or "outer"`);
        }
        if (typeof inOptions.bindVisibility !== "boolean") throw this.sequence._customError(this, "attachTo", `inOptions.bindVisibility must be of type boolean`);
        if (typeof inOptions.followRotation !== "boolean") throw this.sequence._customError(this, "attachTo", `inOptions.followRotation must be of type boolean`);
        if (typeof inOptions.bindAlpha !== "boolean") throw this.sequence._customError(this, "attachTo", "inOptions.bindAlpha must be of type boolean");
        if (!(typeof inOptions.randomOffset === "boolean" || lib.is_real_number(inOptions.randomOffset))) throw this.sequence._customError(this, "attachTo", "inOptions.randomOffset must be of type boolean or number");

        this._source = validatedObject;
        this._randomOffset = {
            source: this._randomOffset?.source ?? false,
            target: inOptions.randomOffset
        }
        this._attachTo = {
            active: isValidObject,
            align: inOptions.align,
            edge: inOptions.edge,
            bindVisibility: inOptions.bindVisibility,
            bindAlpha: inOptions.bindAlpha,
            followRotation: inOptions.followRotation
        };
        if(!validatedObject?.id) this.locally();
        return this;
    }

    /**
     *  DEPRECATED IN FAVOR OF .stretchTo()
     *
     * @param {object|string} inLocation
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    reachTowards(inLocation, inOptions = {}) {
        this.sequence._showWarning(self, "reachTowards", "This method has been deprecated, please use .stretchTo() instead", true);
        return this.stretchTo(inLocation, inOptions);
    }

    /**
     *  Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
     *  This effectively calculates the proper X scale for the effect to reach the target
     *
     * @param {object|string} inLocation
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    stretchTo(inLocation, inOptions = {}) {
        if(typeof inOptions !== "object") throw this.sequence._customError(this, "stretchTo", `inOptions must be of type object`);
        inOptions = foundry.utils.mergeObject({
            cacheLocation: false,
            attachTo: false,
            onlyX: false,
            tiling: false,
            randomOffset: false
        }, inOptions)
        inLocation = this._validateLocation(inLocation);
        if (inLocation === undefined) throw this.sequence._customError(this, "stretchTo", "could not find position of given object");
        if (typeof inOptions.cacheLocation !== "boolean") throw this.sequence._customError(this, "stretchTo", "inOptions.cacheLocation must be of type boolean");
        if (typeof inOptions.attachTo !== "boolean") throw this.sequence._customError(this, "stretchTo", "inOptions.attachTo must be of type boolean");
        if (typeof inOptions.onlyX !== "boolean") throw this.sequence._customError(this, "stretchTo", "inOptions.onlyX must be of type boolean");
        if (typeof inOptions.tiling !== "boolean") throw this.sequence._customError(this, "stretchTo", "inOptions.tiling must be of type boolean");
        if (!(typeof inOptions.randomOffset === "boolean" || lib.is_real_number(inOptions.randomOffset))) throw this.sequence._customError(this, "stretchTo", "inOptions.randomOffset must be of type boolean or number");

        if (inOptions.cacheLocation && inOptions.attachTo){
            throw this.sequence._customError(this, "stretchTo", "cacheLocation and attachTo cannot both be true - pick one or the other");
        }

        if(inOptions.tiling) this.tilingTexture();

        this._stretchTo = {
            target: inOptions.cacheLocation ? canvaslib.get_object_position(inLocation, { measure: true }) : inLocation,
            attachTo: inOptions.attachTo,
            onlyX: inOptions.onlyX
        };

        this._randomOffset = {
            source: this._randomOffset?.source ?? false,
            target: inOptions.randomOffset
        }

        return this;
    }

    /**
     *  Create an effect based on the given object, effectively copying the object as an effect. Useful when you want to do some effect magic on tokens or tiles.
     *
     * @param {object} inObject
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    from(inObject, inOptions = {}){
        if(typeof inOptions !== "object") throw this.sequence._customError(this, "from", `inOptions must be of type object`);
        if(!(inObject instanceof Token || inObject instanceof Tile || inObject instanceof TokenDocument || inObject instanceof TileDocument)) throw this.sequence._customError(this, "from", "inObject must be of type Token, Tile, TokenDocument, or TileDocument");
        inObject = inObject instanceof foundry.abstract.Document ? inObject.object : inObject;
        if(!inObject?.data?.img) throw this.sequence._customError(this, "from", "could not find the image for the given object");
        inOptions = foundry.utils.mergeObject({
            cacheLocation: false,
            randomOffset: false
        }, inOptions)
        if (typeof inOptions.cacheLocation !== "boolean") throw this.sequence._customError(this, "from", "inOptions.cacheLocation must be of type boolean");
        if (!(typeof inOptions.randomOffset === "boolean" || lib.is_real_number(inOptions.randomOffset))) throw this.sequence._customError(this, "from", "inOptions.randomOffset must be of type boolean or number");
        this._from = {
            object: inObject,
            options: inOptions
        }
        return this;
    }

    /**
     *  Creates a text element, attached to the sprite. The options for the text are available here:
     *  https://pixijs.io/pixi-text-style/
     *
     * @param {string} inText
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    text(inText, inOptions={}){
        if (typeof inText !== "string") throw this.sequence._customError(this, "text", "inText must be of type string");
        this._text = foundry.utils.mergeObject({
            text: inText
        }, inOptions);
        return this;
    }

    /**
     *  Causes the effect to be offset relative to its location based on a given vector
     *
     * @param {object} inOffset
     * @param {object} options
     * @returns {EffectSection}
     */
    offset(inOffset, options = {}) {
        if (inOffset === undefined) throw this.sequence._customError(this, "offset", "inOffset must not be undefined");
        if (typeof options !== "object") throw this.sequence._customError(this, "offset", "options must be of type object");
        inOffset = foundry.utils.mergeObject({
            x: 0,
            y: 0,
            local: false
        }, inOffset);
        inOffset = foundry.utils.mergeObject(inOffset, options);
        if (typeof inOffset.local !== "boolean") throw this.sequence._customError(this, "offset", "options.local must be of type boolean");
        if (!lib.is_real_number(inOffset.x)) throw this.sequence._customError(this, "offset", `inOffset.x must be of type number!`);
        if (!lib.is_real_number(inOffset.y)) throw this.sequence._customError(this, "offset", `inOffset.y must be of type number!`);
        this._offset = inOffset;
        return this;
    }

    /**
     *  Causes the effect's sprite to be offset relative to its location based on a given vector
     *
     * @param {object} inOffset
     * @returns {EffectSection}
     */
    spriteOffset(inOffset) {
        if (inOffset === undefined) throw this.sequence._customError(this, "spriteOffset", "inOffset must not be undefined");
        inOffset = foundry.utils.mergeObject({
            x: 0,
            y: 0
        }, inOffset);
        if (!lib.is_real_number(inOffset.x)) throw this.sequence._customError(this, "spriteOffset", `inOffset.x must be of type number!`);
        if (!lib.is_real_number(inOffset.y)) throw this.sequence._customError(this, "spriteOffset", `inOffset.y must be of type number!`);
        this._spriteOffset = inOffset;
        return this;
    }

    /**
     * Causes the final effect location to be snapped to the grid
     *
     * @param {boolean} inBool
     * @returns {EffectSection}
     */
    snapToGrid(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "snapToGrid", "inBool must be of type boolean");
        this._snapToGrid = inBool;
        return this;
    }

    /**
     * Causes the effect to be scaled to the target object's width
     *
     * @param {number} inScale
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    scaleToObject(inScale = 1.0, inOptions={}){
        if (!lib.is_real_number(inScale)) throw this.sequence._customError(this, "scaleToObject", `inScale must be of type number!`);
        if (typeof inOptions !== "object") throw this.sequence._customError(this, "scaleToObject", "inOptions must be of type object");
        inOptions = foundry.utils.mergeObject({
            uniform: false
        }, inOptions);
        if (typeof inOptions.uniform !== "boolean") throw this.sequence._customError(this, "scaleToObject", "inBool must be of type boolean");
        this._scaleToObject = inOptions;
        return this.scale(inScale);
    }

    /**
     * Sets the width and the height of the effect in pixels, this size is set before any scaling
     *
     * @param {number|object} inSize
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    size(inSize, inOptions= {}) {
        if (!lib.is_real_number(inSize) && typeof inSize !== "object") throw this.sequence._customError(this, "size", "inSize must be of type number or object");
        if (typeof inOptions !== "object") throw this.sequence._customError(this, "size", "inOptions must be of type object");
        if (lib.is_real_number(inSize)) {
            inSize = {
                width: inSize,
                height: inSize
            }
        }

        if((inSize?.width === undefined) ^ (inSize?.height === undefined)){
            if(inSize?.width){
                if (!lib.is_real_number(inSize?.width)) throw this.sequence._customError(this, "size", "inSize.width must be of type number or string 'auto'");
                inSize['height'] = "auto"
            }else{
                if (!lib.is_real_number(inSize?.height)) throw this.sequence._customError(this, "size", "inSize.height must be of type number or string 'auto'");
                inSize['width'] = "auto"
            }
        }

        inOptions = foundry.utils.mergeObject({
            gridUnits: false
        }, inOptions)

        if (!lib.is_real_number(inSize?.width) && inSize?.width !== "auto") throw this.sequence._customError(this, "size", "inSize.width must be of type number or string 'auto'");
        if (!lib.is_real_number(inSize?.height) && inSize?.height !== "auto") throw this.sequence._customError(this, "size", "inSize.height must be of type number or string 'auto'");
        if (typeof inOptions.gridUnits !== "boolean") throw this.sequence._customError(this, "size", "inOptions.gridUnits must be of type boolean");

        this._size = {
            width: inSize?.width ?? canvas.grid.size,
            height: inSize?.height ?? canvas.grid.size,
            ...inOptions
        };
        return this;
    }

    /**
     * Sets the grid size of the file loaded in the Effect. Some files have an established internal
     * grid, so this will make the effect scale up or down to match the active scene's grid size
     *
     * @param {number} inGridSize
     * @returns {EffectSection}
     */
    gridSize(inGridSize) {
        this.sequence._showWarning(this, "gridSize", "This method has been deprecated, please use .template(gridSize, startPoint, endPoint) instead.", true)
        if (!lib.is_real_number(inGridSize)) throw this.sequence._customError(this, "gridSize", "inGridSize must be of type number");
        if(!this._template) this._template = {};
        this._template["gridSize"] = inGridSize;
        return this;
    }

    /**
     *  Defines the start point within the given sprite, starting from the left of the sprite. An example
     *  would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the
     *  'anchor point'
     *
     * @param {number} inStartPoint
     * @returns {EffectSection}
     */
    startPoint(inStartPoint) {
        this.sequence._showWarning(this, "startPoint", "This method has been deprecated, please use .template({ gridSize, startPoint, endPoint }) instead.", true)
        if (!lib.is_real_number(inStartPoint)) throw this.sequence._customError(this, "startPoint", "inStartPoint must be of type number");
        if(!this._template) this._template = {};
        this._template["startPoint"] = inStartPoint;
        return this;
    }

    /**
     *  The same as the start point, except from the right and how many pixels to offset the target from
     *
     * @param {number} inEndPoint
     * @returns {EffectSection}
     */
    endPoint(inEndPoint) {
        this.sequence._showWarning(this, "endPoint", "This method has been deprecated, please use .template({ gridSize, startPoint, endPoint }) instead.", true)
        if (!lib.is_real_number(inEndPoint)) throw this.sequence._customError(this, "endPoint", "inEndPoint must be of type number");
        if(!this._template) this._template = {};
        this._template["endPoint"] = inEndPoint;
        return this;
    }

    /**
     * This defines the internal padding of this effect. Gridsize determines the internal grid size of this effect which will determine how big it is on the canvas
     * relative to the canvas's grid size. Start and end point defines padding at the left and right of the effect
     *
     * @param {number} gridSize
     * @param {number} startPoint
     * @param {number} endPoint
     * @returns {EffectSection}
     */
    template({ gridSize, startPoint, endPoint }={}){
        if (gridSize && !lib.is_real_number(gridSize)) throw this.sequence._customError(this, "template", "gridSize must be of type number");
        if (startPoint && !lib.is_real_number(startPoint)) throw this.sequence._customError(this, "template", "startPoint must be of type number");
        if (endPoint && !lib.is_real_number(endPoint)) throw this.sequence._customError(this, "template", "endPoint must be of type number");
        if(!gridSize && !startPoint && !endPoint) throw this.sequence._customError(this, "template", "You need to define at least one parameter!");
        if(!this._template) this._template = {};
        if(gridSize) this._template["gridSize"] = gridSize;
        if(startPoint) this._template["startPoint"] = startPoint;
        if(endPoint) this._template["endPoint"] = endPoint;
        return this;
    }

    /**
     * This makes the texture of the effect tile, effectively repeat itself within the sprite's dimensions
     *
     * @param {object/number} scale
     * @param {object} position
     * @returns {EffectSection}
     */
    tilingTexture(scale = { x: 1.0, y: 1.0 }, position = { x: 0, y: 0 }){

        if (lib.is_real_number(scale)) {
            scale = { x: scale, y: scale }
        }

        scale = { x: scale?.x ?? 1.0, y: scale?.y ?? 1.0 }

        if (!lib.is_real_number(scale.x)) throw this.sequence._customError(this, "tilingTexture", `scale.x must be of type number!`);
        if (!lib.is_real_number(scale.y)) throw this.sequence._customError(this, "tilingTexture", `scale.y must be of type number!`);

        position = { x: position?.x ?? 0, y: position?.y ?? 0 }

        if (!lib.is_real_number(position.x)) throw this.sequence._customError(this, "tilingTexture", `position.x must be of type number!`);
        if (!lib.is_real_number(position.y)) throw this.sequence._customError(this, "tilingTexture", `position.y must be of type number!`);

        this._tilingTexture = {
            scale,
            position
        };

        return this;
    }

    /**
     *  Anchors the sprite's container according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection}
     */
    anchor(inAnchor) {
        if (lib.is_real_number(inAnchor)) {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (!lib.is_real_number(inAnchor.x)) throw this.sequence._customError(this, "anchor", `inAnchor.x must be of type number!`);
        if (!lib.is_real_number(inAnchor.y)) throw this.sequence._customError(this, "anchor", `inAnchor.y must be of type number!`);

        this._anchor = inAnchor;
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection}
     */
    spriteAnchor(inAnchor) {
        if (lib.is_real_number(inAnchor)) {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (!lib.is_real_number(inAnchor.x)) throw this.sequence._customError(this, "anchor", `inAnchor.x must be of type number!`);
        if (!lib.is_real_number(inAnchor.y)) throw this.sequence._customError(this, "anchor", `inAnchor.y must be of type number!`);

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
     * The sprite gets a random offset on its target location, usually within the object's bounds. The optional parameter
     * scales how much offset should be added. Defaults to 1.0, which covers the entire target position, 0.5 would cover half.
     *
     * @param {number} [inOffsetScale=1.0] inOffsetScale
     * @returns {EffectSection}
     */
    randomOffset(inOffsetScale = 1.0) {
        this.sequence._showWarning(self, "randomOffset", "This method has been deprecated, please use randomOffset as a second parameter on atLocation, stretchTo, etc.")
        if (!lib.is_real_number(inOffsetScale)) throw this.sequence._customError(this, "randomOffset", "inBool must be of type number");
        this._randomOffsetLegacy = inOffsetScale;
        return this;
    }

    /**
     * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its horizontal axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection}
     */
    randomizeMirrorX(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "randomizeMirrorX", "inBool must be of type boolean");
        this._randomMirrorX = inBool;
        return this;
    }

    /**
     * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its vertical axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection}
     */
    randomizeMirrorY(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "randomizeMirrorY", "inBool must be of type boolean");
        this._randomMirrorY = inBool;
        return this;
    }

    /**
     * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its horizontal axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection}
     */
    mirrorX(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "mirrorX", "inBool must be of type boolean");
        this._mirrorX = inBool;
        return this;
    }

    /**
     * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its vertical axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection}
     */
    mirrorY(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "mirrorY", "inBool must be of type boolean");
        this._mirrorY = inBool;
        return this;
    }

    /**
     * Causes the effect to be played below tokens
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    belowTokens(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "belowTokens", "inBool must be of type boolean");
        this._layer = inBool ? 1 : 2;
        return this;
    }

    /**
     * Causes the effect to be played below tiles
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    belowTiles(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "belowTiles", "inBool must be of type boolean");
        this._layer = inBool ? 0 : 2;
        return this;
    }

    /**
     * Causes the effect to be played above the lighting layer, which makes the effect be visible over almost everything except weather effects
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    aboveLighting(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "belowTiles", "inBool must be of type boolean");
        this._layer = inBool ? 3 : 2;
        return this;
    }

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects
     *
     * @param {number} inZIndex
     * @returns {EffectSection}
     */
    zIndex(inZIndex) {
        if (!lib.is_real_number(inZIndex)) throw this.sequence._customError(this, "zIndex", "inZIndex must be of type number");
        this._zIndex = inZIndex;
        return this;
    }

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects
     *
     * @param {number} inExtraDuration
     * @returns {EffectSection}
     */
    extraEndDuration(inExtraDuration) {
        if (!lib.is_real_number(inExtraDuration)) throw this.sequence._customError(this, "extraEndDuration", "inExtraDuration must be of type number");
        this._extraEndDuration = inExtraDuration;
        return this;
    }

    /**
     * Causes the effect to not rotate should its container rotate
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    zeroSpriteRotation(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "zeroSpriteRotation", "inBool must be of type boolean");
        this._zeroSpriteRotation = inBool;
        return this;
    }

    /**
     * If the effect would loop due to its duration or persistence, this causes it not to
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    noLoop(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "noLoop", "inBool must be of type boolean");
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
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "private", "inBool must be of type boolean");
        this._private = inBool;
        return this;
    }

    /**
     * Causes the effect to be played in screen space instead of world space (where tokens are)
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    screenSpace(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "screenSpace", "inBool must be of type boolean");
        this._screenSpace = inBool;
        return this;
    }

    /**
     * Causes the effect to be played above all of the UI elements
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection}
     */
    screenSpaceAboveUI(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "screenSpaceAboveUI", "inBool must be of type boolean");
        this._screenSpaceAboveUI = inBool;
        return this;
    }

    /**
     *  Positions the effect in a screen space position, offset from its .screenSpaceAnchor()
     *
     * @param {object} inPosition
     * @returns {EffectSection}
     */
    screenSpacePosition(inPosition) {
        inPosition = {
            x: inPosition?.x ?? 0,
            y: inPosition?.y ?? 0
        }
        if (!lib.is_real_number(inPosition.x)) throw this.sequence._customError(this, "screenSpacePosition", `inPosition.x must be of type number!`);
        if (!lib.is_real_number(inPosition.y)) throw this.sequence._customError(this, "screenSpacePosition", `inPosition.y must be of type number!`);
        this._screenSpacePosition = inPosition;
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number in screen space
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection}
     */
    screenSpaceAnchor(inAnchor) {
        if (lib.is_real_number(inAnchor)) {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (!lib.is_real_number(inAnchor.x)) throw this.sequence._customError(this, "screenSpaceAnchor", `inAnchor.x must be of type number!`);
        if (!lib.is_real_number(inAnchor.y)) throw this.sequence._customError(this, "screenSpaceAnchor", `inAnchor.y must be of type number!`);

        this._screenSpaceAnchor = inAnchor;
        return this;
    }

    /**
     *  Sets up various properties relating to scale of the effect on the screen
     *
     * @param {object} inOptions
     * @returns {EffectSection}
     */
    screenSpaceScale(inOptions) {

        if(typeof inOptions !== "object") throw this.sequence._customError(this, "screenSpaceScale", `inOptions must be of type object`);

        inOptions = foundry.utils.mergeObject({
            x: 1.0,
            y: 1.0,
            fitX: false,
            fitY: false,
            ratioX: false,
            ratioY: false
        }, inOptions)

        if (!lib.is_real_number(inOptions.x)) throw this.sequence._customError(this, "screenSpaceScale", `inOptions.x must be of type number!`);
        if (!lib.is_real_number(inOptions.y)) throw this.sequence._customError(this, "screenSpaceScale", `inOptions.y must be of type number!`);
        if (typeof inOptions.fitX !== "boolean") throw this.sequence._customError(this, "screenSpaceScale", "inOptions.fitX must be of type boolean");
        if (typeof inOptions.fitY !== "boolean") throw this.sequence._customError(this, "screenSpaceScale", "inOptions.fitY must be of type boolean");
        if (typeof inOptions.ratioX !== "boolean") throw this.sequence._customError(this, "screenSpaceScale", "inOptions.ratioX must be of type boolean");
        if (typeof inOptions.ratioY !== "boolean") throw this.sequence._customError(this, "screenSpaceScale", "inOptions.ratioY must be of type boolean");

        if (inOptions.ratioX && inOptions.ratioY) throw this.sequence._customError(this, "screenSpaceScale", "both ratioX and ratioY cannot be true, one axis must fit or be set directly")

        this._screenSpaceScale = inOptions;

        return this;
    }

    /**
     *  This is for adding extra information to an effect, like the origin of the effect in the form of the item's uuid.
     *  The method accepts a string or a Document that has an UUID.
     *
     * @param {string|document} inOrigin
     * @returns {Section}
     */
    origin(inOrigin){
        inOrigin = lib.validate_document(inOrigin);
        if (inOrigin instanceof foundry.abstract.Document){
            inOrigin = inOrigin?.uuid;
            if(!inOrigin) throw this.sequence._customError(this, "origin", "could not find the UUID for the given Document")
        }
        if (typeof inOrigin !== "string") throw this.sequence._customError(this, "origin", "inOrigin must be of type string");
        this._origin = inOrigin;
        return this;
    }

    /**
     *  Masks the effect to the given object or objects. If no object is given, the effect will be masked to the source
     *  of the effect.
     *
     * @param {Token/TokenDocument/Tile/TileDocument/Drawing/DrawingDocument/MeasuredTemplate/MeasuredTemplateDocument/Array} inObject
     * @returns {Section}
     */
    mask(inObject){

        if(!inObject){
            this._selfMask = true;
            return this;
        }

        if(Array.isArray(inObject)){
            for(let obj of inObject){
                this.mask(obj);
            }
            return this;
        }

        const validatedObject = this._validateLocation(inObject);

        const isValidObject = validatedObject instanceof TokenDocument
            || validatedObject instanceof TileDocument
            || validatedObject instanceof DrawingDocument
            || validatedObject instanceof MeasuredTemplateDocument;
        if (!isValidObject) {
            throw this.sequence._customError(this, "mask", "A foundry object was provided, but only Tokens, Tiles, Drawings, and MeasuredTemplates may be used to create effect masks");
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
    xray(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._customError(this, "xray", "inBool must be of type boolean");
        this._xray = inBool;
        return this;
    }

    /**
     * @private
     */
    _expressWarnings(){
        if(this._stretchTo && this._anchor?.x){
            this.sequence._showWarning(this, "stretchTo", "you have called .stretchTo() and .anchor() - stretchTo will manually set the X axis of the anchor and may not behave like you expect.", true);
        }
        if(this._stretchTo && this._scaleToObject){
            throw this.sequence._customError(this, "stretchTo", "You're trying to stretch towards an object, while scaling to fit another??? Make up your mind!");
        }
        if(this._stretchTo && this._randomRotation){
            throw this.sequence._customError(this, "stretchTo", "You're trying to stretch towards an object, while trying to randomly rotate the effect? What?");
        }
        if(this._stretchTo && this._moveTowards){
            throw this.sequence._customError(this, "stretchTo", "You're trying to stretch towards an object, while moving towards it? You're insane.");
        }
        if(this._attachTo && this._stretchTo?.attachTo && (this._startTime || this._endTime) && this._isRangedEffect){
            throw this.sequence._customError(this, "stretchTo", "Dual-attached range-finding effects combined while using any of the time methods is stable - modern web browsers cannot handle it and it may crash them, so this feature has been disabled.");
        }

        const source = this._getSourceObject();
        const target = this._getTargetObject();

        if(!source && !target && !this._screenSpace){
            throw this.sequence._customError(this, "play", "Could not determine where to play the effect!");
        }
    }

    /**
     * @OVERRIDE
     */
    async preRun(){

        if(this._from) {
            this._file = this._from.object?.data?.img;

            if (this._source === null) {
                this._source = this._validateLocation(this._from.object);
            }

            if(this._size === null){
                const size = canvaslib.get_object_dimensions(this._from.object?.icon ?? this._from.object?.tile ?? this._from.object);
                this._size = {
                    width: size?.width ?? canvas.grid.size,
                    height: size?.height ?? canvas.grid.size,
                    gridUnits: false
                };
            }

            if (this._mirrorX === null && (this._from.object.data.mirrorX || (this._from.object?.tile && this._from.object?.tile.scale.x < 0))){
                this._mirrorX = true;
            }

            if (this._mirrorY === null && (this._from.object.data.mirrorY || (this._from.object?.tile && this._from.object?.tile.scale.y < 0))){
                this._mirrorY = true;
            }

            if (this._angle === null && this._from.object?.data?.rotation) {
                this._angle = -this._from.object.data.rotation;
            }

            this._randomOffset = {
                source: this._randomOffset?.source ?? this._from.options.randomOffset,
                target: this._randomOffset?.target ?? false
            }
        }

    }

    /**
     * @OVERRIDE
     * @returns {Promise<void>}
     */
    async run() {
        this._expressWarnings();
        const data = await this._sanitizeEffectData();
        if(Hooks.call("preCreateSequencerEffect", data) === false) return;
        let push = !(data?.users?.length === 1 && data?.users?.includes(game.userId));
        let canvasEffectData = await Sequencer.EffectManager.play(data, push);
        let totalDuration = this._currentWaitTime;
        if (this._persist) {
            totalDuration += await canvasEffectData.promise;
        } else {
            totalDuration += await canvasEffectData.duration;
        }
        await new Promise(resolve => setTimeout(resolve, totalDuration))
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
    }

    /**
     * @private
     */
    async _initialize() {
        if(this._name){
            if(!this.sequence.nameOffsetMap){
                this.sequence.nameOffsetMap = {};
            }

            if(!this.sequence.nameOffsetMap[this._name]){

                const source = this._getSourceObject();
                const target = this._getTargetObject();

                if(this._randomOffsetLegacy && !this._randomOffset){
                    this._randomOffset = {
                        source: !target ? this._randomOffsetLegacy : false,
                        target: !!target ? this._randomOffsetLegacy : false
                    }
                }

                this.sequence.nameOffsetMap[this._name] = {
                    seed: `${this._name}-${randomID()}`,
                    source: source,
                    target: target,
                    randomOffset: this._randomOffset,
                    missed: this._missed,
                    offset: this._offset,
                    repetitions: this._repetitions,
                    twister: {}
                };
            }
        }

        if((!this._file && this._silentlyFail) || (!this._file && this._text)) {
            return;
        }

        let fileData = this._file ? (await this._determineFile(this._file)) : { file: this._file, forcedIndex: false, customRange: false };

        this._isRangedEffect = fileData?.file instanceof SequencerFileRangeFind || fileData?.customRange;

        if(fileData.customRange || fileData.file?.dbPath) return;

        let exists = false;
        try {
            exists = await SequencerFileCache.srcExists(fileData.file);
        } catch (err) {
        }

        if(!exists) throw this.sequence._customError(this, "Play", `Could not find file:<br>${fileData.file}`);

    }

    /**
     * @private
     */
    _sanitizeObject(inObj){
        if(inObj && typeof inObj === "object" && !canvaslib.is_object_canvas_data(inObj)){
            inObj = lib.get_object_identifier(inObj);
        }
        return inObj;
    }

    /**
     * @private
     */
    _getSourceObject(){
        if(typeof this._source !== "object") return this._source;
        return this._attachTo?.active
            ? this._sanitizeObject(this._source)
            : canvaslib.get_object_canvas_data(this._source);
    }

    /**
     * @private
     */
    _getTargetObject(){
        if(!this._target?.target) return this._target;
        if(typeof this._target.target !== "object") return this._target.target;
        return this._target?.attachTo
            ? this._sanitizeObject(this._target.target)
            : canvaslib.get_object_canvas_data(this._target.target, true);
    }

    /**
     * @private
     */
    get _target() {
        return this._stretchTo || this._rotateTowards || this._moveTowards || false;
    }

    /**
     * @private
     */
    async _sanitizeEffectData() {

        const { file, forcedIndex, customRange } = this._file ? (await this._determineFile(this._file)) : { file: this._file, forcedIndex: false, customRange: false };

        const source = this._getSourceObject();
        const target = this._getTargetObject();

        if(this._randomOffsetLegacy){
            this._randomOffset = {
                source: !target  && this._randomOffset?.source ? this._randomOffsetLegacy : this._randomOffset?.source,
                target: !!target && this._randomOffset?.target ? this._randomOffsetLegacy : this._randomOffset?.target
            }
        }

        if(this._selfMask){
            this._masks.push(this._sanitizeObject(this._source));
        }

        let data = foundry.utils.duplicate({
            /**
             * Core properties
             */
            _id: randomID(),
            flagVersion: flagManager.latestFlagVersion,
            sequenceId: this.sequence.id,
            creationTimestamp: (+new Date()),
            sceneId: game.user.viewedScene,
            creatorUserId: game.userId,
            moduleName: this.sequence.moduleName,
            users: this._users ? Array.from(this._users) : false,
            name: this._name,
            origin: this._origin,
            index: this.sequence.effectIndex,
            repetition: this._currentRepetition,
            private: this._private,

            /**
             * Source/target properties
             */
            source: source,
            target: target,
            rotateTowards: this._rotateTowards,
            stretchTo: this._stretchTo ? {
                attachTo: this._stretchTo.attachTo,
                onlyX: this._stretchTo.onlyX
            } : false,
            moveTowards: this._moveTowards ? {
                ease: this._moveTowards.ease,
                rotate: this._moveTowards.rotate
            } : false,

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
            masks: this._masks,
            xray: this._xray,

            // Transforms
            scale: this._getCalculatedScale(),
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

            // Appearance
            zIndex: this._zIndex,
            opacity: lib.is_real_number(this._opacity) ? this._opacity : 1.0,
            filters: this._filters,
            layer: this._layer,
            noLoop: this._noLoop,
            tint: this._tint?.decimal,
            flipX: (this._mirrorX || (this._randomMirrorX && Math.random() < 0.5)),
            flipY: (this._mirrorY || (this._randomMirrorY && Math.random() < 0.5)),

            /**
             * Time properties
             */
            duration: this._duration,
            persist: this._persist,
            persistOptions: this._persistOptions,
            playbackRate: this._playbackRate,
            extraEndDuration: this._extraEndDuration,
            time: (this._startTime || this._endTime) ? {
                start: lib.is_real_number(this._startTime) ? {
                    value: this._startTime,
                    isPerc: this._startPerc
                } : false,
                end: lib.is_real_number(this._endTime) ? {
                    value: this._endTime,
                    isPerc: this._endPerc
                } : false,
                isRange: this._isRange
            } : false,

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

            nameOffsetMap: this.sequence.nameOffsetMap
        });

        for (let override of this._overrides) {
            data = await override(this, data);
        }

        if ((typeof data.file !== "string" || data.file === "") && !data.text && !data.customRange) {
            throw this.sequence._customError(this, "file", "an effect must have a file or have text configured!");
        }

        // TODO: Revisit this at some point?
        // data = Object.fromEntries(Object.entries(data).filter(entry => entry[1] !== null && entry[1] !== false));

        return data;

    }

    /**
     * @private
     */
    _getCalculatedScale(){
        let scale = this._scaleMin;
        if (lib.is_real_number(this._scaleMin)) {
            if (this._scaleMax && lib.is_real_number(this._scaleMax)) {
                scale = lib.random_float_between(this._scaleMin, this._scaleMax);
            }
            scale = {
                x: scale,
                y: scale
            }
        }
        return {
            x: (scale?.x ?? 1.0),
            y: (scale?.y ?? 1.0)
        }
    }

}