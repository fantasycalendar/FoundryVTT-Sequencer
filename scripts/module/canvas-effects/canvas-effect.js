import SequencerAnimationEngine from "../sequencer-animation-engine.js";
import SequencerFileCache from "../sequencer-file-cache.js";
import * as lib from "../lib/lib.js";
import filters from "../lib/filters.js";
import flagManager from "../flag-manager.js";
import CONSTANTS from "../constants.js";
import * as canvaslib from "../lib/canvas-utils.js";

export default class CanvasEffect extends PIXI.Container {

    constructor(inData) {
        super();

        this.ended = null;

        this.file = null;

        this.spriteContainer = null;

        this.sprite = null;

        this.text = null;

        this.resolve = null;

        this.loopOffset = 0;

        this.filters = {};

        this.animationDuration = 0;

        this.distance = false;

        this.ticker = new PIXI.Ticker;

        this.ticker.start();

        this._video = false;

        // Set default values
        this.actualCreationTime = (+new Date())
        this.data = foundry.utils.mergeObject({
            flagVersion: flagManager.latestFlagVersion,
            timestamp: (+new Date()),
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1.0, y: 1.0 },
            anchor: { x: 0.5, y: 0.5 },
            playbackRate: 1.0
        }, inData);

        this.twister = new MersenneTwister(this.data.creationTime);

        this.scene = game.scenes.get(this.data.sceneId);

        this.isRangeFind = false;

        this._source = false;
        this._sourceOffset = false;

        this._target = false;
        this._targetOffset = false;

        this.context = this.data.attachTo && this.source?.document ? this.source.document : this.scene;

        this.nameOffsetMap = Object.fromEntries(Object.entries(foundry.utils.duplicate(this.data.nameOffsetMap)).map(entry => {
            return [entry[0], this.setupOffsetMap(entry[1])];
        }));

    }

    get source() {
        if (!this._source && this.data.source) {

            let source = this.data.source;
            let offsetMap = this.nameOffsetMap?.[this.data.source];
            if (offsetMap) {
                source = offsetMap?.targetObj || offsetMap?.sourceObj || source;
            } else if (!canvaslib.is_coordinate(source)) {
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

        let twister = this.twister;

        let nameOffsetMap = this.nameOffsetMap?.[this.data.name];

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

        let sourceOffsetMap = this.nameOffsetMap?.[this.data.source];

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
            let offsetMap = this.nameOffsetMap?.[this.data.target];
            if (offsetMap) {
                target = offsetMap?.targetObj || offsetMap?.sourceObj || target;
            } else if (!canvaslib.is_coordinate(target)) {
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

        let twister = this.twister;

        let nameOffsetMap = this.nameOffsetMap?.[this.data.name];

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

        let targetOffsetMap = this.nameOffsetMap?.[this.data.target];

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
        return this.file || this.data.text;
    }

    get videoIsPlaying() {
        return (this.video && this.video.currentTime > 0 && !this.video.paused && !this.video.ended);
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

        const currentTime = this._video?.currentTime ?? this.startTime;
        const isLooping = this._video?.loop;

        this._video = inVideo;

        this._video.currentTime = currentTime;
        this._video.loop = isLooping;

        this.texture.update();

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
        if (!canvaslib.is_coordinate(inTarget)) {
            inTarget = lib.get_object_from_scene(inTarget, this.data.sceneId);
            inTarget = inTarget?._object ?? inTarget;
        }
        return inTarget;
    }

    addToContainer() {

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

    async play() {

        this.file = await this.loadTexture();

        const shouldPlay = (
            game.settings.get('sequencer', 'effectsEnabled') &&
            game.user.viewedScene === this.data.sceneId &&
            (
                game.user.isGM ||
                this.data.users.length === 0 ||
                this.data.users.includes(game.userId) ||
                this.data.creatorUserId === game.userId
            )
        );

        let promise = new Promise(async (resolve, reject) => {
            this.resolve = resolve;
            if (!this.isValid) {
                reject();
            } else {
                await this.calculateDuration();
                if (shouldPlay) {
                    Hooks.call("createSequencerEffect", this);
                    this.initialize();
                }
            }
        });

        return {
            duration: this.animationDuration,
            promise: promise
        }

    }

    async loadTexture() {

        if (this.data.file === "") {
            return false;
        }

        if (!(Sequencer.Database.entryExists(this.data.file) || (await srcExists(this.data.file)))) {
            let error = "Sequencer "
            if (this.data.moduleName !== "Sequencer") error += `| Module: ${this.data.moduleName}`;
            error += ` | CanvasEffect | Play Effect - ${game.i18n.localize("SEQUENCER.ErrorCouldNotPlay")}:<br>${this.data.file}`;
            ui.notifications.error(error);
            console.error(error.replace("<br>", "\n"))
            return;
        }

        if (!Sequencer.Database.entryExists(this.data.file)) {
            let texture = await SequencerFileCache.loadFile(this.data.file);
            this.video = texture?.baseTexture?.resource?.source ?? false;
            this.texture = texture;
            return texture;
        }

        const sequencerFile = Sequencer.Database.getEntry(this.data.file).copy();
        sequencerFile.forcedIndex = this.data.forcedIndex;
        sequencerFile.twister = this.twister;

        this.isRangeFind = sequencerFile.rangeFind && this.source;

        if (this.isRangeFind) {
            if (!this.target) this._targetPosition = this.sourcePosition;
            const _ray = new Ray(this.sourcePosition, this.targetPosition);
            this.texture = await sequencerFile.getTextureForDistance(_ray.distance);
        } else {
            this.texture = await sequencerFile.getTexture();
        }

        this.video = this.texture?.baseTexture?.resource?.source ?? false;

        return sequencerFile;

    }

    endEffect() {

        if (!this.ended) {
            this.ended = true;

            this.ticker.destroy();
            SequencerAnimationEngine.endAnimations(this);

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
                this.sprite.filters = [];
                this.spriteContainer.removeChild(this.sprite);
                this.spriteContainer.destroy();
                this.sprite.destroy();
            } catch (err) {
            }

            this.destroy();

        }
    }

    destroy(options) {
        return super.destroy(options);
    }

    async initialize(play = true) {
        this.addToContainer();
        await this.createSprite();
        await this.transformSprite();
        this.playCustomAnimations();
        this.playPresetAnimations();
        this.setEndTimeout();
        this.timeoutSpriteVisibility();
        if (play) this.tryPlay();
        lib.debug(`Playing effect:`, this.data);
    }

    playPresetAnimations() {
        this.moveTowards();

        this.fadeIn();
        this.scaleIn();
        this.rotateIn();

        this.fadeOut();
        this.scaleOut();
        this.rotateOut();
    }

    async calculateDuration() {

        this.animationDuration = this.data.duration || (this.video?.duration ?? 1) * 1000;

        if (this.data.speed && this.data.moves) {
            let durationFromSpeed = (this.data.distance / this.data.speed) * 1000;
            this.animationDuration = Math.max(durationFromSpeed, this.data.duration);
        } else if (!this.data.duration && !this.video) {
            this.determineStaticImageDuration();
        }

        this.clampAnimationDuration();

        this.animationDuration /= (this.data.playbackRate ?? 1.0);

        if (this.video) {
            this.video.loop = (this.animationDuration / 1000) > this.video.duration && !this.data.noLoop;
        }

    }

    determineStaticImageDuration() {

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

        this.animationDuration = Math.max(fadeDuration, scaleDuration, rotateDuration, moveDuration, animationDurations);

        this.animationDuration = this.animationDuration || 1000;

    }

    clampAnimationDuration() {

        this.startTime = 0;
        if (this.data.time?.start && this.video?.currentTime !== undefined) {
            let currentTime = !this.data.time.start.isPerc
                ? this.data.time.start.value ?? 0
                : (this.animationDuration * this.data.time.start.value);
            this.video.currentTime = currentTime / 1000;
            this.startTime = this.video.currentTime;
        }

        if (this.data.time?.end) {
            this.animationDuration = !this.data.time.end.isPerc
                ? this.data.time.isRange ? this.data.time.end.value - this.data.time.start.value : this.animationDuration - this.data.time.end.value
                : this.animationDuration * this.data.time.end.value;
        }

        this.endTime = this.animationDuration / 1000;

    }

    timeoutSpriteVisibility() {
        setTimeout(() => {
            this.sprite.visible = true;
        }, this.data.animations ? 50 : 0);
    }

    async createSprite() {

        if (this.data.text) {
            //this.data.text.fontSize = (this.data.text?.fontSize ?? 26) * (150 / canvas.grid.size);
            this.text = new PIXI.Text(this.data.text.text, this.data.text);
            this.text.resolution = 10;
        }

        this.sprite = new PIXI.Sprite();
        this.sprite.zIndex = 0;

        this.alphaFilter = new PIXI.filters.AlphaFilter(this.data.opacity)
        this.sprite.filters = [];

        this.zIndex = !lib.is_real_number(this.data.zIndex) ? 100000 - this.data.index : 100000 + this.data.zIndex;

        for (let [filterName, filterData] of Object.entries(this.data.filters ?? {})) {
            const filter = new filters[filterName](filterData.data);
            this.sprite.filters.push(filter);
            const filterKeyName = filterData.name || filterName;
            this.filters[filterKeyName] = filter;
        }

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

    async applyDistanceScaling() {

        const ray = new Ray(this.sourcePosition, this.targetPosition);

        if (this.distance === ray.distance) return;

        this.distance = ray.distance;

        const { texture, spriteScale, spriteAnchor } = await this.file.getScalingForDistance(ray.distance);

        if (this.texture !== texture || !this.sprite.texture.valid) {
            this.sprite.texture = texture;
        }

        this.sprite.scale.set(
            spriteScale * this.data.scale.x * this.data.flipX,
            spriteScale * this.data.scale.y * this.data.flipY
        )

        this.sprite.anchor.set(
            this.data.flipX === 1 ? spriteAnchor : 1 - spriteAnchor,
            (this.data?.anchor?.y ?? 0.5)
        )

        this.rotateTowards(ray);

        if (this.texture === texture) return;

        this.texture = this.sprite.texture;

        this.video = this.texture?.baseTexture?.resource?.source ?? false;

        await this.tryPlay();

    }

    rotateTowards(ray = false) {

        if (!ray) {
            const sourcePosition = this.data.flipX === 1 ? this.sourcePosition : this.targetPosition;
            const targetPosition = this.data.flipX === 1 ? this.targetPosition : this.sourcePosition;
            ray = new Ray(sourcePosition, targetPosition);
        }

        const angle = Math.normalizeRadians(ray.angle)

        this.rotation = angle;

        if (!this.isRangeFind && this.data.zeroSpriteRotation) {

            this.zeroRotationContainer.rotation = -angle;

        }

    }

    async transformSprite() {

        if (this.data.reachTowards) {

            await this.applyDistanceScaling();

            if (this.data.reachTowards?.attachTo) {
                this.ticker.add(async () => {
                    try {
                        await this.applyDistanceScaling();
                    } catch (err) {
                        ticker.destroy();
                    }
                });
            }

        } else if (this.data.rotateTowards) {
            this.rotateTowards();
            if (this.data.rotateTowards?.attachTo) {
                this.ticker.add(async () => {
                    try {
                        await this.rotateTowards();
                    } catch (err) {
                        ticker.destroy();
                    }
                });
            }
        }

        if (!this.isRangeFind && !this.data.reachTowards) {

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

        if (!this.sprite.texture.valid && this.texture?.valid) {
            this.sprite.texture = this.texture;
        }

        if (this.video && (this.startTime || this.loopOffset > 0) && this.video?.currentTime !== undefined) {
            await lib.wait(20)
            this.sprite.texture.update();
        }

        if (this.data.attachTo) {

            this.ticker.add(() => {

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
            lib.interpolate(this.sprite.width * -0.5, this.sprite.width * 0.5, this.data?.anchor?.x ?? 0.5),
            lib.interpolate(this.sprite.height * -0.5, this.sprite.height * 0.5, this.data?.anchor?.y ?? 0.5)
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

    tryPlay() {
        if (this.videoIsPlaying) return;
        return new Promise(async (resolve) => {
            if (this.video && !this.ended) {
                try {
                    await this.video.play();
                    resolve();
                } catch (err) {
                    setTimeout(() => {
                        resolve(this.tryPlay());
                    }, 10)
                }
            }
        });
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

    playCustomAnimations() {

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
            this.actualCreationTime - this.data.timestamp
        );

    }

    fadeIn() {

        if (!this.data.fadeIn || !this.sprite) return 0;

        let fadeIn = this.data.fadeIn;

        if (this.actualCreationTime - (this.data.timestamp + fadeIn.duration + fadeIn.delay) > 0) return;

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

    fadeOut(immediate = false) {

        if (!this.data.fadeOut || !this.sprite) return 0;

        let fadeOut = this.data.fadeOut;

        fadeOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - fadeOut.duration + fadeOut.delay, 0)
            : Math.max(this.animationDuration - fadeOut.duration + fadeOut.delay, 0);

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

    scaleIn() {

        if (!this.data.scaleIn || !this.sprite) return 0;

        let scaleIn = this.data.scaleIn;
        let fromScale = this._determineScale(scaleIn)

        if (this.actualCreationTime - (this.data.timestamp + scaleIn.duration + scaleIn.delay) > 0) return;

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

    scaleOut(immediate = false) {

        if (!this.data.scaleOut || !this.sprite) return 0;

        let scaleOut = this.data.scaleOut;
        let scale = this._determineScale(scaleOut)

        scaleOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - scaleOut.duration + scaleOut.delay, 0)
            : Math.max(this.animationDuration - scaleOut.duration + scaleOut.delay, 0);

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

    rotateIn() {

        if (!this.data.rotateIn || !this.sprite) return 0;

        let rotateIn = this.data.rotateIn;

        if (this.actualCreationTime - (this.data.timestamp + rotateIn.duration + rotateIn.delay) > 0) return;

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

    rotateOut(immediate = false) {

        if (!this.data.rotateOut || !this.sprite) return 0;

        let rotateOut = this.data.rotateOut;

        rotateOut.delay = lib.is_real_number(immediate)
            ? Math.max(immediate - rotateOut.duration + rotateOut.delay, 0)
            : Math.max(this.animationDuration - rotateOut.duration + rotateOut.delay, 0);

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

    moveTowards() {

        if (!this.data.moves || !this.sprite) return 0;

        let moves = this.data.moves;

        let movementDuration = this.animationDuration;
        if (this.data.speed) {
            movementDuration = (this.data.distance / this.data.speed) * 1000;
        }

        this.rotateTowards();

        const duration = movementDuration - moves.delay;

        if (this.actualCreationTime - (this.data.timestamp + duration + moves.delay) > 0) return;

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
        }], this.data.timestamp - this.actualCreationTime);

        return duration + moves.delay;

    }

    setEndTimeout() {
        setTimeout(() => {
            this.endEffect();
            this.resolve(this.data);
        }, this.animationDuration);
    }
}

class PersistentCanvasEffect extends CanvasEffect {

    async initialize() {
        await super.initialize(false);
        this.startEffect();
    }

    playPresetAnimations() {
        this.moveTowards();
        this.fadeIn();
        this.scaleIn();
        this.rotateIn();
    }

    async startEffect() {
        if (!this.video || this.videoIsPlaying) return;

        let creationTimeDifference = this.actualCreationTime - this.data.timestamp;

        if (!this.data.noLoop) {
            return this.startLoop(creationTimeDifference);
        }

        await this.tryPlay();

        if (creationTimeDifference < this.animationDuration) {
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
        this.video.loop = (!this.startTime && !this.endTime) || this.startTime === 0 && this.endTime === this.video.duration;
        this.loopOffset = (creationTimeDifference % this.animationDuration) / 1000;
        this.resetLoop();
    }

    async resetLoop() {
        this.video.currentTime = this.startTime + this.loopOffset;
        if (this.ended) return;
        await this.tryPlay();
        if (this.video.loop) return;
        setTimeout(() => {
            this.loopOffset = 0;
            this.resetLoop();
        }, this.animationDuration - (this.loopOffset * 1000));
    }

    timeoutSpriteVisibility() {
        let creationTimeDifference = this.actualCreationTime - this.data.timestamp;
        if (creationTimeDifference === 0 && !this.data.animations) {
            this.sprite.visible = true;
            return;
        }
        setTimeout(() => {
            this.sprite.visible = true;
        }, 50);
    }

    setEndTimeout() {
        let creationTimeDifference = this.actualCreationTime - this.data.timestamp;
        if (!this.data.noLoop || creationTimeDifference >= this.animationDuration || !this.video) return;
        setTimeout(() => {
            this.video.pause();
        }, this.animationDuration)
    }

    async endEffect() {
        const durations = [
            this.fadeOut(this.data.extraEndDuration),
            this.scaleOut(this.data.extraEndDuration),
            this.rotateOut(this.data.extraEndDuration),
        ].filter(Boolean);
        const waitDuration = Math.max(...durations);
        this.resolve(waitDuration);
        return new Promise(resolve => setTimeout(() => {
            super.endEffect()
            resolve(this.data);
        }, waitDuration));
    }

}