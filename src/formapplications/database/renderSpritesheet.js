import SequencerFileCache from "../../modules/sequencer-file-cache";

const viewSize = 320;
let animatedSprite;
let offscreenApp;
let canvas;
let offscreenCanvas;
let oldImageSrcs = new Map();

function initOffscreenApp(databaseStore) {
	if (offscreenApp) {
		return;
	}
	canvas = document.createElement("canvas");
	canvas.style.display = "none";
	offscreenCanvas = canvas.transferControlToOffscreen();
	const backgroundColor = 
	offscreenApp = new PIXI.Application({ autoStart: false, view: offscreenCanvas, backgroundColor: 0x999999, sharedTicker: false });
	offscreenApp.ticker.stop();
	// worker thread would be nice, but then we would need the webworker version of pixi.js too...
	document.body.appendChild(canvas);
	// workaround to fix errors when destroying the offscreen app
	offscreenCanvas.style = {}
	offscreenCanvas.width = viewSize;
	offscreenCanvas.height = viewSize;
}

export async function playSpritesheet(file, databaseStore) {
	initOffscreenApp(databaseStore);
	const sheet = await SequencerFileCache.loadFile(file);
	if (!sheet) {
		return;
	}
	SequencerFileCache.registerSpritesheet(file, sheet);
	const frames = Object.values(sheet.animations)?.[0];
	if (!frames) {
		return;
	}
	const framerate = sheet.data?.meta?.framerate ?? 30;
	const frametime = (1 / framerate) * 1000;
	databaseStore.metadata.set({
		type: "Spritesheet",
		duration: Math.round(frametime * frames.length) + "ms",
	});
	if (!animatedSprite) {
		animatedSprite = new PIXI.AnimatedSprite(frames, true);
		animatedSprite.anchor.set(0.5);
		animatedSprite.x = viewSize / 2;
		animatedSprite.y = viewSize / 2;
		offscreenApp.stage.addChild(animatedSprite);
	}
	let queuedFrame;
	let renderedFrame;
	animatedSprite.onFrameChange = async (frame) => {
		// rendering operation is async. If we're currently still rendering
		// the previous frame, don't even try to render the current one
		if (queuedFrame !== renderedFrame) {
			return;
		}
		let curerntImageSrc = oldImageSrcs.get(frame);
		if (!curerntImageSrc) {
			queuedFrame = frame;
			offscreenApp.render()
			const imageBlob = await offscreenCanvas.convertToBlob();
			curerntImageSrc = URL.createObjectURL(imageBlob);
			oldImageSrcs.set(frame, curerntImageSrc);
			renderedFrame = frame;
		}
		databaseStore.elements.image.src = curerntImageSrc;
	};
	animatedSprite.textures = frames;
	animatedSprite.scale.set(viewSize / Math.max(frames[0].width, frames[0].height));
	animatedSprite.file = file;
	animatedSprite.play();
}

export async function cleanupSpritesheet(destroy = false) {
	if (!animatedSprite) {
		return;
	}
	animatedSprite.stop();
	animatedSprite.onFrameChange = null;
	if (animatedSprite.file) {
		await SequencerFileCache.unloadSpritesheet(animatedSprite.file);
		animatedSprite.file = null;
	}

	oldImageSrcs.values().forEach((objectUrl) => {
		URL.revokeObjectURL(objectUrl);
	});
	oldImageSrcs.clear();
	if (destroy) {
		animatedSprite.destroy();
		animatedSprite = null;
		offscreenApp.destroy();
		canvas.remove()
		offscreenCanvas = null;
		offscreenApp = undefined;
	}
}
