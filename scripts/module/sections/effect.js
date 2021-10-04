import * as lib from "../lib/lib.js";
import Section from "./section.js";
import traits from "./traits/_traits.js";

export default class EffectSection extends Section {

    constructor(inSequence, inFile = "") {
        super(inSequence)
        this._waitUntilFinished = false;
        this._file = inFile;
        this._from = false;
        this._atLocation = false;
        this._reachTowards = false;
        this._anchor = false;
        this._spriteAnchor = false;
        this._randomOffset = false;
        this._missed = false;
        this._JB2A = false;
        this._randomMirrorX = false;
        this._randomMirrorY = false;
        this._mirrorX = false;
        this._mirrorY = false;
        this._playbackRate = 1.0;
        this._gridSize = 100;
        this._customTemplate = false;
        this._startPoint = 0;
        this._endPoint = 0;
        this._overrides = [];
        this._postOverrides = [];
        this._name = false;
        this._layer = 2;
        this._zIndex = 0;
        this._offset = false;
        this._size = false;
        this._persist = false;
        this._zeroSpriteRotation = false;
        this._distance = 0;
        this._extraEndDuration = 0;
        this._noLoop = false;
        this._snapToGrid = false;
        this._scaleToObject = false;
        this._screenSpace = false;
        this._screenSpaceAnchor = false;
        this._screenSpacePosition = { x: 0, y: 0 };
        this._screenSpaceScale = false;
        this._offsets = [];
    }

    /**
     * Causes the effect's position to be stored and can then be used  with .atLocation(), .reachTowards(),
     * and .rotateTowards() to refer to previous effects' locations
     *
     * @param {string} inName
     * @returns {EffectSection} this
     */
    name(inName) {
        if (typeof inName !== "string") throw this.sequence._throwError(this, "name", "inName must be of type string");
        this._name = inName;
        return this;
    }

    /**
     * Causes the effect to persist indefinitely on the canvas until ended via SequencerEffectManager.endAllEffects() or
     * name the effect with .name() and then end it through SequencerEffectManager.endEffect()
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    persist(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "persist", "inBool must be of type boolean");
        this._persist = inBool;
        return this;
    }

    /**
     * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
     * it play half as fast.
     *
     * @param {number} inNumber
     * @returns {EffectSection} this
     */
    playbackRate(inNumber = 1.0) {
        if (typeof inNumber !== "number") throw this.sequence._throwError(this, "playbackRate", "inNumber must be of type number");
        this._playbackRate = inNumber;
        return this;
    }

    /**
     * Causes the effect to target a location close to the .reachTowards() location, but not on it.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    missed(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "missed", "inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    /**
     * Sets the start point and end point to best work JB2A's effect sprites. This depends on the type of the effect, which
     * the Sequencer figures out from the path.
     *
     * @returns {EffectSection} this
     */
    JB2A() {
        this._JB2A = true;
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection} this
     */
    addOverride(inFunc) {
        if (!lib.is_function(inFunc)) throw this.sequence._throwError(this, "addOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection} this
     */
    addPostOverride(inFunc) {
        if (!lib.is_function(inFunc)) throw this.sequence._throwError(this, "addPostOverride", "The given function needs to be an actual function.");
        this._postOverrides.push(inFunc);
        return this;
    }

    /**
     *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {object|string} inLocation
     * @param {object} inOptions
     * @returns {EffectSection} this
     */
    atLocation(inLocation, inOptions = {}) {
        inOptions = foundry.utils.mergeObject({
            cacheLocation: false
        }, inOptions)
        inLocation = this._validateLocation(inLocation);
        if (inLocation === undefined) throw this.sequence._throwError(this, "atLocation", "could not find position of given object");
        if (typeof inOptions.cacheLocation !== "boolean") throw this.sequence._throwError(this, "reachTowards", "inOptions.cacheLocation must be of type boolean");
        this._from = inOptions.cacheLocation ? this._getCleanPosition(inLocation) : inLocation;
        this._atLocation = true;
        return this;
    }

    /**
     *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {object|string} inObject
     * @returns {EffectSection} this
     */
    attachTo(inObject) {
        inObject = this._validateLocation(inObject);
        if (inObject === undefined) throw this.sequence._throwError(this, "attachTo", "could not find given object");
        const isValidObject = inObject instanceof Token || inObject instanceof Tile || inObject instanceof Drawing;
        if (!isValidObject){
            this.sequence._showWarning(this, "attachTo", "Only Tokens, Tiles, and Drawings may have attached effects - will play effect on target's location");
        }
        this._from = inObject;
        this._attachTo = isValidObject;
        return this;
    }

    /**
     *  Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
     *  This effectively calculates the proper X scale for the effect to reach the target
     *
     * @param {object|string} inLocation
     * @param {object} inOptions
     * @returns {EffectSection} this
     */
    reachTowards(inLocation, inOptions = {}) {
        inOptions = foundry.utils.mergeObject({
            cacheLocation: false
        }, inOptions)
        inLocation = this._validateLocation(inLocation);
        if (inLocation === undefined) throw this.sequence._throwError(this, "reachTowards", "could not find position of given object");
        if (typeof inOptions.cacheLocation !== "boolean") throw this.sequence._throwError(this, "reachTowards", "inOptions.cacheLocation must be of type boolean");
        this._reachTowards = inOptions.cacheLocation ? this._getCleanPosition(inLocation, true) : inLocation;
        return this;
    }

    /**
     *  Causes the effect to be offset relative to its location based on a given vector
     *
     * @param {object} inOffset
     * @param {object} options
     * @returns {EffectSection} this
     */
    offset(inOffset, options = {}) {
        if (inOffset === undefined) throw this.sequence._throwError(this, "offset", "inOffset must not be undefined");
        if (typeof options !== "object") throw this.sequence._throwError(this, "offset", "options must be of type object");
        inOffset = foundry.utils.mergeObject({
            x: 0,
            y: 0,
            local: false
        }, inOffset);
        inOffset = foundry.utils.mergeObject(inOffset, options);
        if (typeof inOffset.local !== "boolean") throw this.sequence._throwError(this, "offset", "options.local must be of type boolean");
        this._offset = inOffset;
        return this;
    }

    /**
     * Causes the final effect location to be snapped to the grid
     *
     * @param {boolean} inBool
     * @returns {EffectSection} this
     */
    snapToGrid(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "snapToGrid", "inBool must be of type boolean");
        this._snapToGrid = inBool;
        return this;
    }

    /**
     * Causes the effect to be scaled to the target object's width
     *
     * @param {number} inScale
     * @returns {EffectSection} this
     */
    scaleToObject(inScale = 1.0){
        if (typeof inScale !== "number") throw this.sequence._throwError(self, "scaleToObject", `inScale must be of type number!`);
        this._scaleToObject = true;
        return this.scale(inScale);
    }

    /**
     * Sets the width and the height of the effect in pixels, this size is set before any scaling
     *
     * @param {number} inSize
     * @returns {EffectSection} this
     */
    size(inSize) {
        if (!(typeof inSize === "number" || typeof inSize === "object")) throw this.sequence._throwError(this, "size", "inSize be of type number or object");
        if (typeof inSize === "number") {
            inSize = {
                width: inSize,
                height: inSize
            }
        }

        if((inSize?.width === undefined) ^ (inSize?.height === undefined)){
            if(inSize?.width){
                if (typeof inSize?.width !== "number") throw this.sequence._throwError(this, "size", "inSize.width be of type number");
                inSize['height'] = "auto"
            }else{
                if (typeof inSize?.height !== "number") throw this.sequence._throwError(this, "size", "inSize.height be of type number");
                inSize['width'] = "auto"
            }
        }

        if (typeof inSize?.width !== "number" && inSize?.width !== "auto") throw this.sequence._throwError(this, "size", "inSize.width be of type number");
        if (typeof inSize?.height !== "number" && inSize?.height !== "auto") throw this.sequence._throwError(this, "size", "inSize.height be of type number");
        inSize = {
            width: inSize?.width ?? canvas.grid.size,
            height: inSize?.height ?? canvas.grid.size
        }
        this._size = inSize;
        return this;
    }

    /**
     * Sets the grid size of the file loaded in the Effect. Some files have an established internal
     * grid, so this will make the effect scale up or down to match the active scene's grid size
     *
     * @param {number} inGridSize
     * @returns {EffectSection} this
     */
    gridSize(inGridSize) {
        if (typeof inGridSize !== "number") throw this.sequence._throwError(this, "gridSize", "inGridSize must be of type number");
        this._gridSize = inGridSize;
        this._customTemplate = true;
        return this;
    }

    /**
     *  Defines the start point within the given sprite, starting from the left of the sprite. An example
     *  would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the
     *  'anchor point'
     *
     * @param {number} inStartPoint
     * @returns {EffectSection} this
     */
    startPoint(inStartPoint) {
        if (typeof inStartPoint !== "number") throw this.sequence._throwError(this, "startPoint", "inStartPoint must be of type number");
        this._startPoint = inStartPoint;
        this._customTemplate = true;
        return this;
    }

    /**
     *  The same as the start point, except from the right and how many pixels to offset the target from
     *
     * @param {number} inEndPoint
     * @returns {EffectSection} this
     */
    endPoint(inEndPoint) {
        if (typeof inEndPoint !== "number") throw this.sequence._throwError(this, "endPoint", "inEndPoint must be of type number");
        this._endPoint = inEndPoint;
        this._customTemplate = true;
        return this;
    }

    /**
     *  Anchors the sprite's container according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection} this
     */
    anchor(inAnchor) {
        if (typeof inAnchor === "number") {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (typeof inAnchor.x !== "number") throw this.sequence._throwError(self, "anchor", `inAnchor.x must be of type number!`);
        if (typeof inAnchor.y !== "number") throw this.sequence._throwError(self, "anchor", `inAnchor.y must be of type number!`);

        this._anchor = inAnchor;
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection} this
     */
    spriteAnchor(inAnchor) {
        if (typeof inAnchor === "number") {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (typeof inAnchor.x !== "number") throw this.sequence._throwError(self, "anchor", `inAnchor.x must be of type number!`);
        if (typeof inAnchor.y !== "number") throw this.sequence._throwError(self, "anchor", `inAnchor.y must be of type number!`);

        this._spriteAnchor = inAnchor;
        return this;
    }

    /**
     *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
     *
     *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
     *  outermost edge of the location the sprite is played at
     *
     * @returns {EffectSection} this
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
     * @returns {EffectSection} this
     */
    randomOffset(inOffsetScale = 1.0) {
        if (typeof inOffsetScale !== "number") throw this.sequence._throwError(this, "randomOffset", "inBool must be of type number");
        this._randomOffset = inOffsetScale;
        return this;
    }

    /**
     * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its horizontal axis
     *
     * @returns {EffectSection} this
     */
    randomizeMirrorX() {
        this._randomMirrorX = true;
        return this;
    }

    /**
     * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its vertical axis
     *
     * @returns {EffectSection} this
     */
    randomizeMirrorY() {
        this._randomMirrorY = true;
        return this;
    }

    /**
     * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its horizontal axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection} this
     */
    mirrorX(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "mirrorX", "inBool must be of type boolean");
        this._mirrorX = inBool;
        return this;
    }

    /**
     * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its vertical axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection} this
     */
    mirrorY(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "mirrorY", "inBool must be of type boolean");
        this._mirrorY = inBool;
        return this;
    }

    /**
     * Causes the effect to be played below tokens
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    belowTokens(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "belowTokens", "inBool must be of type boolean");
        this._layer = inBool ? 1 : 2;
        return this;
    }

    /**
     * Causes the effect to be played below tiles
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    belowTiles(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "belowTiles", "inBool must be of type boolean");
        this._layer = inBool ? 0 : 2;
        return this;
    }

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects
     *
     * @param {number} inZIndex
     * @returns {EffectSection} this
     */
    zIndex(inZIndex) {
        if (typeof inZIndex !== "number") throw this.sequence._throwError(this, "zIndex", "inZIndex must be of type number");
        this._zIndex = inZIndex;
        return this;
    }

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects
     *
     * @param {number} inExtraDuration
     * @returns {EffectSection} this
     */
    extraEndDuration(inExtraDuration) {
        if (typeof inExtraDuration !== "number") throw this.sequence._throwError(this, "extraEndDuration", "inExtraDuration must be of type number");
        this._extraEndDuration = inExtraDuration;
        return this;
    }

    /**
     * Causes the effect to not rotate should its container rotate
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    zeroSpriteRotation(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "zeroSpriteRotation", "inBool must be of type boolean");
        this._zeroSpriteRotation = inBool;
        return this;
    }

    /**
     * If the effect would loop due to its duration or persistence, this causes it not to
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    noLoop(inBool = true) {
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "noLoop", "inBool must be of type boolean");
        this._noLoop = inBool;
        return this;
    }

    /**
     * Causes the effect to be played in screen space instead of world space (where tokens are)
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    screenSpace(inBool = true){
        if (typeof inBool !== "boolean") throw this.sequence._throwError(this, "screenSpace", "inBool must be of type boolean");
        this._screenSpace = inBool;
        return this;
    }

    /**
     *  Positions the effect in a screen space position, offset from its .screenSpaceAnchor()
     *
     * @param {object} inPosition
     * @returns {EffectSection} this
     */
    screenSpacePosition(inPosition) {
        inPosition = {
            x: inPosition?.x ?? 0,
            y: inPosition?.y ?? 0
        }
        if (typeof inPosition.x !== "number") throw this.sequence._throwError(self, "screenSpacePosition", `inPosition.x must be of type number!`);
        if (typeof inPosition.y !== "number") throw this.sequence._throwError(self, "screenSpacePosition", `inPosition.y must be of type number!`);
        this._screenSpacePosition = inPosition;
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number in screen space
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection} this
     */
    screenSpaceAnchor(inAnchor) {
        if (typeof inAnchor === "number") {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        if (typeof inAnchor.x !== "number") throw this.sequence._throwError(self, "screenSpaceAnchor", `inAnchor.x must be of type number!`);
        if (typeof inAnchor.y !== "number") throw this.sequence._throwError(self, "screenSpaceAnchor", `inAnchor.y must be of type number!`);

        this._screenSpaceAnchor = inAnchor;
        return this;
    }

    /**
     *  Sets up various properties relating to scale of the effect on the screen
     *
     * @param {object} inOptions
     * @returns {EffectSection} this
     */
    screenSpaceScale(inOptions){

        inOptions = foundry.utils.mergeObject({
            x: 1.0,
            y: 1.0,
            fitX: false,
            fitY: false,
            ratioX: false,
            ratioY: false
        }, inOptions)

        if (typeof inOptions.x !== "number") throw this.sequence._throwError(self, "screenSpaceScale", `inOptions.x must be of type number!`);
        if (typeof inOptions.y !== "number") throw this.sequence._throwError(self, "screenSpaceScale", `inOptions.y must be of type number!`);
        if (typeof inOptions.fitX !== "boolean") throw this.sequence._throwError(this, "screenSpaceScale", "inOptions.fitX must be of type boolean");
        if (typeof inOptions.fitY !== "boolean") throw this.sequence._throwError(this, "screenSpaceScale", "inOptions.fitY must be of type boolean");
        if (typeof inOptions.ratioX !== "boolean") throw this.sequence._throwError(this, "screenSpaceScale", "inOptions.ratioX must be of type boolean");
        if (typeof inOptions.ratioY !== "boolean") throw this.sequence._throwError(this, "screenSpaceScale", "inOptions.ratioY must be of type boolean");

        if(inOptions.ratioX && inOptions.ratioY) throw this.sequence._throwError(this, "screenSpaceScale", "both ratioX and ratioY cannot be true, one axis must fit or be set directly")

        this._screenSpaceScale = inOptions;

        return this;
    }

    _expressWarnings(){
        if(this._reachTowards && this._anchor){
            this.sequence._showWarning(this, "reachTowards", "you have called .reachTowards() and .anchor() - reachTowards will manually set the X axis of the anchor and may not behave like you expect.", true);
        }
        if(this._reachTowards && (this._scaleMin || this._scaleMax)){
            this.sequence._showWarning(this, "reachTowards", "you have called .reachTowards() and .scale() - reachTowards will manually set the scale of the effect, completely ruining your scaling attempts. Try .gridSize() instead.", true);
        }
        if(this._reachTowards && this._scaleToObject){
            throw this.sequence._throwError(this, "reachTowards", "You're trying to reach towards an object, while scaling to fit another??? Make up your mind!");
        }
        if(this._reachTowards && this._randomRotation){
            throw this.sequence._throwError(this, "reachTowards", "You're trying to reach towards an object, while trying to randomly rotate the effect? What?");
        }
        if(this._atLocation && this._attachTo){
            this.sequence._showWarning(this, "atLocation", "you have called .attachTo() and .atLocation() on this effect, calling .atLocation() makes this effect static. Please use only one.", true);
        }
    }


    async run() {
        this._expressWarnings();
        const data = await this._sanitizeEffectData();
        Hooks.call("preCreateSequencerEffect", data);
        let push = !(data.users.length === 1 && data.users.includes(game.userId));
        let canvasEffectData = await Sequencer.EffectManager.play(data, push);
        let totalDuration = this._currentWaitTime;
        if (this._persist) {
            totalDuration += await canvasEffectData.promise;
        } else {
            totalDuration += canvasEffectData.duration;
        }
        await new Promise(resolve => setTimeout(resolve, totalDuration))
    }

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
    }

    async _sanitizeEffectData() {

        let data = {
            id: randomID(),
            moduleName: this.sequence.moduleName,
            creatorUserId: game.userId,
            file: this._file,
            position: {
                x: 0,
                y: 0,
            },
            anchor: this._anchor,
            spriteAnchor: this._spriteAnchor,
            scale: {
                x: 1.0,
                y: 1.0
            },
            name: this._name,
            persist: this._persist,
            attachTo: this._attachTo ? this._from.id : false,
            gridSizeDifference: 1.0,
            angle: this._angle,
            rotation: 0,
            speed: 0,
            playbackRate: this._playbackRate,
            distance: 0,
            duration: this._duration,
            extraEndDuration: this._extraEndDuration,
            layer: this._layer,
            index: this.sequence.effectIndex,
            zIndex: this._zIndex,
            opacity: typeof this._opacity === "number" ? this._opacity : 1.0,
            audioVolume: this._volume,
            time: false,
            noLoop: this._noLoop,
            filters: this._filters,
            animatedProperties: {
                moves: this._moveTowards,
                fadeIn: this._fadeIn,
                fadeOut: this._fadeOut,
                scaleIn: this._scaleIn,
                scaleOut: this._scaleOut,
                rotateIn: this._rotateIn,
                rotateOut: this._rotateOut,
                fadeInAudio: this._fadeInAudio,
                fadeOutAudio: this._fadeOutAudio,
                animations: this._animations
            },
            zeroSpriteRotation: this._zeroSpriteRotation,
            screenSpace: this._screenSpace,
            screenSpaceAnchor: this._screenSpaceAnchor,
            screenSpacePosition: this._screenSpacePosition,
            screenSpaceScale: this._screenSpaceScale,
            sceneId: game.user.viewedScene,
            users: Array.from(this._users)
        };

        data = this._determineTargets(data);

        data.rotation += this._randomRotation ? Math.random() * Math.PI : 0;

        for (let override of this._overrides) {
            data = await override(this, data);
        }

        let file = await this._determineFile(data.file);
        let template;
        if (file instanceof lib.SequencerFile) {
            data.file = file.rangeFind ? this._rangeFind(file) : file.getFile();
            template = file.template;
            if (file.timeRange) {
                [this._startTime, this._endTime] = file.timeRange;
                this._isRange = true;
            }
        } else {
            data.file = file;
        }

        template = this._customTemplate ? this._determineTemplate(data.file) : (template ?? this._determineTemplate(data.file));

        this._gridSize = template[0];
        this._startPoint = template[1];
        this._endPoint = template[2];
        data.template = template;

        if(this._startTime || this._endTime) {
            data.time = {
                start: typeof this._startTime === "number" ? {
                    value: this._startTime,
                    isPerc: this._startPerc
                } : false,
                end: typeof this._endTime === "number" ? {
                    value: this._endTime,
                    isPerc: this._endPerc
                } : false,
                isRange: this._isRange
            };
        }

        let scale = this._scaleMin;
        if (typeof this._scaleMin === "number") {
            if (this._scaleMax && typeof this._scaleMax === "number") {
                scale = lib.random_float_between(this._scaleMin, this._scaleMax);
            }
            scale = {
                x: scale,
                y: scale
            }
        }

        data.scale = {
            x: data.scale.x * (scale?.x ?? 1.0),
            y: data.scale.y * (scale?.y ?? 1.0)
        }

        if(this._scaleToObject){
            const object = this._getCachedObject(this._from, this._to);
            data.size = this._getObjectSize(object);
        }else{
            data.size = this._size;
        }

        if (this._reachTowards) {
            data = await this._calculateHitVector(data);
        } else {
            data.gridSizeDifference = this._size ? 1.0 : this._gridSizeDifference(this._gridSize);
        }

        let flipX = this._mirrorX || (this._randomMirrorX && Math.random() < 0.5) ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._mirrorY || (this._randomMirrorY && Math.random() < 0.5) ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

        for (let override of this._postOverrides) {
            data = await override(this, data);
        }

        if (typeof data.file !== "string") {
            throw this.sequence._throwError(this, "file", "inFile must be of type string or array");
        }

        return data;

    }

    get _to() {
        return this._reachTowards || this._rotateTowards?.target || this._moveTowards?.target || false;
    }

    _determineTargets(data) {

        if (this._from) {

            let [from, to, origin, target] = this._getPositions(this._from, this._to);

            if (this._attachTo){
                const size = this._getHalfSize(this._from);
                origin = {
                    x: size.width,
                    y: size.height
                };
            }

            if (this._offset) {
                let offset = this._offset;
                if (this._offset.local) {
                    let target = to || from;
                    if (target?.data?.rotation) offset = lib.rotateVector(offset, target.data.rotation);
                }
                if (to) {
                    target.x -= offset.x;
                    target.y -= offset.y;
                } else {
                    origin.x -= offset.x;
                    origin.y -= offset.y;
                }
            }

            if (this._to) {
                target = this._snapToGrid
                    ? this._applyOffsets(this._snapLocationToGrid(target))
                    : this._applyOffsets(target);
            } else {
                origin = this._snapToGrid
                    ? this._applyOffsets(this._snapLocationToGrid(origin))
                    : this._applyOffsets(origin);
            }

            data.position = origin;

            if (this._to) {

                let ray = new Ray(origin, target);

                this._distance = ray.distance;
                data.distance = this._distance;
                data._distance = this._distance;

                data.rotation = ray.angle;

                if (this._moveTowards) {

                    data.rotation = this._moveTowards.rotate ? data.rotation : 0;

                    data.animatedProperties.moves.target = target;

                    data.speed = this._moveSpeed;

                }

            }

        }

        return data;
    }

    get _distanceMatching() {
        return {
            "90ft": canvas.grid.size * 15,
            "60ft": canvas.grid.size * 9,
            "30ft": canvas.grid.size * 5,
            "15ft": canvas.grid.size * 2,
            "05ft": 0
        }
    }

    _rangeFind(inFile) {

        let distances = Object.keys(inFile.file)
            .filter(entry => Object.keys(this._distanceMatching).indexOf(entry) > -1)
            .map(entry => {
                let file = inFile.getFile(entry);
                if (!file) throw this.sequence._throwError(this, "play", `Could not find index ${inFile.fileIndex} in database entry ${this._file}!`)
                let template = inFile.template ?? this._determineTemplate(file);
                let gridSizeDiff = this._gridSizeDifference(template[0]);
                return {
                    file: file,
                    gridSizeDiff: gridSizeDiff,
                    minDistance: this._distanceMatching[entry] / gridSizeDiff
                }
            });

        let uniqueDistances = [...new Set(distances.map(item => item.minDistance))];
        uniqueDistances.sort((a, b) => a - b);

        let max = Math.max(...uniqueDistances);
        let min = Math.min(...uniqueDistances);

        let possibleFiles = distances
            .map(entry => {
                entry.distances = {
                    min: entry.minDistance === min ? 0 : entry.minDistance,
                    max: entry.minDistance === max ? Infinity : uniqueDistances[uniqueDistances.indexOf(entry.minDistance) + 1]
                };
                entry.relativeDistance = this._distance / entry.gridSizeDiff;
                return entry;
            })
            .filter(e => e.relativeDistance >= e.distances.min && e.relativeDistance < e.distances.max);

        return lib.random_array_element(possibleFiles).file;

    }

    _gridSizeDifference(inGridSize) {
        return canvas.grid.size / inGridSize;
    }

    _determineTemplate(inFile) {

        if (!this._JB2A) return [this._gridSize, this._startPoint, this._endPoint];

        let type = "ranged";
        if (inFile.toLowerCase().includes("/melee/") || inFile.toLowerCase().includes("/unarmed_attacks/")) {
            type = "melee";
        } else if (inFile.toLowerCase().includes("/cone/") || inFile.toLowerCase().includes("_cone_")) {
            type = "cone";
        }
        return {
            "ranged": [200, 200, 200],
            "melee": [200, 300, 300],
            "cone": [200, 0, 0]
        }[type];
    }

    async _getFileDimensions(inFile) {
        let filePath = inFile.startsWith(this._baseFolder) ? inFile : this._baseFolder + inFile;
        return await lib.getDimensions(filePath);
    }

    _getTrueLength(inDimensions) {
        return inDimensions.x - this._startPoint - this._endPoint;
    }

    async _calculateHitVector(data) {

        if (data.distance === 0) return data;

        let dimensions = await this._getFileDimensions(data.file);
        let trueDistanceAfterPadding = this._getTrueLength(dimensions);

        data.scale.x = data.distance / trueDistanceAfterPadding;
        data.scale.y = data.distance / trueDistanceAfterPadding;

        data.anchor = {
            x: this._startPoint / dimensions.x,
            y: data.anchor.y ?? 0.5
        }

        return data;
    }

    _getCleanPosition(obj, measure = false) {

        let pos = {};
        if (obj instanceof MeasuredTemplate) {
            if (measure) {
                if (obj.data.t === "cone" || obj.data.t === "ray") {
                    pos.x = obj.ray.B.x;
                    pos.y = obj.ray.B.y;
                }
            }
            if (obj.data.t === "rect") {
                pos.x = obj.x + (obj.shape.width / 2)
                pos.y = obj.y + (obj.shape.height / 2)
            }
        } else if (obj instanceof Tile || obj instanceof TileDocument) {
            pos = {
                x: obj.data.x + (obj.data.width / 2),
                y: obj.data.y + (obj.data.height / 2)
            }
        } else {
            pos = {
                x: obj?.x ?? obj?.position?.x ?? obj?.position?._x ?? obj?.data?.x ?? obj?.data?.position?.x ?? 0,
                y: obj?.y ?? obj?.position?.y ?? obj?.position?._y ?? obj?.data?.y ?? obj?.data?.position?.y ?? 0
            }

            if (obj instanceof Token) {
                const halfSize = this._getHalfSize(obj);
                pos.x += halfSize.width;
                pos.y += halfSize.height;
            }
        }

        pos = {
            x: pos?.x ?? obj?.x ?? obj?.data?.x,
            y: pos?.y ?? obj?.y ?? obj?.data?.y,
        };

        if (typeof pos.x !== "number" || typeof pos.y !== "number") throw this.sequence._throwError(self, "getCleanPosition", `Could not get position from: ${obj}`);

        return pos;

    }

    _getHalfSize(inObj) {
        const size = this._getObjectSize(inObj)
        return {
            width: size.width / 2,
            height: size.height / 2
        }
    }

    _getObjectSize(inObj) {
        const width =
               inObj?.hitArea?.width
            ?? inObj?.w
            ?? inObj?.shape?.width
            ?? inObj?.shape?.radius*2
            ?? canvas.grid.size;

        const height =
               inObj?.hitArea?.height
            ?? inObj?.h
            ?? inObj?.shape?.height
            ?? inObj?.shape?.radius*2
            ?? canvas.grid.size;

        return {
            width,
            height
        }
    }

    _getPositions(from, to, applyOffsets = true) {

        let from_offset = { x: 0, y: 0 };
        if (typeof from === "string") {
            let cachedFrom = this._getCachedOffset(from, this._currentRepetition);
            from = cachedFrom.object;
            from_offset = cachedFrom.offset;
            if (cachedFrom.extraOffset && applyOffsets) {
                from_offset.x += cachedFrom.extraOffset.x;
                from_offset.y += cachedFrom.extraOffset.y;
            }
        }

        let to_offset = { x: 0, y: 0 };
        if (typeof to === "string") {
            let cachedTo = this._getCachedOffset(to, this._currentRepetition);
            to = cachedTo.object;
            to_offset = cachedTo.offset;
            if (cachedTo.extraOffset && applyOffsets) {
                to_offset.x += cachedTo.extraOffset.x;
                to_offset.y += cachedTo.extraOffset.y;
            }
        }

        let from_position = this._getCleanPosition(from);
        let to_position = this._getCleanPosition(to, true);

        from_position.x -= from_offset.x;
        from_position.y -= from_offset.y;

        if (to) {
            to_position.x -= to_offset.x;
            to_position.y -= to_offset.y;
        }

        return [from, to, from_position, to_position];

    }

    _getCachedObject(from, to){

        if (typeof to === "string") {
            return this._getCachedOffset(to, this._currentRepetition).object;
        }else if(to){
            return to;
        }

        if (typeof from === "string") {
            return this._getCachedOffset(from, this._currentRepetition).object;
        }else{
            return from;
        }

    }

    _applyOffsets(inPosition) {
        let offset = this._offsets[this._currentRepetition] ?? { x: 0, y: 0 };
        inPosition.x -= offset.x;
        inPosition.y -= offset.y;
        return inPosition;
    }

    async _initialize() {
        this._offsets = [];
        for (let index = 0; index < this._repetitions; index++) {
            await this._cacheOffsets();
        }
    }

    async _cacheOffsets() {

        let [from, to, from_target, to_target] = this._getPositions(this._from, this._to, false);

        from_target = this._calculateMissedPosition(from, from_target, !this._to && this._missed);
        to_target = to ? this._calculateMissedPosition(to, to_target, this._missed, from_target) : false;

        const from_origin = this._getCleanPosition(from);
        const to_origin = this._getCleanPosition(to, true);

        const origin_object = to || from;
        const origin_position = to ? to_origin : from_origin;
        const target_position = to ? to_target : from_target;

        let offset = {
            x: this._missed ? origin_position.x - target_position.x : 0,
            y: this._missed ? origin_position.y - target_position.y : 0
        }

        if (this._randomOffset) offset = this._getRandomOffset(to || from, offset)

        this._offsets.push(offset);

        if (this._name) {
            this._insertCachedOffset(
                this._name,
                origin_object,
                offset,
                this._offset
            );
        }

    }

    _insertCachedOffset(inName, inObject, inOffset, inExtraOffset) {
        if (this.sequence._cachedOffsets === undefined) {
            this.sequence._cachedOffsets = {};
        }
        if (this.sequence._cachedOffsets[inName] === undefined) {
            this.sequence._cachedOffsets[inName] = [];
        }
        this.sequence._cachedOffsets[inName].push({
            "object": inObject,
            "offset": inOffset,
            "extraOffset": inExtraOffset
        });
    }

    _cachedOffsetExists(inName) {
        return typeof inName === "string" && this.sequence._cachedOffsets[inName] !== undefined;
    }

    _getCachedOffset(inName, inIndex) {
        if (!this.sequence._cachedOffsets.hasOwnProperty(inName)) console.error(`${inName} could not be found in previous positions!`);
        let normalizedIndex = inIndex % this.sequence._cachedOffsets[inName].length;
        return this.sequence._cachedOffsets?.[inName]?.[normalizedIndex];
    }

    _validateLocation(inLocation) {
        if(this._cachedOffsetExists(inLocation)) return inLocation;
        return super._validateLocation(inLocation);
    }

    _calculateMissedPosition(target, position, missed, origin_position) {

        if (!missed) return position;

        const size = this._getHalfSize(target);
        const halfWidth = size.width;
        const halfHeight = size.height;

        const XorY = Math.random() < 0.5;
        const flipX = Math.random() > 0.5 ? -1 : 1;
        const flipY = Math.random() > 0.5 ? -1 : 1;

        const tokenOffset = canvas.grid.size / 5;

        if(!origin_position){

            // If it's X, random position in Y axis
            if (XorY) {
                position.x += (halfWidth + lib.random_float_between(tokenOffset, canvas.grid.size / 2)) * flipX;
                position.y += lib.random_float_between(tokenOffset, halfHeight + canvas.grid.size / 2) * flipY;
            } else {
                position.x += lib.random_float_between(tokenOffset, halfWidth + canvas.grid.size / 2) * flipX;
                position.y += (halfHeight + lib.random_float_between(tokenOffset, canvas.grid.size / 2)) * flipY;
            }

            return position;

        }

        const ray = new Ray(position, origin_position);

        let startRadians = ray.angle - (Math.PI/2);
        let endRadians = startRadians + (Math.PI);

        const radius = lib.lerp(halfHeight, halfHeight, 0.5);

        let distance = (ray.distance / canvas.grid.size) - 1;

        if(distance <= 1.25){

            const randomAngle = XorY ? startRadians : endRadians;

            let x = position.x + Math.cos(randomAngle) * (radius * lib.random_float_between(1.5, 2.5));
            let y = position.y + Math.sin(randomAngle) * (radius * lib.random_float_between(1.5, 2.5));

            if(x === position.x) x += lib.random_float_between(tokenOffset*-1, tokenOffset);
            if(y === position.y) y += lib.random_float_between(tokenOffset*-1, tokenOffset);

            return { x, y };

        }

        distance = Math.max(Math.abs(distance - 15), 6);

        endRadians += (Math.PI / distance);
        startRadians -= (Math.PI / distance);

        const randomAngle = lib.lerp(startRadians, endRadians, Math.random());

        const x = position.x + Math.cos(randomAngle) * (radius * lib.random_float_between(1.5, 2.5));
        const y = position.y + Math.sin(randomAngle) * (radius * lib.random_float_between(1.5, 2.5));

        return { x, y };

    }

    _snapLocationToGrid(inLocation) {
        const coords = canvas.grid.grid.getGridPositionFromPixels(inLocation.x, inLocation.y);
        return {
            x: coords[1] * canvas.grid.size,
            y: coords[0] * canvas.grid.size
        }
    }

    _getRandomOffset(target, position) {

        const width = ((target?.data?.width ?? 1) * canvas.grid.size) * this._randomOffset;
        const height = ((target?.data?.height ?? 1) * canvas.grid.size) * this._randomOffset;

        position.x += lib.random_float_between((width / 2) * -1, width / 2);
        position.y += lib.random_float_between((height / 2) * -1, height / 2);

        return position;

    }

}