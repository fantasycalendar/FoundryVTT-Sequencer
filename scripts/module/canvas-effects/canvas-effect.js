import CONSTANTS from "../constants.js";
import filters from "../lib/filters.js";
import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { SequencerFile, SequencerFileRangeFind } from "../sequencer-file.js";
import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import flagManager from "../flag-manager.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../../sockets.js";
import SequencerEffectManager from "../sequencer-effect-manager.js";
import { SequencerAboveUILayer } from "./effects-layer.js";
import VisionSamplerShader from "../lib/filters/vision-mask-filter.js";

export default class CanvasEffect extends PIXI.Container {
    
    static make(inData) {
        return !inData.persist
            ? new CanvasEffect(inData)
            : new PersistentCanvasEffect(inData);
    }
    
    static checkValid(effectData) {
        let sourceExists = true;
        let targetExists = true;
        if (effectData.source && lib.is_UUID(effectData.source)) {
            sourceExists = lib.from_uuid_fast(effectData.source);
        }
        if (effectData.target && lib.is_UUID(effectData.target)) {
            targetExists = lib.from_uuid_fast(effectData.target);
        }
        if (effectData.source && lib.is_UUID(effectData.source) && effectData.target && lib.is_UUID(effectData.target)) {
            const sourceScene = effectData.source.split(".")[1];
            const targetScene = effectData.target.split(".")[1];
            if (sourceScene !== targetScene || sourceScene !== effectData.sceneId) return false;
        }
        return sourceExists && targetExists;
    }
    
    #elevation = 0;
    #sort = 0;
    
    constructor(inData) {
        super();
        
        this.sortableChildren = true;
        
        // Set default values
        this.actualCreationTime = (+new Date())
        this.data = inData;
        
        this._resolve = null;
        this._durationResolve = null;
        
        this._ended = false;
        this._isEnding = false;
        
        this._isDestroyed = false;
        
    }
    
    /** @type {number} */
    get elevation() {
        return this.#elevation;
    }
    
    set elevation(value) {
        this.#elevation = value;
    }
    
    /** @type {number} */
    get sort() {
        return this.#sort;
    }
    
    set sort(value) {
        this.#sort = value;
    }
    
    get context() {
        return this.data.attachTo?.active && this.sourceDocument ? this.sourceDocument : game.scenes.get(this.data.sceneId);
    }
    
    static get protectedValues() {
        return [
            '_id',
            'sequenceId',
            'creationTimestamp',
            'creatorUserId',
            'moduleName',
            'index',
            'repetition',
            'moves',
            'fadeIn',
            'fadeOut',
            'scaleIn',
            'scaleOut',
            'rotateIn',
            'rotateOut',
            'fadeInAudio',
            'fadeOutAudio',
            'animations',
            'nameOffsetMap',
            'persist'
        ];
    }
    
    /**
     * The ID of the effect
     *
     * @returns {string}
     */
    get id() {
        return this.data._id;
    }
    
    /**
     * The UUID of the effect
     *
     * @returns {string}
     */
    get uuid() {
        if (!lib.is_UUID(this.context.uuid)) {
            return this.id;
        }
        return this.context.uuid + ".data.flags.sequencer.effects." + this.id;
    }
    
    /**
     * Whether the source of this effect is temporary
     *
     * @returns {boolean}
     */
    get isSourceTemporary() {
        return this.data.attachTo?.active && this.sourceDocument && !lib.is_UUID(this.sourceDocument?.uuid);
    }
    
    /**
     * Whether the source of this effect has been destroyed
     *
     * @returns {boolean}
     */
    get isSourceDestroyed() {
        return this.source && (this.source?.destroyed || this.sourceDocument?._destroyed);
    }
    
    /**
     * Whether the target of this effect is temporary
     *
     * @returns {boolean}
     */
    get isTargetTemporary() {
        return (this.data.stretchTo?.attachTo || this.data.rotateTowards?.attachTo) && this.targetDocument && !lib.is_UUID(this.targetDocument.uuid);
    }
    
    
    /**
     * Whether the target of this effect has been destroyed
     *
     * @returns {boolean}
     */
    get isTargetDestroyed() {
        return this.target && (this.target?.destroyed || this.targetDocument?._destroyed);
    }
    
    /**
     * Gets the source hook name
     *
     * @param {string} type
     * @returns {string|boolean}
     */
    getSourceHook(type = "") {
        if (!lib.is_UUID(this.data.source)) return false;
        return type + this.data.source.split('.')[2];
    }
    
    /**
     * The source object (or source location) of the effect
     *
     * @returns {boolean|object}
     */
    get source() {
        if (!this._source && this.data.source) {
            this._source = this._getObjectByID(this.data.source);
            this._source = this._source?._object ?? this._source;
        }
        return this._source;
    }
    
    /**
     * Retrieves the source document
     *
     * @returns {Document|PlaceableObject}
     */
    get sourceDocument() {
        return this.source?.document ?? this.source;
    }
    
    /**
     * The source object's current position, or its current position
     *
     * @returns {boolean|object}
     */
    getSourceData() {
        
        if (this.data.temporary && !this.owner) {
            return SequencerEffectManager.getPositionForUUID(this.data.source);
        }
        
        const position = this.source instanceof PlaceableObject && !this.isSourceTemporary
            ? canvaslib.get_object_position(this.source)
            : (this.source?.worldPosition || this.source?.center || this.source);
        
        const rotation = this.source instanceof MeasuredTemplate && this.sourceDocument?.t !== "rect"
            ? Math.normalizeRadians(Math.toRadians(this.sourceDocument?.direction))
            : this.sourceDocument?.rotation ? Math.normalizeRadians(Math.toRadians(this.sourceDocument?.rotation)) : 0;
        
        const alpha = (this.source instanceof TokenDocument || this.source instanceof TileDocument) ? this.sourceDocument?.alpha ?? 1.0 : 1.0;
        
        return {
            position,
            rotation,
            alpha,
            ...canvaslib.get_object_dimensions(this.source)
        };
    }
    
    /**
     * The source position with the relevant offsets calculated
     *
     * @returns {{x: number, y: number}}
     */
    get sourcePosition() {
        
        const position = this.getSourceData().position;
        const offset = this._getOffset(this.data.source, true);
        
        return {
            x: position.x - offset.x,
            y: position.y - offset.y
        };
        
    }
    
    /**
     * Gets the target hook name
     *
     * @param {string} type
     * @returns {string|boolean}
     */
    getTargetHook(type = "") {
        if (!lib.is_UUID(this.data.target)) return false;
        return type + this.data.target.split('.')[2];
    }
    
    /**
     * The target object (or target location) of the effect
     *
     * @returns {boolean|object}
     */
    get target() {
        if (!this._target && this.data.target) {
            this._target = this._getObjectByID(this.data.target);
            this._target = this._target?._object ?? this._target;
        }
        return this._target;
    }
    
    /**
     * Retrieves the document of the target
     *
     * @returns {Document|PlaceableObject}
     */
    get targetDocument() {
        return this.target?.document ?? this.target;
    }
    
    /**
     * The target object's current position, or its current position
     *
     * @returns {boolean|object}
     */
    getTargetData() {
        
        if (this.data.temporary && !this.owner) {
            return SequencerEffectManager.getPositionForUUID(this.data.target) ?? this.getSourceData();
        }
        
        const position = this.target instanceof PlaceableObject && !this.isTargetTemporary
            ? canvaslib.get_object_position(this.target, { measure: true })
            : (this.target?.worldPosition || this.target?.center || this.target);
        
        const rotation = this.target instanceof MeasuredTemplate && this.targetDocument?.t !== "rect"
            ? Math.normalizeRadians(Math.toRadians(this.targetDocument?.direction))
            : this.targetDocument?.rotation ? Math.normalizeRadians(Math.toRadians(this.targetDocument?.rotation)) : 0;
        
        const alpha = (this.target instanceof TokenDocument || this.target instanceof TileDocument) ? this.targetDocument?.alpha ?? 1.0 : 1.0;
        
        return {
            position,
            rotation,
            alpha,
            ...canvaslib.get_object_dimensions(this.target)
        };
    }
    
    /**
     * The target position with the relevant offsets calculated
     *
     * @returns {{x: number, y: number}}
     */
    get targetPosition() {
        
        const position = this.getTargetData().position;
        const offset = this._getOffset(this.data.target);
        
        return {
            x: position.x - offset.x,
            y: position.y - offset.y
        };
        
    }
    
    /**
     * Calculates the offset for a given offset property and name mapping
     *
     * @param {string} offsetMapName
     * @param {boolean} source
     * @returns {{x: number, y: number}|*}
     * @private
     */
    _getOffset(offsetMapName, source = false) {
        
        const key = source ? "source" : "target";
        
        if (!this._offsetCache[key]) {
            this._offsetCache[key] = {};
        }
        
        const offset = {
            x: 0,
            y: 0
        }
        
        let twister = this._twister;
        
        let nameOffsetMap = this._nameOffsetMap?.[this.data.name];
        
        if (nameOffsetMap) {
            twister = nameOffsetMap.twister;
        }
        
        // If the effect is missing, and it's not the source we're offsetting OR it is the source, but we don't have a target (it's playing on the spot)
        if (this.data.missed && (!source || !this.data.target)) {
            let missedOffset = this._offsetCache[key]?.missedOffset || canvaslib.calculate_missed_position(this.source, this.target, twister);
            this._offsetCache[key].missedOffset = missedOffset;
            offset.x -= missedOffset.x;
            offset.y -= missedOffset.y;
        }
        
        const obj = source ? this.source : this.target;
        const multiplier = source ? this.data.randomOffset?.source : this.data.randomOffset?.target;
        
        if (obj && multiplier) {
            let randomOffset = this._offsetCache[key]?.randomOffset || canvaslib.get_random_offset(obj, multiplier, twister);
            this._offsetCache[key].randomOffset = randomOffset;
            offset.x -= randomOffset.x;
            offset.y -= randomOffset.y;
        }
        
        let extraOffset = this.data?.offset?.[key];
        if (extraOffset) {
            let newOffset = {
                x: extraOffset.x,
                y: extraOffset.y
            }
            if (extraOffset.gridUnits) {
                newOffset.x *= canvas.grid.size;
                newOffset.y *= canvas.grid.size;
            }
            if (extraOffset.local) {
                newOffset = canvaslib.rotateAroundPoint(0, 0, newOffset.x, newOffset.y, -this.rotationContainer.angle);
            }
            offset.x -= newOffset.x;
            offset.y -= newOffset.y;
        }
        
        let offsetMap = this._nameOffsetMap?.[offsetMapName];
        
        if (!this._offsetCache[key][offsetMapName]) {
            this._offsetCache[key][offsetMapName] = {};
        }
        
        if (offsetMap) {
            
            if (offsetMap.missed) {
                const missedOffset = this._offsetCache[key][offsetMapName]?.missedOffset || canvaslib.calculate_missed_position(offsetMap.sourceObj, offsetMap.targetObj, offsetMap.twister);
                this._offsetCache[key][offsetMapName].missedOffset = missedOffset;
                offset.x -= missedOffset.x;
                offset.y -= missedOffset.y;
            }
            
            const obj = source ? offsetMap.randomOffset?.sourceObj : offsetMap.randomOffset?.targetObj;
            const multiplier = source ? offsetMap.randomOffset?.sourceObj : offsetMap.randomOffset?.target;
            
            if (obj && multiplier) {
                let randomOffset = this._offsetCache[key][offsetMapName]?.randomOffset || canvaslib.get_random_offset(obj, multiplier, twister);
                this._offsetCache[key][offsetMapName].randomOffset = randomOffset;
                offset.x -= randomOffset.x;
                offset.y -= randomOffset.y;
            }
            
            if (offsetMap.offset) {
                offset.x += offsetMap.offset.x;
                offset.y += offsetMap.offset.y;
            }
            
        }
        
        return offset;
        
    }
    
    /**
     * Initializes the name offset map by establishing targets
     *
     * @param inOffsetMap
     * @returns {{setup}|*}
     * @private
     */
    _setupOffsetMap(inOffsetMap) {
        
        if (!inOffsetMap.setup) {
            inOffsetMap.setup = true;
            inOffsetMap.sourceObj = this._validateObject(inOffsetMap.source);
            inOffsetMap.targetObj = this._validateObject(inOffsetMap.target);
            const repetition = this.data.repetition % inOffsetMap.repetitions;
            const seed = lib.get_hash(`${inOffsetMap.seed}-${repetition}`);
            inOffsetMap.twister = new MersenneTwister(seed);
        }
        
        return inOffsetMap;
    }
    
    /**
     * Returns this effect's world position
     *
     * @returns {{x: number, y: number}}
     */
    get worldPosition() {
        const t = canvas.stage.worldTransform;
        return {
            x: (this.sprite.worldTransform.tx - t.tx) / canvas.stage.scale.x,
            y: (this.sprite.worldTransform.ty - t.ty) / canvas.stage.scale.y
        }
    }
    
    /**
     * Whether the current user is the owner of this effect
     *
     * @returns {boolean}
     */
    get owner() {
        return this.data.creatorUserId === game.user.id;
    }
    
    /**
     * Whether the current user can update this effect
     *
     * @returns {boolean}
     */
    get userCanUpdate() {
        return game.user.isGM
            || this.owner
            || (this.data.attachTo?.active && this.sourceDocument.canUserModify(game.user, "update"));
    }
    
    /**
     * Whether the current user can delete this effect
     *
     * @returns {boolean}
     */
    get userCanDelete() {
        return this.userCanUpdate || lib.user_can_do("permissions-effect-delete");
    }
    
    /**
     * Whether this effect is on the current scene
     *
     * @returns {boolean}
     */
    get onCurrentScene() {
        return this.data.sceneId === game.user.viewedScene;
    }
    
    /**
     * Whether this effect should be shown as faded or not - effects created by users for other users should be shown
     * for all
     *
     * @returns {boolean}
     */
    get shouldShowFadedVersion() {
        // If the user has not set the opacity user-specific effects to 0
        // And it is not an effect that is only played for the user who created the effect
        // And if the effect is going to be played for a subset of users
        // And the users does not contain this user
        return game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") !== 0
            && this.data.users
            && this.data.users.length
            && !(this.data.users.length === 1 && this.data.users.includes(this.data.creatorUserId))
            && !this.data.users.includes(game.userId);
    }
    
    /**
     * Getter for the current playing video of the effect
     *
     * @returns {null|*}
     */
    get video() {
        return this._video;
    }
    
    /**
     * Setter for the current playing video of the effect
     */
    set video(inVideo) {
        
        if (!inVideo) return;
        
        inVideo.playbackRate = this.data.playbackRate ? this.data.playbackRate : 1.0;
        
        if (!this._video) {
            this._video = inVideo;
            return;
        }
        
        const isLooping = this._video?.loop;
        const currentTime = this._video.currentTime;
        
        this._video = inVideo;
        
        this._video.currentTime = this.playNaturally ? 0 : Math.min(currentTime, this._video.duration);
        this._video.loop = isLooping;
        
        this._texture.update();
        
    }
    
    /**
     * The template of the effect, determining the effect's internal grid size, and start/end padding
     *
     * @returns {object}
     */
    get template() {
        return foundry.utils.mergeObject({
            gridSize: 100,
            startPoint: 0,
            endPoint: 0
        }, this._template ?? {})
    }
    
    /**
     * The grid size difference between the internal effect's grid vs the grid on the canvas. If the effect is in screen space, we ignore this.
     *
     * @returns {number}
     */
    get gridSizeDifference() {
        return canvas.grid.size / this.template.gridSize;
    }
    
    /**
     * Whether the effect should be flipped on any given axis
     *
     * @returns {number}
     */
    get flipX() {
        return this.data.flipX ? -1 : 1;
    }
    
    get flipY() {
        return this.data.flipY ? -1 : 1;
    }
    
    /**
     * Whether this effect should play at all, depending on a multitude of factors
     *
     * @returns {*|boolean}
     */
    get shouldPlay() {
        return (
            game.settings.get('sequencer', 'effectsEnabled') &&
            game.user.viewedScene === this.data.sceneId &&
            (
                game.user.isGM ||
                !this.data.users ||
                this.data.users.length === 0 ||
                this.data.users.includes(game.userId) ||
                this.data.creatorUserId === game.userId
            )
        );
    }
    
    /**
     * Whether this effect should play naturally, or be constrained to a subsection of the video
     *
     * @returns {boolean}
     */
    get playNaturally() {
        return (!this.data.time || (this._startTime === 0 && this._endTime === this.video.duration))
            && this._animationTimes.loopStart === undefined && this._animationTimes.loopEnd === undefined;
    }
    
    /**
     * Validates that the update contains the appropriate data
     *
     * @param inUpdates
     */
    static validateUpdate(inUpdates) {
        const updateKeys = Object.keys(inUpdates)
        const protectedValues = updateKeys.filter(key => CanvasEffect.protectedValues.includes(key));
        if (protectedValues.length) {
            throw lib.custom_error("Sequencer", `CanvasEffect | update | You cannot update the following keys of an effect's data: ${protectedValues.join('\n - ')}`)
        }
        if (updateKeys.includes('source')) {
            if (!(lib.is_UUID(inUpdates.source) || canvaslib.is_object_canvas_data(inUpdates.source))) {
                throw lib.custom_error("Sequencer", `CanvasEffect | update | source must be of type document UUID or object with X and Y coordinates`)
            }
        }
        if (updateKeys.includes('target')) {
            if (!(lib.is_UUID(inUpdates.target) || canvaslib.is_object_canvas_data(inUpdates.target))) {
                throw lib.custom_error("Sequencer", `CanvasEffect | update | target must be of type document UUID or object with X and Y coordinates`)
            }
        }
        
    }
    
    /**
     * Plays the effect, returning two promises; one that resolves once the duration has been established, and another
     * when the effect has finished playing
     *
     * @returns {Promise}
     */
    async play() {
        
        const durationPromise = new Promise((resolve, reject) => {
            this._durationResolve = resolve;
            this._durationReject = reject;
        });
        
        const finishPromise = new Promise(async (resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
            Hooks.call("createSequencerEffect", this);
            lib.debug(`Playing effect:`, this.data);
            this._initialize();
        });
        
        return {
            duration: durationPromise,
            promise: finishPromise
        }
        
    }
    
    /**
     *  Ends the effect
     */
    endEffect() {
        if (this._ended) return;
        Hooks.call("endedSequencerEffect", this);
        this.destroy();
    }
    
    destroy(...args) {
        this._destroyDependencies();
        return super.destroy(...args);
    }
    
    /**
     * Updates this effect with the given parameters
     * @param inUpdates
     * @returns {Promise}
     */
    async update(inUpdates) {
        if (!this.userCanUpdate) throw lib.custom_error("Sequencer", "CanvasEffect | Update | You do not have permission to update this effect")
        CanvasEffect.validateUpdate(inUpdates);
        
        const newData = foundry.utils.duplicate(this.data);
        const updateKeys = Object.keys(inUpdates);
        
        updateKeys.forEach(key => {
            setProperty(newData, key, inUpdates[key]);
        });
        
        if (Object.keys(foundry.utils.diffObject(newData, this.data)).length === 0) {
            lib.debug(`Skipped updating effect with ID ${this.id} - no changes needed`);
            return;
        }
        
        if (this.data.persist) {
            
            const originalSourceUUID = lib.is_UUID(this.data.source) && this.data.attachTo
                ? this.data.source
                : "Scene." + this.data.sceneId;
            
            const newSourceUUID = lib.is_UUID(newData.source) && newData.attachTo
                ? newData.source
                : "Scene." + newData.sceneId;
            
            if (originalSourceUUID !== newSourceUUID) {
                flagManager.removeFlags(originalSourceUUID, newData);
            }
            
            flagManager.addFlags(newSourceUUID, newData);
        }
        
        lib.debug(`Updated effect with ID ${this.id}`)
        
        return sequencerSocket.executeForEveryone(SOCKET_HANDLERS.UPDATE_EFFECT, this.id, newData);
    }
    
    /**
     * Updates the effect
     *
     * @param inUpdates
     * @returns {Promise}
     * @private
     */
    _update(inUpdates) {
        this.data = inUpdates;
        Hooks.call("updateSequencerEffect", this);
        this._destroyDependencies();
        return this._reinitialize();
    }
    
    /**
     * Determines whether a position is within the bounds of this effect
     *
     * @param inPosition
     * @returns {boolean}
     */
    isPositionWithinBounds(inPosition) {
        if (!this.spriteContainer) return false;
        return canvaslib.is_position_within_bounds(inPosition, this.spriteContainer, this.parent)
    }
    
    /**
     * Initializes the effect and places it on the canvas
     *
     * @param {boolean} play
     * @returns {Promise}
     * @private
     */
    async _initialize(play = true) {
        this._initializeVariables();
        await this._contextLostCallback();
        await this._loadTexture();
        this._calculateDuration();
        this._addToContainer();
        this._createSprite();
        await this._setupMasks();
        await this._transformSprite();
        this._playCustomAnimations();
        this._playPresetAnimations();
        this._setEndTimeout();
        this._timeoutVisibility();
        if (play && this.video) this.video.play();
    }
    
    /**
     * Reinitializes the effect after it has been updated
     *
     * @param play
     * @returns {Promise}
     * @private
     */
    async _reinitialize(play = true) {
        this.renderable = false;
        if (!this.shouldPlay) {
            return Sequencer.EffectManager._removeEffect(this);
        }
        this.actualCreationTime = (+new Date());
        return this._initialize(play);
    }
    
    /**
     * Initializes variables core to the function of the effect
     * This is run as a part of the construction of the effect
     *
     * @private
     */
    _initializeVariables() {
    
        // Responsible for rotating the sprite
        this.rotationContainer = this.addChild(new PIXI.Container());
        this.rotationContainer.id = this.id + "-rotationContainer";
    
        // An offset container for the sprite
        this.spriteContainer = this.rotationContainer.addChild(new PIXI.Container());
        this.spriteContainer.id = this.id + "-spriteContainer";
    
        // The sprite itself
    
        let sprite;
        if(!this.data.xray && !this.data.aboveLighting) {
            sprite = new SpriteMesh(null, VisionSamplerShader);
        }else{
            sprite = new SpriteMesh();
        }
        
        this.sprite = this.spriteContainer.addChild(sprite);
        this.sprite.id = this.id + "-sprite";
        
        this._template = this.data.template;
        this._ended = null;
        this._maskContainer = null;
        this._maskSprite = null;
        this._file = null;
        this._loopOffset = 0;
        this.effectFilters = {};
        this._animationDuration = 0;
        this._animationTimes = {};
        this._twister = new MersenneTwister(this.data.creationTimestamp);
        this._video = null;
        this._distanceCache = null;
        this._isRangeFind = false;
        this._customAngle = 0;
        this._currentFilePath = this.data.file;
        this._relatedSprites = {};
        this._hooks = [];
        
        if (this._resetTimeout) {
            clearTimeout(this._resetTimeout);
        }
        this._resetTimeout = null;
        
        this._source = false;
        this._sourcePosition = false;
        this._target = false;
        this._targetPosition = false;
        this._offsetCache = {};
        
        this._nameOffsetMap = Object.fromEntries(Object.entries(foundry.utils.duplicate(this.data.nameOffsetMap ?? {})).map(entry => {
            return [entry[0], this._setupOffsetMap(entry[1])];
        }));
        
        const maxPerformance = game.settings.get("core", "performanceMode") === 3;
        const maxFPS = game.settings.get("core", "maxFPS");
        
        this._ticker = new PIXI.Ticker();
        this._ticker.maxFPS = maxPerformance && maxFPS === 60 ? 0 : maxFPS;
        this._ticker.start();
        
    }
    
    /**
     * Destroys all dependencies to this element, such as tickers, animations, textures, and child elements
     *
     * @private
     */
    _destroyDependencies() {
        
        if (this._ended) return;
        this._ended = true;
        
        this.mask = null;
        
        this._removeHooks();
        
        try{
            this._ticker.stop();
            this._ticker.destroy();
        } catch (err) {
        }

        this._ticker = null;
        
        Object.values(this._relatedSprites).forEach((sprite) => sprite.destroy({ children: true, texture: true }));
        
        SequencerAnimationEngine.endAnimations(this.id);
        
        if (this._maskContainer) this._maskContainer.destroy({ children: true })
        if (this._maskSprite) {
            try {
                this._maskSprite.texture.destroy(true);
                this._maskSprite.destroy();
            } catch (err) {
            }
        }
        
        if (this._file instanceof SequencerFile) {
            this._file.destroy();
        }
        
        try {
            this.video.removeAttribute('src');
            this.video.pause();
            this.video.load();
        } catch (err) {
        }
        
        try {
            if (this.data.screenSpace) {
                SequencerAboveUILayer.removeContainerByEffect(this);
            }
        } catch (err) {
        }
        
        this.removeChildren().forEach(child => child.destroy({ children: true, texture: true }));
        
    }
    
    /**
     * Plays preset animations
     *
     * @private
     */
    _playPresetAnimations() {
        this._moveTowards();
        
        this._fadeIn();
        this._scaleIn();
        this._rotateIn();
        
        this._fadeOut();
        this._scaleOut();
        this._rotateOut();
    }
    
    /**
     * Gets an object based on an identifier, checking if it exists within the named offset map, whether it's a
     * coordinate object, or if it's an UUID that needs to be fetched from the scene
     *
     * @param inIdentifier
     * @returns {*}
     * @private
     */
    _getObjectByID(inIdentifier) {
        let source = inIdentifier;
        let offsetMap = this._nameOffsetMap?.[inIdentifier];
        if (offsetMap) {
            source = offsetMap?.targetObj || offsetMap?.sourceObj || source;
        } else {
            source = this._validateObject(source);
        }
        return source;
    }
    
    /**
     * Validates the given parameter, whether it's a UUID or a coordinate object, and returns the proper one
     *
     * @param inObject
     * @returns {*}
     * @private
     */
    _validateObject(inObject) {
        if (lib.is_UUID(inObject) || !canvaslib.is_object_canvas_data(inObject)) {
            inObject = lib.get_object_from_scene(inObject, this.data.sceneId);
            inObject = inObject?._object ?? inObject;
        }
        return inObject;
    }
    
    /**
     * Adds this effect to the appropriate container on the right layer
     *
     * @private
     */
    _addToContainer() {
        
        let layer;
        if (this.data.screenSpaceAboveUI) {
            layer = SequencerAboveUILayer.getLayer();
        }else if (this.data.screenSpace) {
            layer = canvas.sequencerEffectsUILayer;
        }else if (this.data.aboveLighting) {
            layer = canvas.sequencerEffectsAboveLighting;
        }else{
            layer = canvas.primary;
        }
        
        layer.addChild(this);
        layer.sortChildren();
        
    }
    
    /**
     * Loads the texture for this effect, handling cases where it's a simple path or a database path
     *
     * @private
     */
    async _loadTexture() {
        
        if (this.data.file === "") {
            return;
        }
        
        if (this.data.customRange) {
            
            this._file = SequencerFile.make(this.data.file, Object.values(this.template), "temporary.range.file");
            
        } else {
            
            if (!Sequencer.Database.entryExists(this.data.file)) {
                let texture = await SequencerFileCache.loadFile(this.data.file);
                this.video = this.data.file.toLowerCase().endsWith(".webm")
                    ? texture?.baseTexture?.resource?.source ?? false
                    : false;
                this._texture = texture;
                this._file = texture;
                this._currentFilePath = this.data.file;
                return;
            }
            
            this._file = Sequencer.Database.getEntry(this.data.file).clone();
            
        }
        
        this._file.forcedIndex = this.data.forcedIndex;
        this._file.twister = this._twister;
        
        this._isRangeFind = this._file instanceof SequencerFileRangeFind;
        
        if (this.data.stretchTo) {
            let ray = new Ray(this.sourcePosition, this.targetPosition);
            this._rotateTowards(ray);
            ray = new Ray(this.sourcePosition, this.targetPosition);
            let { filePath, texture } = await this._getTextureForDistance(ray.distance);
            this._currentFilePath = filePath;
            this._texture = texture;
        } else if (!this._isRangeFind) {
            const { filePath, texture } = await this._file.getTexture();
            this._currentFilePath = filePath;
            this._texture = texture;
        }
        
        if(this._isRangeFind && (this.data.stretchTo?.attachTo?.active || this.data.attachTo?.active)){
    
            const sprite = this.data.tilingTexture
                ? new PIXI.TilingSprite(this._texture)
                : new PIXI.Sprite(this._texture);
            this._relatedSprites[this._currentFilePath] = sprite;
            this.sprite.addChild(sprite);
            
            new Promise(async (resolve) => {
                for (let filePath of this._file.getAllFiles()) {
        
                    if (filePath === this._currentFilePath) continue;
                    
                    let texture = await this._file._getTexture(filePath);
                    
                    const sprite = this.data.tilingTexture
                        ? new PIXI.TilingSprite(texture)
                        : new PIXI.Sprite(texture);
                    sprite.renderable = false;
                    this._relatedSprites[filePath] = sprite;
                    this.sprite.addChild(sprite);
                }
                
                resolve();
            });
        }
        
        this._template = this._file.template ?? this._template;
        this.video = this._currentFilePath.toLowerCase().endsWith(".webm")
            ? this._texture?.baseTexture?.resource?.source
            : false;
        
    }
    
    /**
     * Calculates the duration of this effect, based on animation durations, the video source duration, end/start times, etc
     *
     * @private
     */
    _calculateDuration() {
        
        this._animationDuration = this.data.duration || (this.video?.duration ?? 1) * 1000;
        
        // If the effect moves, then infer the duration from the distance divided by the speed
        if (this.data.moveSpeed && this.data.moves) {
            let distance = canvaslib.distance_between(this.sourcePosition, this.targetPosition);
            let durationFromSpeed = (distance / this.data.moveSpeed) * 1000;
            this._animationDuration = Math.max(durationFromSpeed, this.data.duration);
        } else if (!this.data.duration && !this.video) {
            
            // Determine static image duration
            let fadeDuration = (this.data.fadeIn?.duration ?? 0) + (this.data.fadeOut?.duration ?? 0);
            let scaleDuration = (this.data.scaleIn?.duration ?? 0) + (this.data.scaleOut?.duration ?? 0);
            let rotateDuration = (this.data.rotateIn?.duration ?? 0) + (this.data.rotateOut?.duration ?? 0);
            let moveDuration = 0;
            if (this.data.moves) {
                let distance = canvaslib.distance_between(this.sourcePosition, this.targetPosition);
                moveDuration = (this.data.moveSpeed ? (distance / this.data.moveSpeed) * 1000 : 1000) + this.data.moves.delay;
            }
            
            let animationDurations = this.data.animations ? Math.max(...this.data.animations.map(animation => {
                if (animation.looping) {
                    if (animation.loops === 0) return 0;
                    return ((animation?.duration ?? 0) * (animation?.loops ?? 0)) + (animation?.delay ?? 0);
                } else {
                    return (animation?.duration ?? 0) + (animation?.delay ?? 0);
                }
            })) : 0;
            
            this._animationDuration = Math.max(fadeDuration, scaleDuration, rotateDuration, moveDuration, animationDurations);
            
            this._animationDuration = this._animationDuration || 1000;
            
        }
        
        // Clamp effect duration to start time and end time
        this._startTime = 0;
        if (this.data.time?.start && this.video?.currentTime !== undefined) {
            let currentTime = !this.data.time.start.isPerc
                ? this.data.time.start.value ?? 0
                : (this._animationDuration * this.data.time.start.value);
            this.video.currentTime = currentTime / 1000;
            this._startTime = this.video.currentTime;
        }
        
        if (this.data.time?.end) {
            this._animationDuration = !this.data.time.end.isPerc
                ? this.data.time.isRange ? this.data.time.end.value - this.data.time.start.value : this._animationDuration - this.data.time.end.value
                : this._animationDuration * this.data.time.end.value;
        }
        
        this._endTime = this._animationDuration / 1000;
        
        if (this._file?.markers && this._startTime === 0 && this._endTime === this.video.duration) {
            this._animationTimes.loopStart = this._file.markers.loop.start / 1000;
            this._animationTimes.loopEnd = this._file.markers.loop.end / 1000;
            this._animationTimes.forcedEnd = this._file.markers.forcedEnd / 1000;
        }
        
        this._animationDuration /= (this.data.playbackRate ?? 1.0);
        
        // Resolve duration promise so that owner of effect may
        this._durationResolve(this._animationDuration);
        
        if (this.video) {
            this.video.loop = (this._animationDuration / 1000) > this.video.duration && !this.data.noLoop;
        }
        
    }
    
    /**
     * If this effect is animatable, hold off on rendering it for a bit so that the animations have time to initialize to
     * prevent it from spawning and then jumping to the right place
     *
     * @private
     */
    _timeoutVisibility() {
        setTimeout(() => {
            this._setupHooks();
        }, this.data.animations ? 50 : 0);
    }
    
    /**
     * If this effect is attached to an object, check whether the object has been destroyed, if so, end the effect
     *
     * @private
     */
    _contextLostCallback() {
        if (this.isSourceTemporary) {
            this._ticker.add(() => {
                if (this.isSourceDestroyed) {
                    this._isDestroyed = true;
                    this._ticker.stop();
                    this._source = this.sourcePosition;
                    this._sourcePosition = false;
                    SequencerEffectManager.endEffects({ effects: this });
                }
            });
        }
        if (this.isTargetTemporary) {
            this._ticker.add(() => {
                if (this.isTargetDestroyed) {
                    this._isDestroyed = true;
                    this._ticker.stop();
                    this._target = this.targetPosition;
                    this._targetPosition = false;
                    SequencerEffectManager.endEffects({ effects: this });
                }
            });
        }
    }
    
    /**
     * Creates the sprite, and the relevant containers that manage the position and offsets of the overall visual look of the sprite
     *
     * @private
     */
    _createSprite() {
        
        this.renderable = false;
    
        this.elevation = this.data.elevation ?? Math.max(canvaslib.get_object_elevation(this.source ?? {}), canvaslib.get_object_elevation(this.target ?? {})) + 1;
        
        this.sort = !lib.is_real_number(this.data.zIndex) ? 100000 - this.data.index : 100000 + this.data.zIndex;
        
        this.parent.sortChildren();
        
        let textSprite;
        
        if (this.data.text) {
            
            const text = this.data.text.text;
            const fontSettings = foundry.utils.duplicate(this.data.text);
            fontSettings.fontSize = (fontSettings?.fontSize ?? 26) * (150 / canvas.grid.size);
            
            textSprite = new PIXI.Text(text, fontSettings);
            textSprite.resolution = 5;
            textSprite.zIndex = 1;
            
            textSprite.anchor.set(
                this.data.text?.anchor?.x ?? 0.5,
                this.data.text?.anchor?.y ?? 0.5
            );
            
        }
        
        this.sprite.filters = [];
        
        if (this.data.filters) {
            for (let index = 0; index < this.data.filters.length; index++) {
                const filterData = this.data.filters[index];
                const filter = new filters[filterData.className](filterData.data);
                filter.id = this.id + "-" + filterData.className + '-' + index.toString();
                this.sprite.filters.push(filter);
                const filterKeyName = filterData.name || filterData.className;
                this.effectFilters[filterKeyName] = filter;
            }
        }
        
        this.alphaFilter = new PIXI.filters.AlphaFilter(this.data.opacity);
        this.alphaFilter.id = this.id + "-alphaFilter";
        this.sprite.filters.push(this.alphaFilter)
        
        
        let spriteOffsetX = this.data.spriteOffset?.x ?? 0;
        let spriteOffsetY = this.data.spriteOffset?.y ?? 0;
        if (this.data.spriteOffset?.gridUnits) {
            spriteOffsetX *= canvas.grid.size;
            spriteOffsetY *= canvas.grid.size;
        }
        
        this.sprite.position.set(
            spriteOffsetX,
            spriteOffsetY
        );
        
        this.sprite.anchor.set(
            this.data.spriteAnchor?.x ?? 0.5,
            this.data.spriteAnchor?.y ?? 0.5
        );
        
        this.sprite.rotation = Math.normalizeRadians(Math.toRadians(this.data.spriteRotation ?? 0));
        
        this._customAngle = this.data.angle ?? 0;
        if (this.data.randomRotation) {
            this._customAngle += lib.random_float_between(-360, 360, this._twister)
        }
        
        this.spriteContainer.rotation = -Math.normalizeRadians(Math.toRadians(this._customAngle));
        
        if (this.data.tint) {
            this.sprite.tint = this.data.tint;
        }
        
        if (textSprite) {
            this.sprite.addChild(textSprite);
        }
        
        if (this.shouldShowFadedVersion) {
            this.filters = [
                new PIXI.filters.ColorMatrixFilter({ saturation: -1 }),
                new PIXI.filters.AlphaFilter(game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") / 100)
            ];
        }
        
    }
    
    updateTransform() {
        super.updateTransform();
        if (this.data.screenSpace || this.data.screenSpaceAboveUI) {
            
            const [screenWidth, screenHeight] = canvas.screenDimensions;
            
            this.position.set(
                (this.screenSpacePosition?.x ?? 0) + screenWidth * (this.data.screenSpaceAnchor?.x ?? this.data.anchor?.x ?? 0.5),
                (this.screenSpacePosition?.y ?? 0) + screenHeight * (this.data.screenSpaceAnchor?.y ?? this.data.anchor?.y ?? 0.5),
            )
            
            if (this.data.screenSpaceScale) {
                
                const scaleData = this.data.screenSpaceScale ?? { x: 1, y: 1 };
                
                let scaleX = scaleData.x;
                let scaleY = scaleData.y;
                
                if (scaleData.fitX) {
                    scaleX = scaleX * (screenWidth / this.sprite.width);
                }
                
                if (scaleData.fitY) {
                    scaleY = scaleY * (screenHeight / this.sprite.height);
                }
                
                scaleX = scaleData.ratioX ? scaleY : scaleX;
                scaleY = scaleData.ratioY ? scaleX : scaleY;
                
                this.scale.set(
                    scaleX,
                    scaleY
                )
                
            }
        }
    }
    
    async _setupMasks() {
        
        if (!this.data?.masks?.length) return;
        
        this.masksReady = false;
        
        this._maskContainer = new PIXI.Container();
        
        this._maskSprite = new PIXI.Sprite();
        this.parent.addChild(this._maskSprite);
        if (this.sprite) {
            this.sprite.mask = this._maskSprite;
        }
        
        const blurFilter = new filters.Blur({ strength: 2 });
        this._maskContainer.filters = [blurFilter];
        
        for (const uuid of this.data.masks) {
            
            const documentType = uuid.split('.')[2];
            const documentObj = await fromUuid(uuid);
            if (!documentObj || documentObj.parent !== this.sourceDocument.parent) continue;
            
            const placeableObject = documentObj.object;
            const objMaskSprite = (documentType === "Token" || documentType === "Tile") ? new PIXI.Sprite() : new PIXI.Graphics();
            objMaskSprite.uuid = uuid;
            objMaskSprite.placeableObject = placeableObject;
            objMaskSprite.documentType = documentType;
            
            const clipFilter = new filters.Clip();
            const blurFilter = new filters.Blur({ strength: 1 });
            objMaskSprite.filters = [blurFilter, clipFilter];
            
            const spriteContainer = new PIXI.Container();
            
            spriteContainer.addChild(objMaskSprite);
            spriteContainer.maskSprite = objMaskSprite;
            
            this._maskContainer.addChild(spriteContainer);
            
            this._addHook("delete" + documentType, (doc) => {
                if (doc !== documentObj) return
                const mask = this._maskContainer.children.find(mask => mask.maskSprite.uuid === doc.uuid);
                if (!mask) return;
                mask.destroy();
                this._updateMaskSprite();
                if (!this._maskContainer.children.length) {
                    if (this.sprite) {
                        this.sprite.mask = null;
                    }
                }
            });
            
            this._addHook("update" + documentType, (doc) => {
                if (doc !== documentObj) return;
                const mask = this._maskContainer.children.find(mask => mask.maskSprite.uuid === doc.uuid);
                if (!mask) return;
                const changed = this._handleUpdatingMask(mask);
                if (changed) this._updateMaskSprite();
            });
            
        }
        
        if (!this._maskContainer.children.length) {
            if (this.sprite) {
                this.sprite.mask = null;
            }
            return false;
        }
        
        this._ticker.add(() => {
            
            let anyMaskChanged = false;
            
            for (let container of this._maskContainer.children) {
                anyMaskChanged = this._handleUpdatingMask(container) || anyMaskChanged;
            }
            
            if (anyMaskChanged) {
                this._updateMaskSprite();
            }
            
        });
        
        this.masksReady = true;
        
    }
    
    _handleUpdatingMask(container, forced = false) {
        
        const mask = container.maskSprite;
        
        let objectSprite;
        let objectWidth = 0;
        let objectHeight = 0;
        let additionalData = {
            walledmask: getProperty(mask.placeableObject, "flags.walledtemplates.enabled")
        }
        try {
            if (mask.documentType === "Token") {
                objectSprite = mask.placeableObject.mesh;
                objectWidth = objectSprite.width / 2;
                objectHeight = objectSprite.height / 2;
                additionalData["img"] = mask.placeableObject.document.texture.src;
            } else if (mask.documentType === "Tile") {
                objectSprite = mask.placeableObject.mesh;
                objectWidth = objectSprite.width / 2;
                objectHeight = objectSprite.height / 2;
                additionalData["img"] = mask.placeableObject.document.texture.src;
            } else if (mask.documentType === "Drawing") {
                objectSprite = mask.placeableObject.shape;
            } else if (mask.documentType === "MeasuredTemplate") {
                objectSprite = mask.placeableObject.template;
                additionalData["direction"] = mask.placeableObject.direction;
                additionalData["distance"] = mask.placeableObject.distance;
                additionalData["angle"] = mask.placeableObject.angle;
                additionalData["width"] = mask.placeableObject.width;
            }
        } catch (err) {
            return false;
        }
        
        let position = {
            x: (objectSprite.parent.x + objectSprite.x) - objectWidth,
            y: (objectSprite.parent.y + objectSprite.y) - objectHeight
        }
        
        const angle = objectSprite.angle;
        
        const data = duplicate(additionalData);
        
        const noChange = (container.position.x === position.x)
            && (container.position.y === position.y)
            && (mask.scale.x === objectSprite.scale.x)
            && (mask.scale.y === objectSprite.scale.y)
            && (mask.texture === objectSprite.texture)
            && (mask.angle === angle)
            && (foundry.utils.isEmpty(foundry.utils.diffObject(mask.oldData, data)))
            && !forced;
        
        if (noChange) return false;
        
        if (mask.documentType === "Drawing") {
            
            mask.clear();
            mask.beginFill(0xFFFFFF, 1);
            
            const drawingType = mask.placeableObject.type;
            
            if (drawingType === CONST.DRAWING_TYPES.RECTANGLE) {
                mask.drawRect(objectSprite.width / -2, objectSprite.height / -2, objectSprite.width, objectSprite.height)
            } else if (drawingType === CONST.DRAWING_TYPES.ELLIPSE) {
                mask.drawEllipse(objectSprite.width / -2, objectSprite.height / -2, objectSprite.width / 2, objectSprite.height / 2)
            } else {
                const vertices = mask.placeableObject.points;
                
                if (drawingType === CONST.DRAWING_TYPES.FREEHAND) {
                    
                    // Shamelessly stolen from Foundry's source-code
                    let factor = mask.placeableObject.bezierFactor ?? 0.5;
                    
                    // Get drawing points
                    let last = vertices[vertices.length - 1];
                    let isClosed = vertices[0].equals(last);
                    
                    // Handle edge cases
                    mask.moveTo(...vertices[0]);
                    if (vertices.length < 2) return;
                    else if (vertices.length === 2) {
                        mask.lineTo(...vertices[1]);
                        return;
                    }
                    
                    // Set initial conditions
                    let [previous, point] = vertices.slice(0, 2);
                    let cp0 = canvaslib.getBezierControlPoints(factor, last, previous, point).next_cp0;
                    let cp1, next_cp0, next;
                    
                    // Begin iteration
                    for (let i = 1; i < vertices.length; i++) {
                        next = vertices[i + 1];
                        if (next) {
                            let bp = canvaslib.getBezierControlPoints(factor, previous, point, next);
                            cp1 = bp.cp1;
                            next_cp0 = bp.next_cp0;
                        }
                        
                        // First point
                        if ((i === 1) && !isClosed) {
                            mask.quadraticCurveTo(cp1.x, cp1.y, point[0], point[1]);
                        }
                        
                        // Last Point
                        else if ((i === vertices.length - 1) && !isClosed) {
                            mask.quadraticCurveTo(cp0.x, cp0.y, point[0], point[1]);
                        }
                        
                        // Bezier points
                        else {
                            mask.bezierCurveTo(cp0.x, cp0.y, cp1.x, cp1.y, point[0], point[1]);
                        }
                        
                        // Increment
                        previous = point;
                        point = next;
                        cp0 = next_cp0;
                        
                    }
                    
                } else {
                    mask.moveTo(...vertices[0])
                    for (let i = 1; i < vertices.length; i++) {
                        mask.lineTo(...vertices[i])
                    }
                }
            }
            
            mask.endFill();
            
        } else if (mask.documentType === "MeasuredTemplate") {
            mask.clear();
            mask.beginFill(0xFFFFFF, 1);
            const shape = mask.placeableObject.shape.clone();
            mask.drawShape(shape);
        }
        
        mask.texture = objectSprite.texture;
        container.position.set(position.x, position.y);
        mask.scale.set(objectSprite.scale.x, objectSprite.scale.y);
        mask.angle = angle;
        mask.oldData = additionalData;
        
        if (mask instanceof PIXI.Sprite) {
            mask.anchor.set(0.5, 0.5);
            mask.position.set(mask.width / 2, mask.height / 2)
        }
        
        return true;
        
    }
    
    _updateMaskSprite() {
        
        if (!this.masksReady) return;
        
        const smallestX = this._maskContainer.children.reduce((acc, container) => {
            let bounds = container.getBounds();
            return acc >= bounds.x ? bounds.x : acc;
        }, Infinity);
        
        const smallestY = this._maskContainer.children.reduce((acc, container) => {
            let bounds = container.getBounds(true);
            return acc >= bounds.y ? bounds.y : acc;
        }, Infinity);
        
        this._maskSprite.position.set(smallestX, smallestY);
        
        this._maskSprite.texture.destroy(true);
        this._maskSprite.texture = canvas.app.renderer.generateTexture(this._maskContainer);
        
    }
    
    /**
     * Sets up the hooks relating to this effect's source and target
     *
     * @private
     */
    _setupHooks() {
        
        const attachedToSource = this.data.attachTo?.active && lib.is_UUID(this.data.source);
        const attachedToTarget = (this.data.stretchTo?.attachTo || this.data.rotateTowards?.attachTo) && lib.is_UUID(this.data.target);
        
        let renderable = true;
        let alpha = 1.0;
        
        if (attachedToSource) {
            
            this._addHook(this.getSourceHook("delete"), (doc) => {
                if (doc !== this.sourceDocument) return;
                this._source = this._sourcePosition;
                const uuid = doc.uuid;
                SequencerEffectManager.objectDeleted(uuid);
            });
            
            if (this.data.attachTo?.bindVisibility) {
                const func = () => {
                    const sourceVisible = this.source && (this.source.mesh.visible ?? true);
                    const sourceHidden = this.sourceDocument && (this.sourceDocument?.hidden ?? false);
                    const targetVisible = this.target && (!attachedToTarget || (this.target?.mesh?.visible ?? true));
                    this.renderable = sourceVisible || targetVisible;
                    this.alpha = sourceVisible && sourceHidden ? 0.5 : 1.0;
                    renderable = this.renderable;
                };
                this._addHook("sightRefresh", func);
                setTimeout(() => {
                    func();
                }, 20);
            }
            
            if (this.data.attachTo?.bindAlpha) {
                this._addHook(this.getSourceHook("update"), (doc) => {
                    if (doc !== this.sourceDocument) return;
                    this.spriteContainer.alpha = this.getSourceData().alpha;
                });
                alpha = this.spriteContainer.alpha;
            }
            
        }
        
        if (attachedToTarget) {
            this._addHook(this.getTargetHook("delete"), (doc) => {
                if (doc !== this.target) return;
                this._target = this._targetPosition;
                const uuid = doc.uuid;
                SequencerEffectManager.objectDeleted(uuid);
            });
        }
        
        for (let uuid of (this.data?.tiedDocuments ?? [])) {
            const tiedDocument = lib.from_uuid_fast(uuid)
            this._addHook("delete" + tiedDocument.documentName, (doc) => {
                if (tiedDocument !== doc) return;
                SequencerEffectManager.objectDeleted(uuid);
            })
        }
        
        setTimeout(() => {
            this.renderable = renderable;
            this.spriteContainer.alpha = alpha;
        }, 30);
        
    }
    
    _addHook(hookName, callable) {
        const id = Hooks.on(hookName, callable.bind(this));
        this._hooks.push([hookName, id]);
    }
    
    _removeHooks() {
        this._hooks.forEach(hookData => Hooks.off(...hookData));
        this._hooks = [];
    }
    
    /**
     * Calculates the padding and scale to stretch an effect across the given distance
     *
     * If the file is a SequencerFile instance, it will also pick the appropriate file for the right distance
     *
     * @param distance
     * @returns {Object}
     * @private
     */
    async _getTextureForDistance(distance) {
        
        if (!this._distanceCache || this._distanceCache?.distance !== distance) {
            
            let scaleX = 1.0;
            let scaleY = 1.0;
            let texture;
            let filePath;
            let spriteAnchor = this.data.anchor?.x ?? 1.0;
            
            if (this._file instanceof SequencerFile) {
                
                const scaledDistance = distance / (this.data.scale.x ?? 1.0);
                const result = await this._file.getTexture(scaledDistance);
                
                filePath = result.filePath;
                
                texture = result.texture;
                
                spriteAnchor = result.spriteAnchor ?? this.data.anchor?.x ?? 0.0;
                
                scaleX = result.spriteScale;
                
                if (this.data.stretchTo?.onlyX) {
                    const widthWithPadding = texture.width - (this.template.startPoint + this.template.endPoint);
                    scaleY = widthWithPadding / texture.width;
                } else {
                    scaleY = result.spriteScale;
                }
                
            } else if (this._file instanceof PIXI.Texture) {
                
                filePath = this.data.file;
                
                texture = this._file;
                
                spriteAnchor = this.template.startPoint / texture.width;
                
                const widthWithPadding = texture.width - (this.template.startPoint + this.template.endPoint);
                let spriteScale = distance / widthWithPadding;
                
                scaleX = spriteScale;
                
                if (this.data.stretchTo?.onlyX) {
                    scaleY = widthWithPadding / texture.width;
                } else {
                    scaleY = spriteScale;
                }
                
            }
            
            this._distanceCache = {
                filePath,
                texture,
                spriteAnchor,
                scaleX,
                scaleY,
                distance
            };
            
        }
        
        return this._distanceCache;
        
    }
    
    /**
     * Applies the distance scaling to the sprite based on the previous method
     *
     * @returns {Promise<void>}
     * @private
     */
    async _applyDistanceScaling() {
        
        const ray = new Ray(this.sourcePosition, this.targetPosition);
        
        this._rotateTowards(ray);
        
        let {
            filePath,
            texture,
            spriteAnchor,
            scaleX,
            scaleY,
            distance
        } = await this._getTextureForDistance(ray.distance);
        
        if (this._currentFilePath !== filePath || !this._relatedSprites[filePath]) {
            
            this._texture = texture;
            this.video = filePath.toLowerCase().endsWith(".webm")
                ? texture?.baseTexture?.resource?.source ?? false
                : false;
            
            Object.values(this._relatedSprites).forEach(subsprite => {
                subsprite.renderable = false;
            })
            
            this._currentFilePath = filePath;
            
            if (this._relatedSprites[filePath]) {
                this._relatedSprites[filePath].renderable = true;
            } else {
                const sprite = this.data.tilingTexture
                    ? new PIXI.TilingSprite(texture)
                    : new PIXI.Sprite(texture);
                this._relatedSprites[filePath] = sprite;
                this.sprite.addChild(sprite);
            }
            
        }
        
        try {
            this._relatedSprites[filePath].texture?.baseTexture?.resource?.source.play().then(() => {
                this._relatedSprites[filePath].texture.update();
            });
        }catch(err){
        
        }
        
        if (this._relatedSprites[filePath]) {
            
            if (this.data.attachTo?.active) {
                await this._applyAttachmentOffset();
            }
            
            const sprite = this._relatedSprites[filePath];
            
            if (this.data.tilingTexture) {
                
                const scaleX = (this.data.scale.x ?? 1.0) * this.gridSizeDifference;
                const scaleY = (this.data.scale.y ?? 1.0) * this.gridSizeDifference;
                sprite.width = distance / (scaleX);
                sprite.height = texture.height;
                sprite.scale.set(
                    scaleX * this.flipX,
                    scaleY * this.flipY
                )
                
                sprite.tileScale.x = this.data.tilingTexture.scale.x;
                sprite.tileScale.y = this.data.tilingTexture.scale.y;
                
                sprite.tilePosition = this.data.tilingTexture.position;
                
                
            } else {
                sprite.scale.set(
                    scaleX * (this.data.scale.x ?? 1.0) * this.flipX,
                    scaleY * (this.data.scale.y ?? 1.0) * this.flipY
                )
            }
            
            sprite.anchor.set(
                this.flipX === 1 ? spriteAnchor : 1 - spriteAnchor,
                (this.data.anchor?.y ?? 0.5)
            )
            
        }
        
    }
    
    /**
     * Rotates the effect towards the target
     *
     * @param ray
     * @private
     */
    _rotateTowards(ray) {
        
        if (!ray) {
            const sourcePosition = this.flipX === 1 ? this.sourcePosition : this.targetPosition;
            const targetPosition = this.flipX === 1 ? this.targetPosition : this.sourcePosition;
            ray = new Ray(sourcePosition, targetPosition);
        }
        
        this.rotationContainer.rotation = Math.normalizeRadians(ray.angle + Math.toRadians(this.data.rotateTowards?.rotationOffset ?? 0));
        
    }
    
    /**
     * Transforms the sprite, rotating it, stretching it, scaling it, sizing it according its data
     *
     * @private
     */
    async _transformSprite() {
        
        if (this.data.stretchTo) {
            
            if (this.data.stretchTo?.attachTo) {
                this._transformStretchToAttachedSprite();
            }
            
            await this._applyDistanceScaling();
            
        } else {
            
            if (!this.sprite.texture.valid && this._texture?.valid) {
                this.sprite.texture = this._texture;
            }
            
        }
        
        if (this.video && (this._startTime || this._loopOffset > 0) && this.video?.currentTime !== undefined) {
            await lib.wait(20)
            this.sprite.texture.update();
        }
        
        if (!this.data.stretchTo) {
            this._transformNoStretchSprite();
        }
        
        if (this.data.attachTo?.active && !this.data.stretchTo?.attachTo) {
            
            await this._transformAttachedNoStretchSprite();
            
        } else {
            
            if (!this.data.screenSpace) {
                
                this.position.set(
                    this.sourcePosition.x,
                    this.sourcePosition.y
                );
                
            }
            
        }
        
        if (this.data.rotateTowards) {
            
            this._rotateTowards();
            
            if (this.data.rotateTowards?.attachTo) {
                
                this._transformRotateTowardsAttachedSprite();
            }
        }
        
        if (!this.data.anchor && this.data.rotateTowards) {
            const startPointRatio = (this.template.startPoint / this._texture.width) / 2;
            this.spriteContainer.pivot.set(this.sprite.width * (-0.5 + startPointRatio), 0);
        } else {
            this.spriteContainer.pivot.set(
                lib.interpolate(this.sprite.width * -0.5, this.sprite.width * 0.5, this.data.anchor?.x ?? 0.5),
                lib.interpolate(this.sprite.height * -0.5, this.sprite.height * 0.5, this.data.anchor?.y ?? 0.5)
            );
        }
        
    }
    
    _transformStretchToAttachedSprite() {
    
        this._ticker.add(async () => {
            try {
                await this._applyDistanceScaling();
            } catch (err) {
                //lib.debug_error(err);
            }
        });
        
    }
    
    _transformNoStretchSprite() {
        
        if (this.data.tilingTexture) {
            
            this.sprite.tileScale = {
                x: this.data.tilingTexture.scale.x * this.gridSizeDifference,
                y: this.data.tilingTexture.scale.y * this.gridSizeDifference
            };
            
            this.sprite.tilePosition = this.data.tilingTexture.position;
            
        }
        
        const baseScaleX = (this.data.scale?.x ?? 1.0) * (this.data.spriteScale?.x ?? 1.0) * this.flipX;
        const baseScaleY = (this.data.scale?.y ?? 1.0) * (this.data.spriteScale?.y ?? 1.0) * this.flipY;
        
        if (this.data.scaleToObject) {
            
            let { width, height } = this.target
                ? this.getTargetData()
                : this.getSourceData();
            
            if (this.data.scaleToObject?.uniform) {
                let newWidth = Math.max(width, height);
                height = Math.max(width, height);
                width = newWidth;
            }
            
            this.sprite.width = width * (this.data.scaleToObject?.scale ?? 1.0) * baseScaleX;
            this.sprite.height = height * (this.data.scaleToObject?.scale ?? 1.0) * baseScaleY;
            
        } else if (this.data.size) {
            
            const ratio = this.sprite.height / this.sprite.width;
            
            let { height, width } = this.data.size;
            
            if (this.data.size.width === "auto" || this.data.size.height === "auto") {
                
                height = this.sprite.height;
                width = this.sprite.width;
                
                if (this.data.size.width === "auto") {
                    height = this.data.size.height;
                    if (this.data.size.gridUnits) {
                        height *= canvas.grid.size;
                    }
                    width = height / ratio;
                } else if (this.data.size.height === "auto") {
                    width = this.data.size.width;
                    if (this.data.size.gridUnits) {
                        width *= canvas.grid.size;
                    }
                    height = width * ratio;
                }
                
            } else if (this.data.size.gridUnits) {
                height *= canvas.grid.size;
                width *= canvas.grid.size;
            }
            
            this.sprite.width = width * baseScaleX;
            this.sprite.height = height * baseScaleY;
            
        } else {
            
            this.sprite.scale.set(
                baseScaleX * this.gridSizeDifference,
                baseScaleY * this.gridSizeDifference
            );
            
        }
        
    }
    
    async _transformAttachedNoStretchSprite() {
        
        const applyRotation = this.data.attachTo?.followRotation
            && (this.sourceDocument?.rotation !== undefined || this.sourceDocument?.direction !== undefined)
            && !this.data.rotateTowards
            && !this.data.stretchTo;
        
        this._ticker.add(() => {
            
            if (this._isDestroyed) return;
            
            if (applyRotation) {
                this.rotationContainer.rotation = this.getSourceData().rotation;
            }
            
            try {
                this._applyAttachmentOffset();
            } catch (err) {
                lib.debug_error(err);
            }
        });
        
    }
    
    _applyAttachmentOffset() {
        
        let offset = { x: 0, y: 0 };
        
        if (this.data.attachTo?.align && this.data.attachTo?.align !== "center") {
            
            offset = canvaslib.align({
                context: this.source,
                spriteWidth: this.sprite.width,
                spriteHeight: this.sprite.height,
                align: this.data.attachTo?.align,
                edge: this.data.attachTo?.edge
            });
            
        }
        
        this.position.set(
            this.sourcePosition.x - offset.x,
            this.sourcePosition.y - offset.y
        );
        
    }
    
    _transformRotateTowardsAttachedSprite() {
        
        this._ticker.add(async () => {
            if (this._isDestroyed) return;
            try {
                this._rotateTowards();
            } catch (err) {
                lib.debug_error(err);
            }
        });
        
    }
    
    /**
     * Provided an animation targeting the rotation of the sprite's primary container, this method will counter-rotate
     * the sprite in an equal fashion so that the sprite's rotation remains static relative to this animation
     *
     * @param animation
     * @returns {*[]}
     * @private
     */
    _counterAnimateRotation(animation) {
        
        if (animation.target === this.spriteContainer && this.data.zeroSpriteRotation) {
            delete animation.target;
            let counterAnimation = foundry.utils.duplicate(animation);
            animation.target = this.spriteContainer;
            counterAnimation.target = this.sprite;
            if (counterAnimation.values) {
                counterAnimation.values = counterAnimation.values.map(value => value * -1);
            } else {
                counterAnimation.from *= -1;
                counterAnimation.to *= -1;
            }
            if (!Array.isArray(animation)) {
                animation = [animation, counterAnimation]
            } else {
                animation.push(counterAnimation);
            }
        }
        
        return animation;
        
    }
    
    /**
     * Plays the custom animations of this effect
     *
     * @returns {number}
     * @private
     */
    _playCustomAnimations() {
        
        if (!this.data.animations) return 0;
        
        let animationsToSend = [];
        
        const animations = foundry.utils.duplicate(this.data.animations) ?? [];
        
        const oneShotAnimations = animations.filter(animation => !animation.looping && !animation.fromEnd);
        
        for (let animation of oneShotAnimations) {
            
            animation.target = foundry.utils.getProperty(this, animation.target);
            
            if (!animation.target) continue;
            
            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.from = animation.from * (Math.PI / 180);
                animation.to = animation.to * (Math.PI / 180);
            }
            
            if (["position.x", "position.y", "height", "width"].includes(animation.propertyName) && animation.gridUnits) {
                animation.from *= canvas.grid.size;
                animation.to *= canvas.grid.size;
            }
    
            if(["hue"].includes(animation.propertyName)){
                animation.getPropertyName = "values." + animation.propertyName;
            }
            
            animationsToSend = animationsToSend.concat(this._counterAnimateRotation(animation))
            
        }
        
        const loopingAnimations = animations.filter(animation => animation.looping);
        
        for (let animation of loopingAnimations) {
            
            animation.target = foundry.utils.getProperty(this, animation.target);
            
            if (!animation.target) continue;
            
            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.values = animation.values.map(angle => {
                    return angle * (Math.PI / 180);
                });
            }
            
            if (["position.x", "position.y", "height", "width"].includes(animation.propertyName) && animation.gridUnits) {
                animation.values = animation.values.map(value => {
                    return value * canvas.grid.size;
                });
            }
    
            if(["hue"].includes(animation.propertyName)){
                animation.getPropertyName = "values." + animation.propertyName;
            }
            
            animationsToSend = animationsToSend.concat(this._counterAnimateRotation(animation))
            
        }
        
        if (!(this instanceof PersistentCanvasEffect)) {
            animationsToSend = animationsToSend.concat(this._getFromEndCustomAnimations())
        }
        
        setTimeout(() => {
            SequencerAnimationEngine.addAnimation(this.id,
                animationsToSend,
                this.actualCreationTime - this.data.creationTimestamp
            );
        }, 20);
        
    }
    
    _getFromEndCustomAnimations(immediate = false) {
        
        let fromEndAnimations = []
        
        const animations = foundry.utils.duplicate(this.data.animations) ?? [];
        
        const oneShotEndingAnimations = animations.filter(animation => !animation.looping && animation.fromEnd);
        
        for (let animation of oneShotEndingAnimations) {
            
            animation.target = foundry.utils.getProperty(this, animation.target);
            
            if (!animation.target) continue;
            
            animation.delay = lib.is_real_number(immediate)
                ? Math.max(immediate - animation.duration + animation.delay, 0)
                : Math.max(this._animationDuration - animation.duration + animation.delay, 0);
            
            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.from = animation.from * (Math.PI / 180);
                animation.to = animation.to * (Math.PI / 180);
            }
            
            if (["position.x", "position.y", "height", "width"].includes(animation.propertyName) && animation.gridUnits) {
                animation.from *= canvas.grid.size;
                animation.to *= canvas.grid.size;
            }
            
            fromEndAnimations = fromEndAnimations.concat(this._counterAnimateRotation(animation))
            
        }
        
        return fromEndAnimations;
        
    }
    
    /**
     * Fades in the effect at the start of the effect
     *
     * @returns {number|*}
     * @private
     */
    _fadeIn() {
        
        if (!this.data.fadeIn || !this.sprite) return 0;
        
        let fadeIn = this.data.fadeIn;
        
        if (this.actualCreationTime - (this.data.creationTimestamp + fadeIn.duration + fadeIn.delay) > 0) return;
        
        this.alphaFilter.alpha = 0.0;
        
        SequencerAnimationEngine.addAnimation(this.id, {
            target: this.alphaFilter,
            propertyName: "alpha",
            to: this.data.opacity,
            duration: fadeIn.duration,
            ease: fadeIn.ease,
            delay: fadeIn.delay
        })
        
        return fadeIn.duration + fadeIn.delay;
        
    }
    
    
    /**
     * Fades out the effect at the end of the effect's duration
     *
     * @returns {number|*}
     * @private
     */
    _fadeOut(immediate = false) {
        
        if (!this.data.fadeOut || !this.sprite) return 0;
        
        let fadeOut = this.data.fadeOut;
        
        fadeOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - fadeOut.duration + fadeOut.delay, 0)
            : Math.max(this._animationDuration - fadeOut.duration + fadeOut.delay, 0);
        
        SequencerAnimationEngine.addAnimation(this.id, {
            target: this.alphaFilter,
            propertyName: "alpha",
            to: 0.0,
            duration: fadeOut.duration,
            ease: fadeOut.ease,
            delay: fadeOut.delay
        })
        
        return fadeOut.duration + fadeOut.delay;
        
    }
    
    /**
     * Determines the scale to animate from or to
     * @param property
     * @returns {{x: number, y: number}}
     * @private
     */
    _determineScale(property) {
        let scale = {
            x: this.sprite.scale.x,
            y: this.sprite.scale.y
        };
        
        if (lib.is_real_number(property.value)) {
            scale.x *= property.value * this.gridSizeDifference * this.flipX;
            scale.y *= property.value * this.gridSizeDifference * this.flipY;
        } else {
            scale.x *= property.value.x * this.gridSizeDifference * this.flipX;
            scale.y *= property.value.y * this.gridSizeDifference * this.flipY;
        }
        
        return scale;
    }
    
    /**
     * Scales the effect in at the start of the effect
     *
     * @returns {number|*}
     * @private
     */
    _scaleIn() {
        
        if (!this.data.scaleIn || !this.sprite) return 0;
        
        let scaleIn = this.data.scaleIn;
        let fromScale = this._determineScale(scaleIn)
        
        if (this.actualCreationTime - (this.data.creationTimestamp + scaleIn.duration + scaleIn.delay) > 0) return;
        
        let toScale = {
            x: this.sprite.scale.x,
            y: this.sprite.scale.y
        }
        
        this.sprite.scale.set(fromScale.x, fromScale.y);
        
        SequencerAnimationEngine.addAnimation(this.id, [{
            target: this.sprite,
            propertyName: "scale.x",
            from: fromScale.x,
            to: toScale.x,
            duration: scaleIn.duration,
            ease: scaleIn.ease,
            delay: scaleIn.delay
        }, {
            target: this.sprite,
            propertyName: "scale.y",
            from: fromScale.y,
            to: toScale.y,
            duration: scaleIn.duration,
            ease: scaleIn.ease,
            delay: scaleIn.delay
        }])
        
        return scaleIn.duration + scaleIn.delay;
        
    }
    
    /**
     * Scales the effect out at the end of the effect's duration
     *
     * @returns {number|*}
     * @private
     */
    _scaleOut(immediate = false) {
        
        if (!this.data.scaleOut || !this.sprite) return 0;
        
        let scaleOut = this.data.scaleOut;
        let scale = this._determineScale(scaleOut)
        
        scaleOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - scaleOut.duration + scaleOut.delay, 0)
            : Math.max(this._animationDuration - scaleOut.duration + scaleOut.delay, 0);
        
        SequencerAnimationEngine.addAnimation(this.id, [{
            target: this.sprite,
            propertyName: "scale.x",
            to: scale.x,
            duration: scaleOut.duration,
            ease: scaleOut.ease,
            delay: scaleOut.delay
        }, {
            target: this.sprite,
            propertyName: "scale.y",
            to: scale.y,
            duration: scaleOut.duration,
            ease: scaleOut.ease,
            delay: scaleOut.delay
        }])
        
        return scaleOut.duration + scaleOut.delay;
        
    }
    
    /**
     * Rotates the effect in at the start of the effect
     *
     * @returns {number|*}
     * @private
     */
    _rotateIn() {
        
        if (!this.data.rotateIn || !this.sprite) return 0;
        
        let rotateIn = this.data.rotateIn;
        
        if (this.actualCreationTime - (this.data.creationTimestamp + rotateIn.duration + rotateIn.delay) > 0) return;
        
        let original_radians = this.spriteContainer.rotation;
        this.spriteContainer.rotation = rotateIn.value * (Math.PI / 180);
        
        SequencerAnimationEngine.addAnimation(this.id, this._counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: original_radians,
            duration: rotateIn.duration,
            ease: rotateIn.ease,
            delay: rotateIn.delay
        }))
        
        return rotateIn.duration + rotateIn.delay;
    }
    
    /**
     * Rotates the effect out at the end of the effect's duration
     *
     * @returns {number|*}
     * @private
     */
    _rotateOut(immediate = false) {
        
        if (!this.data.rotateOut || !this.sprite) return 0;
        
        let rotateOut = this.data.rotateOut;
        
        rotateOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - rotateOut.duration + rotateOut.delay, 0)
            : Math.max(this._animationDuration - rotateOut.duration + rotateOut.delay, 0);
        
        SequencerAnimationEngine.addAnimation(this.id, this._counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: rotateOut.value * (Math.PI / 180),
            duration: rotateOut.duration,
            ease: rotateOut.ease,
            delay: rotateOut.delay
        }))
        
        return rotateOut.duration + rotateOut.delay;
        
    }
    
    /**
     * Causes the effect to move towards the given location
     *
     * @returns {number|*}
     * @private
     */
    _moveTowards() {
        
        if (!this.data.moves || !this.sprite) return 0;
        
        let moves = this.data.moves;
        
        let movementDuration = this._animationDuration;
        if (this.data.moveSpeed) {
            const distance = canvaslib.distance_between(this.sourcePosition, this.targetPosition);
            movementDuration = (distance / this.data.moveSpeed) * 1000;
        }
        
        if (this.data.moves.rotate) this._rotateTowards();
        
        const duration = movementDuration - moves.delay;
        
        if (this.actualCreationTime - (this.data.creationTimestamp + duration + moves.delay) > 0) return;
        
        SequencerAnimationEngine.addAnimation(this.id, [{
            target: this,
            propertyName: "position.x",
            to: this.targetPosition.x,
            duration: duration,
            ease: moves.ease,
            delay: moves.delay
        }, {
            target: this,
            propertyName: "position.y",
            to: this.targetPosition.y,
            duration: duration,
            ease: moves.ease,
            delay: moves.delay
        }]);
        
        return duration + moves.delay;
        
    }
    
    /**
     * If this effect is temporary, this sets the timeout for when the effect should resolve and get removed;
     *
     * @private
     */
    _setEndTimeout() {
        setTimeout(() => {
            this._resolve(this.data);
            this.endEffect();
        }, this._animationDuration);
    }
}

class PersistentCanvasEffect extends CanvasEffect {
    
    /**
     * @OVERRIDE
     * @returns {Promise<void>}
     * @private
     */
    async _initialize() {
        await super._initialize(false);
        await this._startEffect();
    }
    
    /**
     * @OVERRIDE
     * @returns {Promise<void>}
     * @private
     */
    async _reinitialize() {
        await super._reinitialize(false);
    }
    
    /** @OVERRIDE */
    _playPresetAnimations() {
        this._moveTowards();
        this._fadeIn();
        this._scaleIn();
        this._rotateIn();
    }
    
    /**
     * Starts the loop of this effect, calculating the difference between the effect's creation time, and the actual
     * creation time on the client
     *
     * @returns {Promise<void>}
     * @private
     */
    async _startEffect() {
        if (!this.video) return;
        
        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;
        
        if (!this.data.noLoop) {
            return this._startLoop(creationTimeDifference);
        }
        
        await this.video.play();
        
        if (creationTimeDifference < this._animationDuration) {
            this.video.currentTime = creationTimeDifference / 1000;
            if (this._endTime !== this.video.duration) {
                setTimeout(() => {
                    this.video.currentTime = this._endTime;
                    this.sprite.texture.update();
                }, this._endTime * 1000 - creationTimeDifference)
            }
            return;
        }
        
        this.video.pause();
        this.video.currentTime = this._endTime;
        if (this.sprite.texture) {
            setTimeout(() => {
                this.sprite.texture.update();
            }, 350);
        }
    }
    
    /**
     * Kicks off the loop, or just sets the video to loop
     *
     * @param creationTimeDifference
     * @returns {Promise<void>}
     * @private
     */
    async _startLoop(creationTimeDifference) {
        this.video.loop = this.playNaturally;
        if (!this._animationTimes.loopStart) {
            this._loopOffset = (creationTimeDifference % this._animationDuration) / 1000;
        } else if ((creationTimeDifference / 1000) > this._animationTimes.loopStart) {
            const loopDuration = this._animationTimes.loopEnd - this._animationTimes.loopStart;
            this._loopOffset = ((creationTimeDifference % (loopDuration * 1000)) / 1000);
        }
        return this._resetLoop();
    }
    
    /**
     * Continuously reset the video to the right time so that the start and end time can be preserved
     *
     * @returns {Promise<void>}
     * @private
     */
    async _resetLoop(firstLoop = true) {
        if (this._ended) return;
        
        let loopWaitTime = 0;
        if (this._animationTimes.loopStart) {
            if (this._isEnding) return;
            if (this._loopOffset > 0) {
                this.video.currentTime = this._animationTimes.loopStart + this._loopOffset;
                loopWaitTime = (this._animationTimes.loopEnd - (this.video.currentTime)) * 1000;
            } else {
                this.video.currentTime = firstLoop ? 0 : this._animationTimes.loopStart;
                loopWaitTime = (this._animationTimes.loopEnd - this._animationTimes.loopStart) * 1000;
            }
        } else {
            this.video.currentTime = this._startTime + this._loopOffset;
            loopWaitTime = this._animationDuration - (this._loopOffset * 1000);
        }
        
        try {
            await this.video.play();
        } catch (err) {
        }
        
        if (this.video.loop) return;
        
        this._resetTimeout = setTimeout(() => {
            if (this._ended) return;
            this._loopOffset = 0;
            this._resetLoop(false);
        }, loopWaitTime);
    }
    
    /** @OVERRIDE */
    _timeoutVisibility() {
        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;
        let timeout = (creationTimeDifference === 0 && !this.data.animations) ? 0 : 50;
        setTimeout(() => {
            this._setupHooks();
        }, timeout);
    }
    
    /** @OVERRIDE */
    _setEndTimeout() {
        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;
        if (!this.data.noLoop || creationTimeDifference >= this._animationDuration || !(this.video || this.data.text)) return;
        setTimeout(() => {
            this.video.pause();
        }, this._animationDuration)
    }
    
    /** @OVERRIDE */
    async endEffect() {
        if (this._isEnding) return;
        this._isEnding = true;
        let fullWaitDuration = 0;
        let extraEndDuration = this.data.extraEndDuration ?? 0;
        if (this._animationTimes.forcedEnd) {
            this.video.currentTime = this._animationTimes.forcedEnd;
            fullWaitDuration = (this.video.duration - (this._animationTimes?.forcedEnd ?? 0)) * 1000;
        } else if (this._animationTimes.loopEnd) {
            fullWaitDuration = (this.video.duration - this.video.currentTime) * 1000;
            this.video.loop = false;
            extraEndDuration = Math.max(extraEndDuration, fullWaitDuration);
        }
        const fromEndCustomAnimations = this._getFromEndCustomAnimations(extraEndDuration);
        const durations = [
            this._fadeOut(extraEndDuration),
            this._scaleOut(extraEndDuration),
            this._rotateOut(extraEndDuration),
            this.data.extraEndDuration,
            fullWaitDuration,
            ...fromEndCustomAnimations.map(animation => animation.duration + animation.delay)
        ].filter(Boolean);
        SequencerAnimationEngine.addAnimation(this.id, fromEndCustomAnimations);
        const waitDuration = Math.max(...durations);
        this._resolve(waitDuration);
        return new Promise(resolve => setTimeout(() => {
            super.endEffect();
            resolve(this.data);
        }, waitDuration));
    }
    
}