import SequencerFileCache from "../modules/sequencer-file-cache.js";
import AnimatedSpriteMesh from "../lib/pixi/AnimatedSpriteMesh.js";
import TilingSpriteMesh from "../lib/pixi/TilingSpriteMesh.js";
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
	filepath;
	texture;
	video;
	constructor({ filepath, texture, video }) {
		super();
		this.filepath = filepath;
		this.texture = texture;
		this.video = video;
	}
	destroy() {
		try {
			this.video.removeAttribute("src");
			this.video.pause();
			this.video.load();
			this.video = null;
		} catch (err) {}
		this.texture.destroy();
	}
}
class VideoSpritesheetAsset extends Asset {
	filepath;
	spritesheet;
	frameObjects;
	framerate;
	constructor({ filepath, spritesheet }) {
		super();
		this.filepath = filepath;
		this.spritesheet = spritesheet;
		this.framerate = this.spritesheet.data?.meta?.framerate ?? 30;
		const frametime = (1 / this.framerate) * 1000;
		this.frameObjects = (Object.values(spritesheet.animations)[0] ?? []).map((texture) => ({
			texture,
			time: frametime,
		}));
		this.#register();
	}
	destroy() {
		SequencerFileCache.unloadSpritesheet(this.filepath);
	}
	#register() {
		SequencerFileCache.registerSpritesheet(this.filepath, this.spritesheet);
	}
}
class FlipbookAsset extends Asset {
	filepaths;
	frameObjects;
	framerate;
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
class TextAsset extends Asset {
	text;
	constructor({ text }) {
		super();
		this.text = text;
	}
	// really nothing to do here
	destroy() {}
}
//#endregion
//#region Managed Sprites
class ManagedSprite {
	/** @type {Asset} */
	asset;
	get texture() {
		return this.view.texture;
	}
	get renderable() {
		return this.view.renderable;
	}
	set renderable(value) {
		this.view.renderable = value;
	}
	constructor(asset) {
		this.asset = asset;
	}
	get isVideo() {
		return this.asset instanceof VideoAsset;
	}
	get isSpritesheet() {
		return this.asset instanceof VideoSpritesheetAsset || this.asset instanceof FlipbookAsset;
	}
	updateTexture() {
		if (this.view.texture.valid) {
			this.view.texture.update();
		}
	}
	destroy() {
		this.view.destroy();
		this.view = null;
		this.asset.destroy();
		this.asset = null;
	}
	deactivate() {
		this.view.renderable = false;
	}
	activate() {
		this.view.renderable = true;
	}
}
class ManagedTextSprite extends ManagedSprite {
	view;
	constructor({ asset, textStyle }) {
		super(asset);
		this.view = new PIXI.Text(asset.text, textStyle);
		this.view.resolution = 5;
		this.view.zIndex = 1;
		this.view.anchor.set(0.5, 0.5);
	}
	get resolution() {
		return this.view.resolution;
	}
	set resolution(value) {
		this.view.resolution = value;
	}
}
class ManagedTextureSprite extends ManagedSprite {
	view;
	constructor({ asset, tiling = false, xray = false }) {
		super(asset);
		this.view = new TilingSpriteMesh(asset.texture, { isVisionMaskingEnabled: !xray, tiling });
	}
}
class ManagedAnimatedSprite extends ManagedSprite {
	view;
	controls;
	// make sure we always return the same texture...
	get texture() {
		if (this.asset instanceof VideoSpritesheetAsset || this.asset instanceof FlipbookAsset) {
			return this.asset.frameObjects[0]?.texture ?? PIXI.Texture.EMPTY;
		}
		return super.texture;
	}
	constructor({ asset, tiling = false, xray = false }) {
		super(asset);
		if (asset instanceof VideoAsset) {
			this.view = new TilingSpriteMesh(asset.texture, { isVisionMaskingEnabled: !xray, tiling });
			this.controls = new VideoPlaybackControls(asset.video, asset.texture);
		} else {
			this.view = new AnimatedSpriteMesh(asset.frameObjects, {
				autoUpdate: true,
				isVisionMaskingEnabled: !xray,
				tiling,
			});
			this.controls = new SpritePlaybackControls(this.view, asset.framerate, asset.frameObjects.length);
		}
	}
	destroy() {
		this.stop();
		super.destroy();
	}
	activate() {
		super.activate();
	}
	deactivate() {
		super.deactivate();
		this.stop();
	}
	async play() {
		this.controls.play();
	}
	stop() {
		this.controls.stop();
	}
	get loop() {
		return this.controls.loop;
	}
	set loop(value) {
		this.controls.loop = value;
	}
	get volume() {
		return this.controls.volume;
	}
	set volume(value) {
		this.controls.volume = value;
	}
	get duration() {
		return this.controls.duration;
	}
	get isPlaying() {
		return this.controls.isPlaying;
	}
	get currentTime() {
		return this.controls.currentTime;
	}
	set currentTime(value) {
		this.controls.currentTime = value;
	}
	get playbackRate() {
		return this.controls.playbackRate;
	}
	set playbackRate(value) {
		this.controls.playbackRate = value;
	}
}
//#endregion
//#region Playback controls
class PlaybackControls {}
class VideoPlaybackControls extends PlaybackControls {
	#video;
	#texture;
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
}
class SpritePlaybackControls extends PlaybackControls {
	#sprite;
	#framerate;
	#framecount;
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
	set volume(_value) {
		// cannot set volume
	}
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
}
export class SequencerSpriteManager extends PIXI.Container {
	#id = foundry.utils.randomID();
	#file;
	#sharedSpriteConfig;
	#activePath;
	#managedSprites = {};
	#preloadingPromise;
	get preloadingPromise() {
		if (this.#preloadingPromise) {
			return this.#preloadingPromise;
		}
		return Promise.resolve();
	}
	constructor(file, options) {
		super();
		this.#sharedSpriteConfig = options ?? {
			antialiasing: PIXI.SCALE_MODES.LINEAR,
			tiling: false,
			shader: undefined,
		};
		this.#file = file;
	}
	//#region public api
	get activePath() {
		return this.#activePath;
	}
	get texture() {
		if (this.#activePath) {
			return this.#managedSprites[this.#activePath]?.texture;
		}
		return Object.values(this.#managedSprites).find((s) => s?.renderable)?.texture;
	}
	updateVideoTextures() {
		// CHECKME lets see if this works without update texture.
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite && sprite.isVideo && sprite.renderable) {
				sprite.updateTexture();
			}
		});
	}
	async activate(filePath) {
		if (!filePath) {
			this.#managedSprites[filePath]?.deactivate();
			return undefined;
		}
		if (this.#activePath === filePath) {
			return this.#managedSprites[filePath];
		}
		// deactivate currently playing animation
		const lastSprite = this.#managedSprites[this.#activePath];
		let nextSprite = this.#managedSprites[filePath];
		// new file is already being loaded, nothing more to do
		if (filePath in this.#managedSprites && nextSprite == null) {
			return;
		}
		if (!nextSprite) {
			this.#managedSprites[filePath] = undefined;
			const asset = await this.#loadAsset(filePath);
			nextSprite = this.#buildSprite(asset);
			this.#managedSprites[filePath] = nextSprite;
			this.addChild(nextSprite.view);
		}
		// apply current values
		this.#applyCommonSpriteValues(nextSprite, lastSprite);
		lastSprite?.deactivate();
		// activate new animation
		nextSprite.activate();
		// sync playback time for more seamless transition
		if (nextSprite instanceof ManagedAnimatedSprite) {
			if (lastSprite instanceof ManagedAnimatedSprite) {
				nextSprite.currentTime = lastSprite.currentTime;
			}
			nextSprite.play();
			// CHECKME lets see if this works without update texture.
			// nextSprite.updateTexture();
		}
		this.#activePath = filePath;
		return nextSprite;
	}
	addText(textData) {
		const textKey = this.#buildTextKey(textData.text);
		if (this.#managedSprites[textKey]) {
			return this.#managedSprites[textKey];
		}
		const textAsset = new TextAsset({ text: textData.text ?? "" });
		const newSprite = new ManagedTextSprite({ asset: textAsset, textStyle: textData.textStyle });
		this.#applyCommonSpriteValues(newSprite);
		this.addChild(newSprite.view);
		this.#managedSprites[textKey] = newSprite;
		return newSprite;
	}
	removeText(text) {
		const textKey = this.#buildTextKey(text);
		this.#managedSprites[textKey]?.destroy();
		delete this.#managedSprites[textKey];
	}
	removeSprite(filepath) {
		this.#managedSprites[filepath]?.destroy();
		delete this.#managedSprites[filepath];
	}
	async preloadVariants() {
		if (!this.#preloadingPromise) {
			return (this.#preloadingPromise = this.#preloadVariants());
		}
		return this.#preloadingPromise;
	}
	destroy() {
		Object.values(this.#managedSprites).forEach((sprite) => sprite?.destroy());
		super.destroy({ children: true });
	}
	//#endregion
	//#region Managed Sprite proxies
	async play() {
		if (!(this.#activeSprite instanceof ManagedAnimatedSprite)) {
			return;
		}
		this.#activeSprite.play();
		// this.#spriteData.playing = true;
	}
	stop() {
		if (!(this.#activeSprite instanceof ManagedAnimatedSprite)) {
			return;
		}
		this.#activeSprite.stop();
		// this.#spriteData.playing = false;
	}
	get tileScale() {
		return this.#activeSprite?.view instanceof TilingSpriteMesh ? this.#activeSprite?.view.tileScale : undefined;
	}
	set tileScale(point) {
		if (this.#activeSprite?.view instanceof TilingSpriteMesh) {
			this.#activeSprite.view.tileScale.copyFrom(point);
		}
	}
	get tilePosition() {
		return this.#activeSprite?.view instanceof TilingSpriteMesh ? this.#activeSprite?.view.tilePosition : undefined;
	}
	set tilePosition(point) {
		if (this.#activeSprite?.view instanceof TilingSpriteMesh) {
			this.#activeSprite.view.tilePosition.copyFrom(point);
		}
	}
	get anchor() {
		return this.#activeSprite?.view.anchor;
	}
	set anchor(point) {
		this.#activeSprite?.view.anchor.copyFrom(point);
	}
	get tint() {
		return this.#activeSprite?.view.tint ?? 0xffffff;
	}
	set tint(value) {
		if (this.#activeSprite?.view) {
			this.#activeSprite.view.tint = typeof value === "number" ? Math.floor(value) : value;
		}
	}
	get scale() {
		return this.#activeSprite?.view.scale || super.scale;
	}
	set scale(point) {
		this.#activeSprite?.view.scale.copyFrom(point);
	}
	get width() {
		return (
			this.#activeSprite?.view.width ??
			Object.values(this.#managedSprites).find((sprite) => sprite?.renderable)?.view.width ??
			0
		);
	}
	set width(value) {
		if (!this.#activeSprite) {
			return;
		}
		this.#activeSprite.view.width = value;
	}
	get height() {
		return (
			this.#activeSprite?.view.height ??
			Object.values(this.#managedSprites).find((sprite) => sprite?.renderable)?.view.height ??
			0
		);
	}
	set height(value) {
		if (!this.#activeSprite) {
			return;
		}
		this.#activeSprite.view.height = value;
	}
	get resolution() {
		if (this.#activeSprite instanceof ManagedTextSprite) {
			return this.#activeSprite.resolution;
		}
		return undefined;
	}
	set resolution(value) {
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite instanceof ManagedTextSprite) {
				sprite.resolution = value;
			}
		});
	}
	get hasAnimatedMedia() {
		return this.#activeSprite instanceof ManagedAnimatedSprite;
	}
	get playing() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.isPlaying;
		}
		return false;
	}
	get duration() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.duration;
		}
		return 0;
	}
	get volume() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.volume;
		}
		return 0;
	}
	set volume(value) {
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite instanceof ManagedAnimatedSprite) {
				sprite.volume = value;
			}
		});
	}
	get loop() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.loop;
		}
		return false;
	}
	set loop(value) {
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite instanceof ManagedAnimatedSprite) {
				sprite.loop = value;
			}
		});
	}
	get currentTime() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.currentTime;
		} else {
			return undefined;
		}
	}
	set currentTime(value) {
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite instanceof ManagedAnimatedSprite) {
				sprite.currentTime = value;
			}
		});
	}
	get playbackRate() {
		if (this.#activeSprite instanceof ManagedAnimatedSprite) {
			return this.#activeSprite.playbackRate;
		}
		return 1;
	}
	set playbackRate(value) {
		Object.values(this.#managedSprites).forEach((sprite) => {
			if (sprite instanceof ManagedAnimatedSprite) {
				sprite.playbackRate = value;
			}
		});
	}
	//#endregion
	//#region private
	get #activeSprite() {
		return this.#managedSprites[this.#activePath];
	}
	async #preloadVariants() {
		if (this.#activePath === "TEXT" /* SpecialSpriteKeys.Text */) {
			return;
		}
		if (!this.#file || this.#file.isFlipbook) {
			return;
		}
		const allFiles = this.#file.getAllFiles();
		const sprites = await Promise.all(
			allFiles.map(async (filePath) => {
				if (this.#managedSprites[filePath]) {
					return this.#managedSprites[filePath];
				}
				const asset = await this.#loadAsset(filePath);
				const newSprite = this.#buildSprite(asset);
				newSprite.renderable = false;
				return newSprite;
			})
		);
		sprites.forEach((sprite) => this.addChild(sprite.view));
	}
	async #loadAsset(filepath) {
		if (this.#file && this.#file.isFlipbook) {
			return this.#loadFlipbook(this.#file.getAllFiles());
		}
		const texture = await SequencerFileCache.loadFile(filepath);
		const mipmapDisablingFormats = ["BASISU_ETC1S"];
		// disable mipmaps if using compressed textures
		if (mipmapDisablingFormats.includes(texture?.data?.meta?.format)) {
			texture?.baseTexture?.setStyle(0, 0);
		} else if (this.#sharedSpriteConfig.antialiasing !== PIXI.SCALE_MODES.LINEAR) {
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
	async #loadFlipbook(filepaths) {
		const textures = await Promise.all(filepaths.map(async (filepath) => loadTexture(filepath)));
		return new FlipbookAsset({ filepaths, textures, framerate: 24 });
	}
	#buildSprite(asset) {
		if (asset instanceof TextAsset) {
			return new ManagedTextSprite({ asset });
		}
		if (asset instanceof TextureAsset) {
			return new ManagedTextureSprite({ asset, tiling: this.#sharedSpriteConfig.tiling });
		}
		if (asset instanceof VideoAsset || asset instanceof VideoSpritesheetAsset || asset instanceof FlipbookAsset) {
			return new ManagedAnimatedSprite({ asset: asset, tiling: this.#sharedSpriteConfig.tiling });
		}
		throw "unrecognized asset";
	}
	#applyCommonSpriteValues(sprite, previousSprite) {
		if (sprite instanceof ManagedTextSprite) {
			this.#applyTextSpriteValues(sprite);
			return;
		}
		if (!previousSprite) {
			return;
		}
		const view = sprite.view;
		view.tint = previousSprite.view.tint;
		view.anchor.copyFrom(previousSprite.view.anchor);
		view.width = previousSprite.view.width;
		view.height = previousSprite.view.height;
		if (view instanceof PIXI.TilingSprite && previousSprite.view instanceof PIXI.TilingSprite) {
			view.tileScale.copyFrom(previousSprite.view.tileScale);
			view.tilePosition.copyFrom(previousSprite.view.tilePosition);
		}
		if (sprite instanceof ManagedAnimatedSprite && previousSprite instanceof ManagedAnimatedSprite) {
			sprite.volume = previousSprite.volume;
			sprite.loop = previousSprite.loop;
			sprite.playbackRate = previousSprite.playbackRate;
		}
	}
	#applyTextSpriteValues(sprite) {
		const otherTextSprite = Object.values(this.#managedSprites).find(
			(s) => s !== sprite && s instanceof ManagedTextSprite
		);
		if (!otherTextSprite || !(otherTextSprite instanceof ManagedTextSprite)) {
			return;
		}
		const view = sprite.view;
		view.anchor = otherTextSprite.view.anchor;
		view.resolution = otherTextSprite.view.resolution;
	}
	#buildTextKey(text) {
		return `${this.#id}-${text}`;
	}
}
//#endregion
