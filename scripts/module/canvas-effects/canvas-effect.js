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
import { random_float_between } from "../lib/lib.js";

export default class CanvasEffect extends PIXI.Container {

    static make(inData) {
        return !inData.persist
            ? new CanvasEffect(inData)
            : new PersistentCanvasEffect(inData);
    }

    static checkValid(effectData) {
        let sourceExists = true;
        let targetExists = true;
        if(effectData.source && lib.is_UUID(effectData.source)){
            sourceExists = lib.from_uuid_fast(effectData.source);
        }
        if(effectData.target && lib.is_UUID(effectData.target)){
            targetExists = lib.from_uuid_fast(effectData.target);
        }
        return sourceExists && targetExists;
    }

    constructor(inData) {
        super();

        this.sortableChildren = true;

        // Set default values
        this.actualCreationTime = (+new Date())
        this.data = inData;

        this._resolve = null;
        this._reject = null;

        this._durationResolve = null;
        this._durationReject = null;

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
        if(!lib.is_UUID(this.context.uuid)){
            return "";
        }
        return this.context.uuid + ".data.flags.sequencer.effects." + this.id;
    }

    /**
     * Whether the source of this effect is temporary
     *
     * @returns {boolean}
     */
    get isSourceTemporary(){
        return this.data.attachTo?.active && this.source?.document && !lib.is_UUID(this.source?.document.uuid);
    }

    /**
     * Whether the target of this effect is temporary
     *
     * @returns {boolean}
     */
    get isTargetTemporary(){
        return this.data.stretchTo?.attachTo && this.target?.document && !lib.is_UUID(this.target?.document.uuid);
    }

    /**
     * The source object (or source location) of the effect
     *
     * @returns {boolean|object}
     */
    get source() {
        if (!this._source && this.data.source) {
            this._source = this._getObjectByID(this.data.source);
        }

        return this._source;
    }

    /**
     * The source object's current position, or its current position
     *
     * @returns {boolean|object}
     */
    get originalSourcePosition() {
        if (!this._sourcePosition && this.source) {
            if (this.data.attachTo) {
                this._sourcePosition = this.source;
            } else {
                this._sourcePosition = canvaslib.get_object_position(this.source);
            }
        }
        if(this._sourcePosition instanceof MeasuredTemplate){
            return canvaslib.get_object_position(this._sourcePosition)
        }
        return this._sourcePosition?.worldPosition || this._sourcePosition?.center || this._sourcePosition || this.source;
    }

    /**
     * The source position with the relevant offsets calculated
     *
     * @returns {{x: number, y: number}}
     */
    get sourcePosition() {

        const position = this.originalSourcePosition;
        this._sourceOffset = this._sourceOffset || this._getOffset(this.data.source, true);

        return {
            x: position.x - this._sourceOffset.x,
            y: position.y - this._sourceOffset.y
        };

    }

    /**
     * The target object (or target location) of the effect
     *
     * @returns {boolean|object}
     */
    get target() {
        if (!this._target && this.data.target) {
            this._target = this._getObjectByID(this.data.target);
        }
        return this._target;
    }

    /**
     * The target object's current position, or its current position
     *
     * @returns {boolean|object}
     */
    get originalTargetPosition() {
        if (!this._targetPosition && this.target) {
            if (this.data.stretchTo?.attachTo) {
                this._targetPosition = this.target;
            } else {
                this._targetPosition = canvaslib.get_object_position(this.target, { measure: true });
            }
        }

        if(this._targetPosition instanceof MeasuredTemplate){
            return canvaslib.get_object_position(this._targetPosition, { measure: true })
        }

        return this._targetPosition?.worldPosition || this._targetPosition?.center || this._targetPosition || this.target;
    }

    /**
     * The target position with the relevant offsets calculated
     *
     * @returns {{x: number, y: number}}
     */
    get targetPosition() {

        const position = this.originalTargetPosition;
        this._targetOffset = this._targetOffset || this._getOffset(this.data.target);

        return {
            x: position.x - this._targetOffset.x,
            y: position.y - this._targetOffset.y
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

        const offset = {
            x: 0,
            y: 0
        }

        let twister = this._twister;

        let nameOffsetMap = this._nameOffsetMap?.[this.data.name];

        if (nameOffsetMap) {
            twister = nameOffsetMap.twister;
        }

        // If the effect is missing, and it's not the source we're offsetting OR it is the source but we don't have a target (it's playing on the spot)
        if (this.data.missed && (!source || !this.data.target)) {
            let missedOffset = canvaslib.calculate_missed_position(this.source, this.target, twister);
            offset.x -= missedOffset.x;
            offset.y -= missedOffset.y;
        }

        if (this.data.randomOffset && (!source || !this.data.target)) {
            let randomOffset = canvaslib.get_random_offset(this.target, this.data.randomOffset, twister);
            offset.x -= randomOffset.x;
            offset.y -= randomOffset.y;
        }

        if (this.data.offset && (!source || !this.data.target)) {
            offset.x += this.data.offset.x;
            offset.y += this.data.offset.y;
        }

        let offsetMap = this._nameOffsetMap?.[offsetMapName];

        if (offsetMap) {

            if (offsetMap.missed) {
                const missedOffset = canvaslib.calculate_missed_position(offsetMap.sourceObj, offsetMap.targetObj, offsetMap.twister);
                offset.x -= missedOffset.x;
                offset.y -= missedOffset.y;
            }

            if (offsetMap.randomOffset) {
                const randomOffset = canvaslib.get_random_offset(offsetMap.actualTarget, offsetMap.randomOffset, offsetMap.twister);
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
            inOffsetMap.actualTarget = inOffsetMap.targetObj || inOffsetMap.sourceObj;
            let repetition = this.data.repetition % inOffsetMap.repetitions;
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
            || (this.data.attachTo?.active && this.source.document.canUserModify(game.user, "update"));
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

        this._video.currentTime = this.playNaturally ? 0 : currentTime;
        this._video.loop = isLooping;

        this._texture.update();

    }

    /**
     * The template of the effect, determining the effect's internal grid size, and start/end padding
     *
     * @returns {object}
     */
    get template(){
        return foundry.utils.mergeObject({
            gridSize: canvas.grid.size,
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
        return this.data.screenSpace ? 1 : canvas.grid.size / this.template.gridSize;
    }

    /**
     * Whether the effect should be flipped on any given axis
     *
     * @returns {number}
     */
    get flipX(){
        return this.data.flipX ? -1 : 1;
    }

    get flipY(){
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
        return !this.data.time || (this._startTime === 0 && this._endTime === this.video.duration);
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
        if (!this.ended) {
            this.ended = true;
            Hooks.call("endedSequencerEffect", this);
            this._destroyDependencies();
            this.destroy();
        }
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

        if ((lib.is_UUID(newData.target) && newData.source === newData.target) || (lib.is_UUID(newData.source) && newData.source === newData.target)) {
            throw lib.custom_error("Sequencer", `CanvasEffect | update | update to effect with ID ${this.data.id} failed - an effect can't have the same source and target`)
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
        await this._transformSprite();
        this._playCustomAnimations();
        this._playPresetAnimations();
        this._setEndTimeout();
        this._timeoutVisibility();
        if (play) canvaslib.try_to_play_video(this.video);
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
        this._template = this.data.template;
        this.ended = null;
        this.spriteContainer = null;
        this.sprite = null;
        this.text = null;
        this._file = null;
        this._loopOffset = 0;
        this.filters = {};
        this._animationDuration = 0;
        this._twister = new MersenneTwister(this.data.creationTimestamp);
        this._video = null;
        this._distanceCache = null;
        this._isRangeFind = false;
        this._customAngle = 0;
        this._hooks = [];

        if(this._resetTimeout){
            clearTimeout(this._resetTimeout);
        }
        this._resetTimeout = null;

        this._source = false;
        this._sourcePosition = false;
        this._sourceOffset = false;
        this._target = false;
        this._targetPosition = false;
        this._targetOffset = false;

        this._nameOffsetMap = Object.fromEntries(Object.entries(foundry.utils.duplicate(this.data.nameOffsetMap ?? {})).map(entry => {
            return [entry[0], this._setupOffsetMap(entry[1])];
        }));

        this.context = this.data.attachTo?.active && this.source?.document ? this.source.document : game.scenes.get(this.data.sceneId);

        this._ticker = new PIXI.Ticker;
        this._ticker.start();
    }

    /**
     * Destroys all dependencies to this element, such as tickers, animations, textures, and child elements
     *
     * @private
     */
    _destroyDependencies() {

        this._removeHooks();

        this._ticker.stop();

        this._ticker.destroy();

        this._ticker = null;

        SequencerAnimationEngine.endAnimations(this);

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
                Sequencer.UILayer.removeContainerByEffect(this);
            }
        } catch (err) {
        }

        this.removeChildren().forEach(child => child.destroy({ children: true }));

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
        if (!canvaslib.is_object_canvas_data(inObject)) {
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

        if (this.data.screenSpace) {
            Sequencer.UILayer.container.addChild(this);
            return;
        }

        const layer = [
            canvas.background,
            canvas.sequencerEffectsBelowTokens,
            canvas.sequencerEffectsAboveTokens
        ][this.data.layer];

        let container = layer.children.find(child => child?.parentName === "sequencer");

        if (!container) {
            if (layer === canvas.background) {
                layer.sortableChildren = true;
                layer.children.filter(child => child.sortableChildren).map(child => child.zIndex = 1);
            }
            container = new PIXI.Container();
            container.sortableChildren = true;
            container.parentName = "sequencer";
            container.zIndex = 0.5;
            layer.addChild(container);
            layer.sortChildren();
        }

        container.addChild(this);

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

        if(this.data.customRange){

            this._file = SequencerFile.make(this.data.file, Object.values(this.template), "temporary.range.file");

        }else {

            if (!Sequencer.Database.entryExists(this.data.file)) {
                let texture = await SequencerFileCache.loadFile(this.data.file);
                this.video = this.data.file.endsWith(".webm")
                    ? texture?.baseTexture?.resource?.source ?? false
                    : false;
                this._texture = texture;
                this._file = texture;
                return;
            }

            this._file = Sequencer.Database.getEntry(this.data.file).clone();

        }

        this._file.forcedIndex = this.data.forcedIndex;
        this._file.twister = this._twister;

        this._isRangeFind = this._file instanceof SequencerFileRangeFind;

        if (this.data.stretchTo) {
            const ray = new Ray(this.sourcePosition, this.targetPosition);
            let { texture } = await this._getTextureForDistance(ray.distance);
            this._texture = texture;
        } else if (!this._isRangeFind) {
            const { texture } = await this._file.getTexture();
            this._texture = texture;
        }

        this._template = this._file.template ?? this._template;
        this.video = this._texture?.baseTexture?.resource?.source ?? false;

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
                if (!this.source || this.source._destroyed) {
                    this._ticker.stop();
                    this.endEffect(true);
                }
            });
        }
        if (this.isTargetTemporary) {
            this._ticker.add(() => {
                if (!this.target || this.target._destroyed) {
                    this._ticker.stop();
                    this.endEffect(true);
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

        // Responsible for rotating the sprite
        this.rotationContainer = this.addChild(new PIXI.Container());

        // Responsible for zeroing out rotation for the sprite if needed
        this.offsetContainer = this.rotationContainer.addChild(new PIXI.Container());

        // An offset container for the sprite
        this.spriteContainer = this.offsetContainer.addChild(new PIXI.Container());

        const sprite = this.data.stretchTo?.tiling
            ? new PIXI.TilingSprite()
            : new PIXI.Sprite();

        // The sprite itself
        this.sprite = this.spriteContainer.addChild(sprite);

        this.zIndex = !lib.is_real_number(this.data.zIndex) ? 100000 - this.data.index : 100000 + this.data.zIndex;

        if (this.data.text) {

            const text = this.data.text.text;
            const fontSettings = foundry.utils.duplicate(this.data.text);
            fontSettings.fontSize = (fontSettings?.fontSize ?? 26) * (150 / canvas.grid.size);

            this.text = new PIXI.Text(text, fontSettings);
            this.text.resolution = 10;
            this.text.zIndex = 1;

        }

        this.sprite.filters = [];

        if(this.data.filters) {
            for (let filterData of this.data.filters) {
                const filter = new filters[filterData.className](filterData.data);
                this.sprite.filters.push(filter);
                const filterKeyName = filterData.name || filterData.className;
                this.filters[filterKeyName] = filter;
            }
        }

        this.alphaFilter = new PIXI.filters.AlphaFilter(this.data.opacity);
        this.sprite.filters.push(this.alphaFilter)

        this.sprite.position.set(
            this.data.spriteOffset?.x ?? 0,
            this.data.spriteOffset?.y ?? 0
        );

        this.sprite.anchor.set(
            this.data.spriteAnchor?.x ?? 0.5,
            this.data.spriteAnchor?.y ?? 0.5
        );

        this._customAngle = this.data.angle ?? 0;
        if(this.data.randomRotation){
            this._customAngle += lib.random_float_between(-360, 360, this._twister)
        }

        this.rotationContainer.rotation = -Math.normalizeRadians(Math.toRadians(this._customAngle));

        if (this.data.tint) {
            this.sprite.tint = this.data.tint;
        }

        if (this.text) {
            this.sprite.addChild(this.text);
            this.text.anchor.set(
                this.data.text?.anchor?.x ?? 0.5,
                this.data.text?.anchor?.y ?? 0.5
            );
        }

        if (this.shouldShowFadedVersion) {
            this.filters = [
                new PIXI.filters.ColorMatrixFilter({ saturation: -1 }),
                new PIXI.filters.AlphaFilter(game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") / 100)
            ];
        }

    }

    /**
     * Sets up the hooks relating to this effect's source and target
     *
     * @private
     */
    _setupHooks(){

        if (this.data.attachTo?.active && lib.is_UUID(this.data.source)){
            const hookName = "delete" + this.data.source.split('.')[2];
            this._addHook(hookName, (doc) => {
                if (doc !== this.source.document) return;
                this.visible = false;
                const uuid = doc.uuid;
                SequencerEffectManager.objectDeleted(uuid);
            });
        }

        if (this.data.stretchTo?.attachTo && lib.is_UUID(this.data.target)){
            const hookName = "delete" + this.data.target.split('.')[2];
            this._addHook(hookName, (doc) => {
                if (doc !== this.target.document) return;
                this.visible = false;
                const uuid = doc.uuid;
                SequencerEffectManager.objectDeleted(uuid);
            });
        }

        if (this.data.attachTo?.bindVisibility && lib.is_UUID(this.data.source)) {
            const hookName = "update" + this.data.source.split('.')[2];
            this._addHook(hookName, (doc) => {
                if (doc !== this.source.document) return;
                this.renderable = this.source.visible;
                this.spriteContainer.alpha = this.source.visible && this.source.data.hidden ? 0.5 : 1.0;
            });
            this.renderable = this.source.visible;
            this.spriteContainer.alpha = this.source.visible && this.source.data.hidden ? 0.5 : 1.0;
        } else {
            this.renderable = true;
            this.spriteContainer.alpha = 1;
        }

        if (this.data.attachTo?.bindAlpha && lib.is_UUID(this.data.source)) {
            const document = this.source.document;
            if(document instanceof TokenDocument || document instanceof TileDocument) {
                const hookName = "update" + this.data.source.split('.')[2];
                this._addHook(hookName, (doc) => {
                    if (doc !== this.source.document) return;
                    this.sprite.alpha = this.source.data.alpha;
                });
                this.sprite.alpha = this.source.data.alpha;
            }
        }

    }

    _addHook(hookName, callable){
        const id = Hooks.on(hookName, callable.bind(this));
        this._hooks.push([hookName, id]);
    }

    _removeHooks(){
        this._hooks.forEach(hookData => {
            Hooks.off(hookData[0], hookData[1]);
        })
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
            let spriteAnchor = this.data.anchor?.x ?? 1.0;

            if (this._file instanceof SequencerFile) {

                const scaledDistance = distance / (this.data.scale.x ?? 1.0);
                const result = await this._file.getTexture(scaledDistance);

                texture = result.texture;

                spriteAnchor = result.spriteAnchor ?? this.data.anchor?.x ?? 0.0;

                scaleX = result.spriteScale;

                if(this.data.stretchTo?.onlyX) {
                    const widthWithPadding = texture.width - (this.template.startPoint + this.template.endPoint);
                    scaleY = widthWithPadding / texture.width;
                }else{
                    scaleY = result.spriteScale;
                }

            } else if (this._file instanceof PIXI.Texture) {

                texture = this._file;

                spriteAnchor = this.template.startPoint / texture.width;

                const widthWithPadding = texture.width - (this.template.startPoint + this.template.endPoint);
                let spriteScale = distance / widthWithPadding;

                scaleX = spriteScale;

                if(this.data.stretchTo?.onlyX) {
                    scaleY = widthWithPadding / texture.width;
                }else{
                    scaleY = spriteScale;
                }

            }

            this._distanceCache = {
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

        let { texture, spriteAnchor, scaleX, scaleY, distance } = await this._getTextureForDistance(ray.distance);

        if (this.data.stretchTo?.tiling) {
            const scaleX = (this.data.scale.x ?? 1.0) * this.gridSizeDifference;
            const scaleY = (this.data.scale.y ?? 1.0) * this.gridSizeDifference;
            this.sprite.width = distance / scaleX;
            this.sprite.height = texture.height;
            this.sprite.scale.set(
                scaleX * this.flipX,
                scaleY * this.flipY
            )
        }else {
            this.sprite.scale.set(
                scaleX * (this.data.scale.x ?? 1.0) * this.flipX,
                scaleY * (this.data.scale.y ?? 1.0) * this.flipY
            )
        }

        this.sprite.anchor.set(
            this.flipX === 1 ? spriteAnchor : 1 - spriteAnchor,
            (this.data.anchor?.y ?? 0.5)
        )

        if (this.sprite.texture === texture) return;

        this.sprite.texture = texture;
        this._texture = texture;
        this.video = texture?.baseTexture?.resource?.source ?? false;

        canvaslib.try_to_play_video(this.video);

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

        this.rotationContainer.rotation = Math.normalizeRadians(ray.angle - Math.toRadians(this._customAngle));

    }

    /**
     * Transforms the sprite, rotating it, stretching it, scaling it, sizing it according its data
     *
     * @private
     */
    async _transformSprite() {

        if (this.data.stretchTo) {

            await this._applyDistanceScaling();

            if (this.data.stretchTo?.attachTo) {
                this._ticker.add(async () => {
                    if(this.source.destroyed || this.target.destroyed) return;
                    try {
                        await this._applyDistanceScaling();
                    } catch (err){
                        lib.debug_error(err);
                    }
                });
            }

        }else {

            if (!this.sprite.texture.valid && this._texture?.valid) {
                this.sprite.texture = this._texture;
            }

        }

        if (this.video && (this._startTime || this._loopOffset > 0) && this.video?.currentTime !== undefined) {
            await lib.wait(20)
            this.sprite.texture.update();
        }

        if(!this.data.stretchTo){

            if (this.data.scaleToObject) {

                const { width, height } = this.target
                    ? canvaslib.get_object_dimensions(this.target)
                    : canvaslib.get_object_dimensions(this.source);

                this.sprite.width = width * (this.data.scale.x ?? 1.0);
                this.sprite.height = height * (this.data.scale.y ?? 1.0);

                this.sprite.scale.x *= this.flipX;
                this.sprite.scale.y *= this.flipY;

            } else if (this.data.size) {

                const ratio = this.sprite.height / this.sprite.width;

                let { height, width } = this.data.size;

                if (this.data.size.width === "auto" || this.data.size.height === "auto") {

                    height = this.sprite.height;
                    width = this.sprite.width;

                    if (this.data.size.width === "auto") {
                        height = this.data.size.height;
                        if(this.data.size.gridUnits){
                            height *= canvas.grid.size;
                        }
                        width = height / ratio;
                    } else if (this.data.size.height === "auto") {
                        width = this.data.size.width;
                        if(this.data.size.gridUnits){
                            width *= canvas.grid.size;
                        }
                        height = width * ratio;
                    }

                }else if(this.data.size.gridUnits){
                    height *= canvas.grid.size;
                    width *= canvas.grid.size;
                }

                this.sprite.width = width * (this.data.scale.x ?? 1.0);
                this.sprite.height = height * (this.data.scale.y ?? 1.0);

                this.sprite.scale.x *= this.flipX;
                this.sprite.scale.y *= this.flipY;

            } else {

                this.sprite.scale.set(
                    (this.data.scale?.x ?? 1.0) * this.flipX * this.gridSizeDifference,
                    (this.data.scale?.y ?? 1.0) * this.flipY * this.gridSizeDifference
                );

            }

        }

        if(this.data.attachTo?.active){

            this._ticker.add(() => {

                if(this.source.destroyed) return;

                try {

                    let offset = { x: 0, y: 0 };

                    if (this.data.attachTo?.align && this.data.attachTo?.align !== "center") {

                        offset = canvaslib.align({
                            context: this.source,
                            spriteWidth: this.sprite.width,
                            spriteHeight: this.sprite.height,
                            align: this.data.attachTo?.align
                        })

                    }

                    this.position.set(
                        this.sourcePosition.x - offset.x,
                        this.sourcePosition.y - offset.y
                    );

                } catch (err){
                    lib.debug_error(err);
                }

            });

            if(this.data.attachTo?.followRotation && this.source.data.rotation !== undefined && !this.data.rotateTowards && !this.data.stretchTo) {
                this._ticker.add(() => {
                    if (this.source.destroyed) return;
                    this.rotationContainer.rotation = Math.normalizeRadians(Math.toRadians(this.source.data.rotation - this._customAngle));
                });
            }

        }else{

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
                this._ticker.add(() => {
                    if(this.source.destroyed || this.target.destroyed) return;
                    try {
                        this._rotateTowards();
                    } catch (err){
                        lib.debug_error(err);
                    }
                });
            }
        }

        if(!this.data.anchor && this.data.rotateTowards) {
            const startPointRatio = (this.template.startPoint / this._texture.width) / 2;
            this.rotationContainer.pivot.set(this.sprite.width * (-0.5 + startPointRatio), 0);
        }else{
            this.rotationContainer.pivot.set(
                lib.interpolate(this.sprite.width * -0.5, this.sprite.width * 0.5, this.data.anchor?.x ?? 0.5),
                lib.interpolate(this.sprite.height * -0.5, this.sprite.height * 0.5, this.data.anchor?.y ?? 0.5)
            );
        }

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

        const animations = foundry.utils.duplicate(this.data.animations);

        const oneShotAnimations = animations.filter(animation => !animation.looping);

        for (let animation of oneShotAnimations) {

            animation.target = foundry.utils.getProperty(this, animation.target);

            if (!animation.target) continue;

            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.from = animation.from * (Math.PI / 180);
                animation.to = animation.to * (Math.PI / 180);
            }

            if (animation.propertyName.indexOf("width") > -1 && animation.gridUnits) {
                animation.from *= canvas.grid.size;
                animation.to *= canvas.grid.size;
            }

            if (animation.propertyName.indexOf("height") > -1 && animation.gridUnits) {
                animation.from *= canvas.grid.size;
                animation.to *= canvas.grid.size;
            }

            if (animation.propertyName.indexOf("scale") > -1) {
                animation.from *= this.gridSizeDifference;
                animation.to *= this.gridSizeDifference;
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

            if (animation.propertyName.indexOf("width") > -1 && animation.gridUnits) {
                animation.values = animation.values.map(value => {
                    return value * canvas.grid.size;
                });
            }

            if (animation.propertyName.indexOf("height") > -1 && animation.gridUnits) {
                animation.values = animation.values.map(value => {
                    return value * canvas.grid.size;
                });
            }

            if (animation.propertyName.indexOf("scale") > -1) {
                animation.values = animation.values.map(value => {
                    return value * this.gridSizeDifference;
                });
            }

            animationsToSend = animationsToSend.concat(this._counterAnimateRotation(animation))

        }

        SequencerAnimationEngine.addAnimation(this.id,
            animationsToSend,
            this.actualCreationTime - this.data.creationTimestamp
        );

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
        }], this.data.creationTimestamp - this.actualCreationTime);

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

        await canvaslib.try_to_play_video(this.video);

        if (creationTimeDifference < this._animationDuration) {
            this.video.currentTime = creationTimeDifference / 1000;
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
        this._loopOffset = (creationTimeDifference % this._animationDuration) / 1000;
        this._resetLoop();
    }

    /**
     * Continuously reset the video to the right time so that the start and end time can be preserved
     *
     * @returns {Promise<void>}
     * @private
     */
    async _resetLoop() {
        this.video.currentTime = this._startTime + this._loopOffset;
        if (this.ended) return;
        await canvaslib.try_to_play_video(this.video);
        if (this.video.loop) return;
        this._resetTimeout = setTimeout(() => {
            this._loopOffset = 0;
            this._resetLoop();
        }, this._animationDuration - (this._loopOffset * 1000));
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
    async endEffect(immediate = false) {
        const durations = immediate ? [0] : [
            this._fadeOut(this.data.extraEndDuration ?? 0),
            this._scaleOut(this.data.extraEndDuration ?? 0),
            this._rotateOut(this.data.extraEndDuration ?? 0),
        ].filter(Boolean);
        const waitDuration = Math.max(...durations);
        this._resolve(waitDuration);
        return new Promise(resolve => setTimeout(() => {
            super.endEffect(immediate)
            resolve(this.data);
        }, waitDuration));
    }

}