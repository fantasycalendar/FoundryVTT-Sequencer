// @ts-check
import AnimatedSpriteMesh from "../lib/meshes/AnimatedSpriteMesh.js";
import TilingSpriteMesh from "../lib/meshes/TilingSpriteMesh.js";
import SequencerFileCache from "../modules/sequencer-file-cache.js";
class Asset {
	destroy() {
		// nothing to do in the general case
	}
}
class TextureAsset extends Asset {
	filepath;
	texture;
	constructor({ filepath, texture }) {
		super();
		this.filepath = filepath;
		this.texture = texture;
	}
}
class VideoAsset extends Asset {
	/** @type {string} */
	filepath;

	/** @type {PIXI.Texture} */
	texture;

	/** @type {HTMLVideoElement  } */
	video;

	/**
	 *
	 * @param {object} params
	 * @param {string} params.filepath
	 * @param {PIXI.Texture} params.texture
	 * @param {HTMLVideoElement} params.video
	 */
	constructor({ filepath, texture, video }) {
		super();
		this.filepath = filepath;
		this.texture = texture;
		this.video = video;
	}
	destroy() {
		try {
			this.video.pause();
			URL.revokeObjectURL(this.video.src);
			this.video.removeAttribute("src");
			this.video.onerror = null;
			this.video.oncanplay = null;
			this.video.load();
			// @ts-expect-error can only be null after destroy
			this.video = null;
		} catch (err) {}
		this.texture.destroy(true);
	}
}
class VideoSpritesheetAsset extends Asset {
	/** @type {string} */
	filepath;

	/** @type {PIXI.Spritesheet} */
	spritesheet;

	/** @type {PIXI.FrameObject[]} */
	frameObjects;

	/** @type {number} */
	framerate;

	/**
	 * @param {object} params
	 * @param {string} params.filepath
	 * @param {PIXI.Spritesheet} params.spritesheet
	 */
	constructor({ filepath, spritesheet }) {
		super();
		this.filepath = filepath;
		this.spritesheet = spritesheet;
		// @ts-expect-error framerate is either there or undefined, stop complaining typescript...
		this.framerate = this.spritesheet.data?.meta?.frameRate ?? 30;
		const frametime = (1 / this.framerate) * 1000;
		this.frameObjects = (Object.values(spritesheet.animations)[0] ?? []).map((texture) => ({
			texture,
			time: frametime,
		}));
		this.#register();
	}
	destroy() {
		return SequencerFileCache.unloadSpritesheet(this.filepath);
	}
	#register() {
		SequencerFileCache.registerSpritesheet(this.filepath, this.spritesheet);
	}
}
class FlipbookAsset extends Asset {
	/** @type {string[]} */
	filepaths;

	/** @type {PIXI.FrameObject[]} */
	frameObjects;

	/** @type {number} */
	framerate;

	/**
	 * @param {object} params
	 * @param {string[]} params.filepaths
	 * @param {PIXI.Texture[]} params.textures
	 * @param {number} params.framerate
	 */
	constructor({ filepaths, textures, framerate = 24 }) {
		super();
		this.filepaths = filepaths;
		this.framerate = framerate;
		const frametime = (1 / framerate) * 1000;
		this.frameObjects = textures.map((texture) => ({ texture, time: frametime }));
	}
	destroy() {
		// TODO maybe add spritesheet-like ref counting for flipbooks too?
	}
}
//#endregion
//#region Playback controls
class PlaybackControls {
	destroy() {}
}
class VideoPlaybackControls extends PlaybackControls {
	/** @type {HTMLVideoElement} */
	#video;

	/** @type {PIXI.Texture} */
	#texture;

	/**
	 * @param {HTMLVideoElement} video
	 * @param {PIXI.Texture} texture
	 */
	constructor(video, texture) {
		super();
		this.#video = video;
		this.#texture = texture;
	}
	async play() {
		try {
			await this.#video.play();
			this.#texture.update();
		} catch (error) {}
	}
	stop() {
		this.#video.pause();
	}
	get duration() {
		return this.#video.duration;
	}
	get isPlaying() {
		return !this.#video.paused;
	}
	get loop() {
		return this.#video.loop;
	}
	set loop(value) {
		this.#video.loop = value;
	}
	get volume() {
		return this.#video.volume;
	}
	set volume(value) {
		this.#video.muted = !value;
		this.#video.volume = value;
	}
	get currentTime() {
		return this.#video.currentTime;
	}
	set currentTime(value) {
		this.#video.currentTime = value;
	}
	get playbackRate() {
		return this.#video.playbackRate;
	}
	set playbackRate(value) {
		this.#video.playbackRate = value;
	}
	destroy() {
		this.stop();
		// @ts-expect-error should be null only when destroyed
		this.#video = null;
		// @ts-expect-error should be null only when destroyed
		this.#texture = null;
	}
}

class SpritePlaybackControls extends PlaybackControls {
	/** @type {AnimatedSpriteMesh} */
	#sprite;

	/** @type {number} */
	#framerate;

	/** @type {number} */
	#framecount;

	/**
	 * @param {AnimatedSpriteMesh} sprite
	 * @param {number} framerate
	 * @param {number} framecount
	 */
	constructor(sprite, framerate, framecount) {
		super();
		this.#sprite = sprite;
		this.#framerate = framerate;
		this.#framecount = framecount;
	}
	async play() {
		this.#sprite.play();
	}
	stop() {
		this.#sprite.stop();
	}
	get duration() {
		return this.#framecount / this.#framerate;
	}
	get isPlaying() {
		return this.#sprite.playing;
	}
	get loop() {
		return this.#sprite.loop;
	}
	set loop(value) {
		this.#sprite.loop = value;
	}
	get volume() {
		return 0;
	}
	set volume(_value) {}

	get currentTime() {
		return (this.#sprite.currentFrame + 1) / this.#framerate;
	}
	set currentTime(value) {
		const newFrame = Math.floor(value * this.#framerate);
		const newFrameIndex = Math.clamp(newFrame, 0, this.#framecount - 1);
		if (this.#sprite.playing) {
			this.#sprite.gotoAndPlay(newFrameIndex);
		} else {
			this.#sprite.gotoAndStop(newFrameIndex);
		}
	}
	get playbackRate() {
		return this.#sprite.animationSpeed;
	}
	set playbackRate(value) {
		this.#sprite.animationSpeed = value;
	}

	destroy() {
		this.stop();
		// @ts-expect-error should be null only when destroyed
		this.#sprite = null;
	}
}

export class SequencerSpriteManager extends PIXI.Container {
	// @ts-ignore
	#id = foundry.utils.randomID();

	/** @type {import("../modules/sequencer-file.js").SequencerFile} */
	#file;

	/** @type {{ antialiasing: PIXI.SCALE_MODES; tiling?: boolean; xray?: boolean; isPersisted: boolean }} */
	#sharedSpriteConfig;

	/** @type {string | undefined} */
	#activeAssetPath;

	/** @type {Map<string | undefined, VideoAsset | VideoSpritesheetAsset | TextureAsset | FlipbookAsset>} */
	#relatedAssets = new Map();

	/** @type {VideoPlaybackControls | SpritePlaybackControls | null} */
	#playbackControls;

	/** @type {Promise<void> | undefined} */
	#preloadingPromise;

	/** @type {TilingSpriteMesh | null} */
	#managedSprite;

	/** @type {PIXI.Text | null} */
	#textSprite;

	get preloadingPromise() {
		if (this.#preloadingPromise) {
			return this.#preloadingPromise;
		}
		return Promise.resolve();
	}

	/**
	 * @param {import("../modules/sequencer-file.js").SequencerFile} file
	 * @param {{ antialiasing: PIXI.SCALE_MODES; tiling?: boolean; xray?: boolean; isPersisted: boolean }} options
	 */
	constructor(file, options) {
		super();
		this.#sharedSpriteConfig = options ?? {
			antialiasing: PIXI.SCALE_MODES.LINEAR,
			tiling: false,
			xray: false,
			isPersisted: false,
		};
		this.#file = file;
	}
	//#region public api
	get activePath() {
		return this.#activeAssetPath;
	}

	get activeAsset() {
		return this.#relatedAssets.get(this.activePath);
	}

	get texture() {
		return this.managedSprite?.texture;
	}

	get managedSprite() {
		return this.#managedSprite;
	}

	updateVideoTextures() {
		// CHECKME lets see if this works without update texture.
		this.#managedSprite?.texture?.update();
	}
	/**
	 * @param {string | undefined} filePath
	 */
	async activate(filePath) {
		if (!filePath || this.#activeAssetPath === filePath) {
			return;
		}

		let nextAsset = this.#relatedAssets.get(filePath);
		// new file is already being loaded, nothing more to do
		if (this.#relatedAssets.has(filePath) && nextAsset == null) {
			return;
		}

		if (!nextAsset) {
			this.#relatedAssets[filePath] = undefined;
			nextAsset = await this.#loadAsset(filePath);
			if (this.destroyed) {
				return;
			}
			this.#relatedAssets.set(filePath, nextAsset);
		}

		if (this.#activateAsset(nextAsset)) {
			this.#activeAssetPath = filePath;
		}
		if (this.#sharedSpriteConfig.isPersisted) {
			requestAnimationFrame(async () => {
				const spritesheet = await SequencerFileCache.requestCompiledSpritesheet(filePath);
				if (!spritesheet) {
					return;
				}
				const previousAsset = this.activeAsset;
				const asset = new VideoSpritesheetAsset({ filepath: filePath, spritesheet });
				this.#relatedAssets.set(filePath, asset);
				if (this.destroyed || this.#activeAssetPath !== filePath) {
					return;
				}
				this.#activateAsset(asset);
				previousAsset?.destroy();
			});
		}
	}
	/**
	 * @param {{ text: string | null; textStyle: Partial<PIXI.ITextStyle> | PIXI.TextStyle }} textData
	 */
	addText(textData) {
		if (this.#textSprite) {
			this.#textSprite.text = textData.text ?? "";
			return this.#textSprite;
		}
		const textSprite = new PreciseText(textData.text ?? "", textData.textStyle);
		textSprite.resolution = 5;
		textSprite.zIndex = 1;
		textSprite.anchor.set(0.5, 0.5);
		this.#textSprite = textSprite;
		return this.addChild(textSprite);
	}
	removeText() {
		this.#textSprite?.destroy();
		this.#textSprite = null;
	}

	/**
	 * @param {string | number} filepath
	 */
	removeSprite(filepath) {
		this.#relatedAssets[filepath]?.destroy();
		delete this.#relatedAssets[filepath];
	}
	async preloadVariants() {
		if (!this.#preloadingPromise) {
			return (this.#preloadingPromise = this.#preloadVariants());
		}
		return this.#preloadingPromise;
	}
	destroy() {
		this.#playbackControls?.destroy();
		for (const asset of this.#relatedAssets.values()) {
			asset?.destroy();
		}
		this.#relatedAssets.clear();
		this.managedSprite?.removeFromParent();
		this.managedSprite?.destroy();
		super.destroy({ children: true });
	}
	//#endregion
	//#region Managed Sprite proxies
	async play() {
		this.#playbackControls?.play();
	}
	stop() {
		this.#playbackControls?.stop();
	}
	get tileScale() {
		return this.managedSprite?.tileScale;
	}
	set tileScale(point) {
		if (point) {
			this.managedSprite?.tileScale.copyFrom(point);
		}
	}
	get tilePosition() {
		return this.managedSprite?.tilePosition;
	}
	set tilePosition(point) {
		if (point) {
			this.managedSprite?.tilePosition.copyFrom(point);
		}
	}
	get anchor() {
		return this.managedSprite?.anchor;
	}
	set anchor(point) {
		if (point) {
			this.managedSprite?.anchor.copyFrom(point);
		}
	}
	get tint() {
		return this.managedSprite?.tint ?? 0xffffff;
	}
	set tint(value) {
		if (this.managedSprite) {
			this.managedSprite.tint = typeof value === "number" ? Math.floor(value) : value;
		}
	}
	get scale() {
		return this.managedSprite?.scale || super.scale;
	}
	set scale(point) {
		this.managedSprite?.scale.copyFrom(point);
	}
	get width() {
		return this.managedSprite?.width ?? 0;
	}
	set width(value) {
		if (!this.managedSprite) {
			return;
		}
		this.managedSprite.width = value;
	}
	get height() {
		return this.managedSprite?.height ?? 0;
	}
	set height(value) {
		if (!this.managedSprite) {
			return;
		}
		this.managedSprite.height = value;
	}
	get resolution() {
		return this.#textSprite?.resolution;
	}
	set resolution(value) {
		if (!this.#textSprite) return;
		this.#textSprite.resolution = value ?? 5;
	}

	/** @type {} */
	get hasAnimatedMedia() {
		return (
			this.activeAsset instanceof VideoAsset ||
			this.activeAsset instanceof VideoSpritesheetAsset ||
			this.activeAsset instanceof FlipbookAsset
		);
	}
	get playing() {
		return this.#playbackControls?.isPlaying ?? false;
	}
	get duration() {
		return this.#playbackControls?.duration ?? 0;
	}
	get volume() {
		return this.#playbackControls?.volume ?? 0;
	}
	set volume(value) {
		if (!this.#playbackControls) return;
		this.#playbackControls.volume = value;
	}
	get loop() {
		return this.#playbackControls?.loop ?? false;
	}
	set loop(value) {
		if (!this.#playbackControls) return;
		this.#playbackControls.loop = value;
	}
	get currentTime() {
		return this.#playbackControls?.currentTime ?? 0;
	}
	set currentTime(value) {
		if (!this.#playbackControls) return;
		this.#playbackControls.currentTime = value;
	}
	get playbackRate() {
		return this.#playbackControls?.playbackRate ?? 1;
	}
	set playbackRate(value) {
		if (!this.#playbackControls) return;
		this.#playbackControls.playbackRate = value;
	}
	/** @return {PIXI.ColorMatrixFilter | null} */
	get colorMatrixFilter() {
		return this.managedSprite?.colorMatrixFilter ?? null;
	}
	set colorMatrixFilter(value) {
		if (!this.managedSprite) return;
		this.managedSprite.colorMatrixFilter = value;
		if (this.#textSprite) {
			if (value) {
				this.#textSprite.filters?.push(value);
			} else if (this.#textSprite.filters) {
				this.#textSprite.filters = this.#textSprite.filters.filter(
					(filter) => !(filter instanceof PIXI.ColorMatrixFilter)
				);
			}
		}
	}

	async #preloadVariants() {
		if (this.#activeAssetPath === "TEXT") {
			return;
		}
		if (!this.#file || this.#file.isFlipbook) {
			return;
		}
		/** @type {string[]} */
		const allFiles = this.#file.getAllFiles();

		for (const filePath of allFiles) {
			if (this.#relatedAssets[filePath]) {
				continue;
			}
			const asset = await this.#loadAsset(filePath);
			this.#relatedAssets.set(filePath, asset);
		}
	}

	/**
	 * @param {string} filepath
	 */
	async #loadAsset(filepath) {
		if (this.#file && this.#file.isFlipbook) {
			return this.#loadFlipbook(this.#file.getAllFiles(), this.#file.originalMetadata);
		}
		const texture = await SequencerFileCache.loadFile(filepath);
		// disable mipmaps if using compressed textures and no level information is given.
		// for some reason, the integrated basis_universal transcoder does not set this
		// correctly.
		if (
			texture?.baseTexture?.resource instanceof PIXI.CompressedTextureResource &&
			texture?.baseTexture?.resource.levels === 1
		) {
			texture?.baseTexture?.setStyle(0, 0);
		} else if (this.#sharedSpriteConfig.antialiasing && this.#sharedSpriteConfig.antialiasing !== PIXI.SCALE_MODES.LINEAR) {
			texture?.baseTexture.setStyle(0, this.#sharedSpriteConfig.antialiasing);
		}
		if (texture instanceof PIXI.Spritesheet) {
			return new VideoSpritesheetAsset({ filepath, spritesheet: texture });
		}
		if (texture.baseTexture?.resource?.source instanceof HTMLVideoElement) {
			return new VideoAsset({ filepath, texture, video: texture.baseTexture.resource.source });
		}
		return new TextureAsset({ filepath, texture });
	}

	/**
	 * @param {string[]} filepaths
	 * @param {{ fps: number; }} metadata
	 */
	async #loadFlipbook(filepaths, metadata) {
		const textures = (await Promise.all(filepaths.map(async (filepath) => loadTexture(filepath)))).filter(
			(t) => t instanceof PIXI.Texture
		);
		return new FlipbookAsset({ filepaths, textures, framerate: metadata?.fps ?? 24 });
	}

	/**
	 * @param {VideoAsset | VideoSpritesheetAsset | TextureAsset | FlipbookAsset} nextAsset
	 * @returns
	 */
	#activateAsset(nextAsset) {
		let view;
		let controls;
		const tiling = this.#sharedSpriteConfig.tiling;
		const isVisionMaskingEnabled = !this.#sharedSpriteConfig.xray;
		if (nextAsset instanceof VideoAsset) {
			view = new TilingSpriteMesh(nextAsset.texture, { isVisionMaskingEnabled, tiling });
			controls = new VideoPlaybackControls(nextAsset.video, nextAsset.texture);
		} else if (nextAsset instanceof VideoSpritesheetAsset || nextAsset instanceof FlipbookAsset) {
			view = new AnimatedSpriteMesh(nextAsset.frameObjects, {
				autoUpdate: true,
				isVisionMaskingEnabled,
				tiling,
			});
			controls = new SpritePlaybackControls(view, nextAsset.framerate, nextAsset.frameObjects.length);
		} else if (nextAsset instanceof TextureAsset) {
			view = new TilingSpriteMesh(nextAsset.texture, { isVisionMaskingEnabled, tiling });
			controls = null;
		} else {
			return false;
		}

		// apply current values
		this.#applyPreviousValues(view, controls);

		if (this.#playbackControls) {
			this.#playbackControls.destroy();
		} else {
			controls?.play();
		}
		this.#playbackControls = controls;

		if (this.managedSprite) {
			this.managedSprite.removeFromParent();
			this.managedSprite.destroy();
		}
		this.#managedSprite = view;
		this.addChild(view);

		return true;
	}

	/**
	 *
	 * @param {TilingSpriteMesh} view
	 * @param {VideoPlaybackControls | SpritePlaybackControls | null} controls
	 */
	#applyPreviousValues(view, controls) {
		if (this.managedSprite) {
			const prev = this.managedSprite;
			view.tint = prev.tint;
			view.anchor.copyFrom(prev.anchor);
			view.width = prev.width;
			view.height = prev.height;
			view.scale.copyFrom(prev.scale);
			view.tileScale.copyFrom(prev.tileScale);
			view.tilePosition.copyFrom(prev.tilePosition);
			view.pivot.copyFrom(prev.pivot);
			view.skew.copyFrom(prev.skew);
			view.alpha = prev.alpha;
			view.colorMatrixFilter = prev.colorMatrixFilter;
			view.position.copyFrom(prev.position);
			view.alphaMode = prev.alphaMode;
			view.blendMode = prev.blendMode;
			view.cullable = prev.cullable;
			view.renderable = prev.renderable;
			view.visible = prev.visible;
			view.tiling = prev.tiling;
		}

		if (controls && this.#playbackControls) {
			const prev = this.#playbackControls;
			controls.volume = prev.volume;
			controls.loop = prev.loop;
			controls.playbackRate = prev.playbackRate;
			controls.currentTime = prev.currentTime;
			if (prev.isPlaying) {
				controls.play();
			} else {
				controls.stop();
			}
		}
	}
}
//#endregion
