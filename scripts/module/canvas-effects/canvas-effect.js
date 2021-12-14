import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import * as lib from "../lib/lib.js";
import filters from "../lib/filters.js";
import flagManager from "../flag-manager.js";
import CONSTANTS from "../constants.js";
import * as canvaslib from "../lib/canvas-utils.js";
import { SequencerFile } from "../sequencer-file.js";

export default class CanvasEffect extends PIXI.Container {

    constructor(inData) {
        super();

        // Set default values
        this.actualCreationTime = (+new Date())
        this.data = inData;

        this.ended = null;

        this.spriteContainer = null;

        this.sprite = null;

        this.text = null;

        this._resolve = null;
        this._reject = null;

        this._durationResolve = null;
        this._durationReject = null;

        this._file = null;

        this._loopOffset = 0;

        this.filters = {};

        this._animationDuration = 0;

        this._ticker = new PIXI.Ticker;

        this._ticker.start();

        this._video = false;

        this._twister = new MersenneTwister(this.data.creationTimestamp);

        this.isRangeFind = false;

        this._source = false;
        this._sourceOffset = false;

        this._target = false;
        this._targetOffset = false;

        this.context = this.data.attachTo && this.source?.document ? this.source.document : game.scenes.get(this.data.sceneId);

        this._nameOffsetMap = Object.fromEntries(Object.entries(foundry.utils.duplicate(this.data.nameOffsetMap)).map(entry => {
            return [entry[0], this.setupOffsetMap(entry[1])];
        }));

    }

    get source() {
        if (!this._source && this.data.source) {

            let source = this.data.source;
            let offsetMap = this._nameOffsetMap?.[this.data.source];
            if (offsetMap) {
                source = offsetMap?.targetObj || offsetMap?.sourceObj || source;
            } else if (!canvaslib.is_object_canvas_data(source)) {
                source = lib.get_object_from_scene(source, this.data.sceneId);
                source = source?._object ?? source;
            }

            this._source = source;

        }

        return this._source;
    }

    get originalSourcePosition() {
        if (!this._sourcePosition && this.source) {
            if (this.data.attachTo) {
                this._sourcePosition = this.source;
            } else {
                this._sourcePosition = canvaslib.get_object_position(this.source);
            }
        }
        return this._sourcePosition?.worldPosition || this._sourcePosition?.center || this._sourcePosition || this.source;
    }

    get sourcePosition() {

        const position = this.originalSourcePosition;
        const offset = this.sourceOffset;

        return {
            x: position.x - offset.x,
            y: position.y - offset.y
        };

    }

    get sourceOffset() {

        if (this._sourceOffset) {
            return this._sourceOffset;
        }

        const sourceOffset = {
            x: 0,
            y: 0
        }

        let twister = this._twister;

        let nameOffsetMap = this._nameOffsetMap?.[this.data.name];

        if (nameOffsetMap) {
            twister = nameOffsetMap.twister;
        }

        if (!this.target) {

            if (this.data.missed) {
                let _offset = canvaslib.calculate_missed_position(this.source, this.target, twister);
                sourceOffset.x -= _offset.x;
                sourceOffset.y -= _offset.y;
            }

            if (this.data.randomOffset) {
                let _offset = canvaslib.get_random_offset(this.source, this.data.randomOffset, twister);
                sourceOffset.x -= _offset.x;
                sourceOffset.y -= _offset.y;
            }

            if (this.data.offset) {
                sourceOffset.x -= this.data.offset.x;
                sourceOffset.y -= this.data.offset.y;
            }

        }

        let sourceOffsetMap = this._nameOffsetMap?.[this.data.source];

        if (sourceOffsetMap) {

            if (sourceOffsetMap.missed) {
                let _offset = canvaslib.calculate_missed_position(sourceOffsetMap.sourceObj, sourceOffsetMap.targetObj, sourceOffsetMap.twister);
                sourceOffset.x -= _offset.x;
                sourceOffset.y -= _offset.y;
            }

            if (sourceOffsetMap.randomOffset) {
                let _offset = canvaslib.get_random_offset(sourceOffsetMap.actualTarget, sourceOffsetMap.randomOffset, sourceOffsetMap.twister);
                sourceOffset.x -= _offset.x;
                sourceOffset.y -= _offset.y;
            }

            if (sourceOffsetMap.offset) {
                sourceOffset.x -= sourceOffsetMap.offset.x;
                sourceOffset.y -= sourceOffsetMap.offset.y;
            }

        }

        this._sourceOffset = sourceOffset;

        return this._sourceOffset;

    }

    get target() {
        if (!this._target && this.data.target) {

            let target = this.data.target;
            let offsetMap = this._nameOffsetMap?.[this.data.target];
            if (offsetMap) {
                target = offsetMap?.targetObj || offsetMap?.sourceObj || target;
            } else if (!canvaslib.is_object_canvas_data(target)) {
                target = lib.get_object_from_scene(target, this.data.sceneId);
                target = target?._object ?? target;
            }

            this._target = target;
        }
        return this._target;
    }

    get originalTargetPosition() {
        if (!this._targetPosition && this.target) {
            if (this.data.reachTowards?.attachTo) {
                this._targetPosition = this.target;
            } else {
                this._targetPosition = canvaslib.get_object_position(this.target, true);
            }
        }

        return this._targetPosition?.worldPosition || this._targetPosition?.center || this._targetPosition || this.target;
    }

    get targetPosition() {

        const position = this.originalTargetPosition;
        const offset = this.targetOffset;

        return {
            x: position.x - offset.x,
            y: position.y - offset.y
        };

    }

    get targetOffset() {

        if (this._targetOffset) {
            return this._targetOffset;
        }

        const targetOffset = {
            x: 0,
            y: 0
        }

        let twister = this._twister;

        let nameOffsetMap = this._nameOffsetMap?.[this.data.name];

        if (nameOffsetMap) {
            twister = nameOffsetMap.twister;
        }

        if (this.data.missed) {
            let _offset = canvaslib.calculate_missed_position(this.source, this.target, twister);
            targetOffset.x -= _offset.x;
            targetOffset.y -= _offset.y;
        }

        if (this.data.randomOffset) {
            let _offset = canvaslib.get_random_offset(this.target, this.data.randomOffset, twister);
            targetOffset.x -= _offset.x;
            targetOffset.y -= _offset.y;
        }

        if (this.data.offset) {
            targetOffset.x -= this.data.offset.x;
            targetOffset.y -= this.data.offset.y;
        }

        let targetOffsetMap = this._nameOffsetMap?.[this.data.target];

        if (targetOffsetMap) {

            if (targetOffsetMap.missed) {
                let _offset = canvaslib.calculate_missed_position(targetOffsetMap.sourceObj, targetOffsetMap.targetObj, targetOffsetMap.twister);
                targetOffset.x -= _offset.x;
                targetOffset.y -= _offset.y;
            }

            if (targetOffsetMap.randomOffset) {
                let _offset = canvaslib.get_random_offset(targetOffsetMap.actualTarget, targetOffsetMap.randomOffset, targetOffsetMap.twister);
                targetOffset.x -= _offset.x;
                targetOffset.y -= _offset.y;
            }

            if (targetOffsetMap.offset) {
                targetOffset.x -= targetOffsetMap.offset.x;
                targetOffset.y -= targetOffsetMap.offset.y;
            }

        }

        this._targetOffset = targetOffset;

        return this._targetOffset;

    }

    get worldPosition() {
        const t = canvas.stage.worldTransform;
        return {
            x: (this.sprite.worldTransform.tx - t.tx) / canvas.stage.scale.x,
            y: (this.sprite.worldTransform.ty - t.ty) / canvas.stage.scale.y
        }
    }

    get id() {
        return this.data.id;
    }

    get userCanUpdate() {
        return game.user.isGM
            || this.data.creatorUserId === game.user.id
            || (this.data.attachTo && this.source.document.canUserModify(game.user, "update"));
    }

    get userCanDelete() {
        return this.userCanUpdate || lib.user_can_do("permissions-effect-delete");
    }

    get onCurrentScene() {
        return this.data.sceneId === game.user.viewedScene;
    }

    get shouldShowFadedVersion() {
        // If the effect is going to be played for a subset of users
        // And the users do not contain the GM
        // And the GM has not set the opacity user-specific effects to 0
        // And it is not an effect that is only played for the user who created the effect
        return this.data.users.length
            && !this.data.users.includes(game.userId)
            && game.settings.get(CONSTANTS.MODULE_NAME, "user-effect-opacity") !== 0
            && !(this.data.users.length === 1 && this.data.users.includes(this.data.creatorUserId));
    }

    get isValid() {
        return this._file || this.data.text;
    }

    get video() {
        return this._video;
    }

    set video(inVideo) {

        if (!inVideo) return;

        inVideo.playbackRate = this.data.playbackRate ? this.data.playbackRate : 1.0;

        if (!this._video) {
            this._video = inVideo;
            return;
        }

        const currentTime = this._video?.currentTime ?? this._startTime;
        const isLooping = this._video?.loop;

        this._video = inVideo;

        this._video.currentTime = currentTime;
        this._video.loop = isLooping;

        this._texture.update();

    }

    get gridSizeDifference() {
        return canvas.grid.size / this.data.gridSize;
    }

    static make(inData) {
        return !inData.persist
            ? new CanvasEffect(inData)
            : new PersistentCanvasEffect(inData);
    }

    setupOffsetMap(inOffsetMap) {

        if (!inOffsetMap.setup) {
            inOffsetMap.setup = true;
            inOffsetMap.sourceObj = this.establishTarget(inOffsetMap.source);
            inOffsetMap.targetObj = this.establishTarget(inOffsetMap.target);
            inOffsetMap.actualTarget = inOffsetMap.targetObj || inOffsetMap.sourceObj;
            let repetition = this.data.repetition % inOffsetMap.repetitions;
            const seed = canvaslib.get_hash(`${inOffsetMap.seed}-${repetition}`);
            inOffsetMap.twister = new MersenneTwister(seed);
        }

        return inOffsetMap;
    }

    establishTarget(inTarget) {
        if (!canvaslib.is_object_canvas_data(inTarget)) {
            inTarget = lib.get_object_from_scene(inTarget, this.data.sceneId);
            inTarget = inTarget?._object ?? inTarget;
        }
        return inTarget;
    }

    _addToContainer() {

        if (this.data.screenSpace) {
            Sequencer.UILayer.container.addChild(this);
            return;
        }

        let layer = [
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

    get shouldPlay(){
        return (
            game.settings.get('sequencer', 'effectsEnabled') &&
            game.user.viewedScene === this.data.sceneId &&
            (
                game.user.isGM ||
                this.data.users.length === 0 ||
                this.data.users.includes(game.userId) ||
                this.data.creatorUserId === game.userId
            )
        );
    }

    async play() {

        const durationPromise = new Promise((resolve, reject) => {
            this._durationResolve = resolve;
            this._durationReject = reject;
        });

        const finishPromise = new Promise(async (resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
            Hooks.call("createSequencerEffect", this);
            this.initialize();
        });

        return {
            duration: durationPromise,
            promise: finishPromise
        }

    }

    async _loadTexture() {

        if (this.data.file === "") {
            return false;
        }

        if (!(Sequencer.Database.entryExists(this.data.file) || (await srcExists(this.data.file)))) {
            let error = "Sequencer "
            if (this.data.moduleName !== "Sequencer") error += `| Module: ${this.data.moduleName}`;
            error += ` | CanvasEffect | Play Effect - ${game.i18n.localize("SEQUENCER.ErrorCouldNotPlay")}:<br>${this.data.file}`;
            ui.notifications.error(error);
            console.error(error.replace("<br>", "\n"))
            this._reject();
            this._durationReject();
            return;
        }

        if (!Sequencer.Database.entryExists(this.data.file)) {
            let texture = await SequencerFileCache.loadFile(this.data.file);
            this.video = texture?.baseTexture?.resource?.source ?? false;
            this._texture = texture;
            return texture;
        }

        const sequencerFile = Sequencer.Database.getEntry(this.data.file).copy();
        sequencerFile.forcedIndex = this.data.forcedIndex;
        sequencerFile.twister = this._twister;

        this._isRangeFind = sequencerFile.isRangeFind;

        if (!this._isRangeFind) {
            this._texture = await sequencerFile.getTexture();
            this.video = this._texture?.baseTexture?.resource?.source ?? false;
        }

        return sequencerFile;

    }

    endEffect() {

        if (!this.ended) {
            this.ended = true;

            this._ticker.destroy();
            SequencerAnimationEngine.endAnimations(this);

            try{
                this.video.removeAttribute('src');
                this.video.pause();
                this.video.load();
            }catch(err){ }

            try {
                this._file.destroy();
            } catch (err) {
            }

            try {
                if (this.data.screenSpace) {
                    Sequencer.UILayer.removeContainerByEffect(this);
                }
            } catch (err) {
            }

            this.destroy({ children: true });

        }
    }

    destroy(options) {
        return super.destroy(options);
    }

    async initialize(play = true) {
        this._file = await this._loadTexture();
        this._addToContainer();
        await this._createSprite();
        await this._transformSprite();
        await this._calculateDuration();
        this._playCustomAnimations();
        this._playPresetAnimations();
        this._setEndTimeout();
        this._timeoutSpriteVisibility();
        if (play) this._tryPlay();
        lib.debug(`Playing effect:`, this.data);
    }

    _playPresetAnimations() {
        this._moveTowards();

        this._fadeIn();
        this._scaleIn();
        this._rotateIn();

        this._fadeOut();
        this._scaleOut();
        this._rotateOut();
    }

    async _calculateDuration() {

        this._animationDuration = this.data.duration || (this.video?.duration ?? 1) * 1000;

        if (this.data.speed && this.data.moves) {
            let durationFromSpeed = (this.data.distance / this.data.speed) * 1000;
            this._animationDuration = Math.max(durationFromSpeed, this.data.duration);
        } else if (!this.data.duration && !this.video) {
            this._determineStaticImageDuration();
        }

        this._clampAnimationDuration();

        this._animationDuration /= (this.data.playbackRate ?? 1.0);

        this._durationResolve(this._animationDuration);

        if (this.video) {
            this.video.loop = (this._animationDuration / 1000) > this.video.duration && !this.data.noLoop;
        }

    }

    _determineStaticImageDuration() {

        let fadeDuration = (this.data.fadeIn?.duration ?? 0) + (this.data.fadeOut?.duration ?? 0);
        let scaleDuration = (this.data.scaleIn?.duration ?? 0) + (this.data.scaleOut?.duration ?? 0);
        let rotateDuration = (this.data.rotateIn?.duration ?? 0) + (this.data.rotateOut?.duration ?? 0);
        let moveDuration = 0;
        if (this.data.moves) {
            moveDuration = (this.data.speed ? (this.data.distance / this.data.speed) * 1000 : 1000) + this.data.moves.delay;
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

    _clampAnimationDuration() {

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

        this.endTime = this._animationDuration / 1000;

    }

    _timeoutSpriteVisibility() {
        setTimeout(() => {
            this.sprite.visible = true;
        }, this.data.animations ? 50 : 0);
    }

    async _createSprite() {

        this.zIndex = !lib.is_real_number(this.data.zIndex) ? 100000 - this.data.index : 100000 + this.data.zIndex;

        if (this.data.text) {

            const text = this.data.text.text;
            const fontSettings = foundry.utils.duplicate(this.data.text);
            fontSettings.fontSize = (fontSettings?.fontSize ?? 26) * (150 / canvas.grid.size);

            this.text = new PIXI.Text(text, fontSettings);
            this.text.resolution = 10;

        }

        this.sprite = new PIXI.Sprite();
        this.sprite.zIndex = 0;

        this.sprite.filters = [];

        for (let filterData of (this.data.filters || [])) {
            const filter = new filters[filterData.className](filterData.data);
            this.sprite.filters.push(filter);
            const filterKeyName = filterData.name || filterData.className;
            this.filters[filterKeyName] = filter;
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

        this.sprite.visible = !this.data.animations;

        this.sprite.rotation = Math.normalizeRadians(Math.toRadians(this.data.angle));

        this.spriteContainer = new PIXI.Container();
        this.spriteContainer.sortableChildren = true;
        this.spriteContainer.addChild(this.sprite);

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

        this.zeroRotationContainer = new PIXI.Container();
        this.zeroRotationContainer.addChild(this.spriteContainer);

        this.addChild(this.zeroRotationContainer);

    }

    async _applyDistanceScaling() {

        const ray = new Ray(this.sourcePosition, this.targetPosition);

        let scaleX = 1.0;
        let scaleY = 1.0;
        let texture;
        let spriteAnchor = this.data.anchor?.x ?? 1.0;

        if(this._file instanceof SequencerFile){

            const distance = ray.distance / this.data.scale.x;
            const result = await this._file.getTexture(distance);

            texture = result.texture;
            spriteAnchor = result.spriteAnchor ?? this.anchor?.x ?? 0.5;

            scaleX = result.spriteScale;
            scaleY = result.spriteScale;

        }else if(this._file instanceof PIXI.Texture){

            texture = this._file;

            let spriteScale = ray.distance / (texture.width - (this.data.startPoint + this.data.endPoint));
            spriteAnchor = this.data.startPoint / texture.width;

            scaleX = spriteScale;
            scaleY = spriteScale;

        }

        this.scale.set(
            scaleX * this.data.scale.x * this.data.flipX,
            scaleY * this.data.scale.y * this.data.flipY
        )

        this.sprite.anchor.set(
            this.data.flipX === 1 ? spriteAnchor : 1 - spriteAnchor,
            (this.data.anchor?.y ?? 0.5)
        )

        this._rotateTowards(ray);

        if (this.sprite.texture === texture && this.sprite.texture?.isValid) return;

        this.sprite.texture = texture;
        this._texture = texture;
        this.video = texture?.baseTexture?.resource?.source ?? false;

        this._tryPlay();

    }

    _tryPlay() {
        if (this._videoIsPlaying || this.tryingToPlay) return;
        this.tryingToPlay = true;
        return new Promise(async (resolve) => {
            while(!this._videoIsPlaying){
                try {
                    await this.video.play();
                }catch(err){
                    console.log(err)
                }
            }
            if(this._videoIsPlaying) {
                this.tryingToPlay = false;
                resolve();
            }else{
                resolve(this._tryPlay());
            }
        });
    }

    get _videoIsPlaying() {
        return (this.video && this.video.currentTime > 0 && !this.video.paused);
    }

    _rotateTowards(ray = false) {

        if (!ray) {
            const sourcePosition = this.data.flipX === 1 ? this.sourcePosition : this.targetPosition;
            const targetPosition = this.data.flipX === 1 ? this.targetPosition : this.sourcePosition;
            ray = new Ray(sourcePosition, targetPosition);
        }

        const angle = Math.normalizeRadians(ray.angle)

        this.rotation = angle;

        if (!this._isRangeFind && this.data.zeroSpriteRotation) {

            this.zeroRotationContainer.rotation = -angle;

        }

    }

    async _transformSprite() {

        if (this.data.reachTowards) {

            await this._applyDistanceScaling();

            if (this.data.reachTowards?.attachTo) {
                this._ticker.add(async () => {
                    try {
                        await this._applyDistanceScaling();
                    } catch (err) {
                        ticker.destroy();
                    }
                });
            }

        } else if (this.data._rotateTowards) {
            this._rotateTowards();
            if (this.data._rotateTowards?.attachTo) {
                this._ticker.add(async () => {
                    try {
                        await this._rotateTowards();
                    } catch (err) {
                        ticker.destroy();
                    }
                });
            }
        }

        if (!this._isRangeFind && !this.data.reachTowards) {

            if (this.data.scaleToObject) {

                let { width, height } = this.target
                    ? canvaslib.get_object_dimensions(this.target)
                    : canvaslib.get_object_dimensions(this.source);

                this.sprite.width = width * this.data.scale.x * this.data.flipX;
                this.sprite.height = height * this.data.scale.y * this.data.flipY;

            } else if (this.data.size) {

                const ratio = this.sprite.height / this.sprite.width;

                let { height, width } = this.data.size;

                if (this.data.size.width === "auto" || this.data.size.height === "auto") {

                    height = this.sprite.height;
                    width = this.sprite.width;

                    if (this.data.size.width === "auto") {
                        height = this.data.size.height;
                        width = height / ratio;
                    } else if (this.data.size.height === "auto") {
                        width = this.data.size.width;
                        height = width * ratio;
                    }

                }

                this.sprite.width = (width * this.data.scale.x) * this.data.flipX;
                this.sprite.height = (height * this.data.scale.y) * this.data.flipY;

            } else {

                this.sprite.scale.set(
                    (this.data.scale?.x ?? 1.0) * this.data.flipX,
                    (this.data.scale?.y ?? 1.0) * this.data.flipY
                );

            }

        }

        if (!this.sprite.texture.valid && this._texture?.valid) {
            this.sprite.texture = this._texture;
        }

        if (this.video && (this._startTime || this._loopOffset > 0) && this.video?.currentTime !== undefined) {
            await lib.wait(20)
            this.sprite.texture.update();
        }

        if (this.data.attachTo) {

            this._ticker.add(() => {

                let offset = { x: 0, y: 0 };

                if (this.data.align) {

                    offset = canvaslib.align({
                        context: this.source,
                        spriteWidth: this.sprite.width,
                        spriteHeight: this.sprite.height,
                        align: this.data.align
                    })

                }

                this.position.set(
                    this.sourcePosition.x - offset.x,
                    this.sourcePosition.y - offset.y
                );
            });

        } else if (!this.data.screenSpace) {

            this.position.set(
                this.sourcePosition.x,
                this.sourcePosition.y
            );

        }

        this.pivot.set(
            lib.interpolate(this.sprite.width * -0.5, this.sprite.width * 0.5, this.data.anchor?.x ?? 0.5),
            lib.interpolate(this.sprite.height * -0.5, this.sprite.height * 0.5, this.data.anchor?.y ?? 0.5)
        );

    }

    highlight(show) {
        if (!this.highlightBox && this.sprite) {
            this.highlightBox = this.createBox("0xFFFFFF", 1, 9);
            this.spriteContainer.addChild(this.highlightBox);
        }
        this.highlightBox.visible = show;
        return this;
    }

    createBox(color, size, zIndex) {

        const bounds = this.spriteContainer.getLocalBounds();

        let width = bounds.width * size;
        let height = bounds.height * size;

        let box = new PIXI.Graphics();
        box.lineStyle({
            width: 3 * size,
            color: color,
            alignment: 0
        })
        box.moveTo(width / -2, height / -2);
        box.lineTo(width / 2, height / -2);
        box.lineTo(width / 2, height / 2);
        box.lineTo(width / -2, height / 2);
        box.lineTo(width / -2, height / -2);
        box.lineTo(width / 2, height / -2);
        box.visible = false;
        box.zIndex = zIndex;

        return box;

    }

    counterAnimateRotation(animation) {

        if (this.data.zeroSpriteRotation && animation.target === this.spriteContainer) {
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

    _playCustomAnimations() {

        if (!this.data.animations) return 0;

        let animationsToSend = [];

        const animations = foundry.utils.duplicate(this.data.animations);

        const oneShotAnimations = animations.filter(animation => !animation.looping);

        for (let animation of oneShotAnimations) {

            animation.target = getProperty(this, animation.target);

            if (!animation.target) continue;

            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.from = ((animation.from / 180) * Math.PI);
                animation.to = ((animation.to / 180) * Math.PI);
            }

            animationsToSend = animationsToSend.concat(this.counterAnimateRotation(animation))

        }

        const loopingAnimations = animations.filter(animation => animation.looping);

        for (let animation of loopingAnimations) {

            animation.target = getProperty(this, animation.target);

            if (!animation.target) continue;

            if (animation.propertyName.indexOf("rotation") > -1) {
                animation.values = animation.values.map(value => {
                    return ((value / 180) * Math.PI);
                });
            }

            animationsToSend = animationsToSend.concat(this.counterAnimateRotation(animation))

        }

        SequencerAnimationEngine.addAnimation(this.id,
            animationsToSend,
            this.actualCreationTime - this.data.creationTimestamp
        );

    }

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

    _determineScale(property) {
        let scale = {
            x: this.sprite.scale.x * this.data.flipX,
            y: this.sprite.scale.y * this.data.flipY
        };

        if (lib.is_real_number(property.value)) {
            scale.x *= property.value * this.gridSizeDifference * this.data.flipX;
            scale.y *= property.value * this.gridSizeDifference * this.data.flipY;
        } else {
            scale.x *= property.value.x * this.gridSizeDifference * this.data.flipX;
            scale.y *= property.value.y * this.gridSizeDifference * this.data.flipY;
        }

        return scale;
    }

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

    _rotateIn() {

        if (!this.data.rotateIn || !this.sprite) return 0;

        let rotateIn = this.data.rotateIn;

        if (this.actualCreationTime - (this.data.creationTimestamp + rotateIn.duration + rotateIn.delay) > 0) return;

        let original_radians = this.spriteContainer.rotation;
        this.spriteContainer.rotation = (rotateIn.value / 180) * Math.PI;

        SequencerAnimationEngine.addAnimation(this.id, this.counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: original_radians,
            duration: rotateIn.duration,
            ease: rotateIn.ease,
            delay: rotateIn.delay
        }))

        return rotateIn.duration + rotateIn.delay;
    }

    _rotateOut(immediate = false) {

        if (!this.data.rotateOut || !this.sprite) return 0;

        let rotateOut = this.data.rotateOut;

        rotateOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - rotateOut.duration + rotateOut.delay, 0)
            : Math.max(this._animationDuration - rotateOut.duration + rotateOut.delay, 0);

        SequencerAnimationEngine.addAnimation(this.id, this.counterAnimateRotation({
            target: this.spriteContainer,
            propertyName: "rotation",
            to: (rotateOut.value / 180) * Math.PI,
            duration: rotateOut.duration,
            ease: rotateOut.ease,
            delay: rotateOut.delay
        }))

        return rotateOut.duration + rotateOut.delay;

    }

    _moveTowards() {

        if (!this.data.moves || !this.sprite) return 0;

        let moves = this.data.moves;

        let movementDuration = this._animationDuration;
        if (this.data.speed) {
            movementDuration = (this.data.distance / this.data.speed) * 1000;
        }

        if(this.data.moves.rotate) this._rotateTowards();

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

    _setEndTimeout() {
        setTimeout(() => {
            this.endEffect();
            this._resolve(this.data);
        }, this._animationDuration);
    }
}

class PersistentCanvasEffect extends CanvasEffect {

    async initialize() {
        await super.initialize(false);
        this.startEffect();
    }

    playPresetAnimations() {
        this._moveTowards();
        this._fadeIn();
        this._scaleIn();
        this._rotateIn();
    }

    async startEffect() {
        if (!this.video || this._videoIsPlaying) return;

        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;

        if (!this.data.noLoop) {
            return this.startLoop(creationTimeDifference);
        }

        await this._tryPlay();

        if (creationTimeDifference < this._animationDuration) {
            this.video.currentTime = creationTimeDifference / 1000;
            return;
        }

        this.video.pause();
        this.video.currentTime = this.endTime;
        if (this.sprite.texture) {
            setTimeout(() => {
                this.sprite.texture.update();
            }, 350);
        }
    }

    async startLoop(creationTimeDifference) {
        this.video.loop = (!this._startTime && !this.endTime) || this._startTime === 0 && this.endTime === this.video.duration;
        this._loopOffset = (creationTimeDifference % this._animationDuration) / 1000;
        this.resetLoop();
    }

    async resetLoop() {
        this.video.currentTime = this._startTime + this._loopOffset;
        if (this.ended) return;
        await this._tryPlay();
        if (this.video.loop) return;
        setTimeout(() => {
            this._loopOffset = 0;
            this.resetLoop();
        }, this._animationDuration - (this._loopOffset * 1000));
    }

    timeoutSpriteVisibility() {
        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;
        if (creationTimeDifference === 0 && !this.data.animations) {
            this.sprite.visible = true;
            return;
        }
        setTimeout(() => {
            this.sprite.visible = true;
        }, 50);
    }

    setEndTimeout() {
        let creationTimeDifference = this.actualCreationTime - this.data.creationTimestamp;
        if (!this.data.noLoop || creationTimeDifference >= this._animationDuration || !this.video) return;
        setTimeout(() => {
            this.video.pause();
        }, this._animationDuration)
    }

    async endEffect() {
        const durations = [
            this._fadeOut(this.data.extraEndDuration),
            this._scaleOut(this.data.extraEndDuration),
            this._rotateOut(this.data.extraEndDuration),
        ].filter(Boolean);
        const waitDuration = Math.max(...durations);
        this._resolve(waitDuration);
        return new Promise(resolve => setTimeout(() => {
            super.endEffect()
            resolve(this.data);
        }, waitDuration));
    }

}