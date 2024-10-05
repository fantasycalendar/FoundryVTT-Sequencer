import potpack from "potpack";
export const SPRITE_PADDING = 1;
/**
 * @param {VideoFrame[]} frames
 * @param {VideoFrame[]} alphaFrames
 * @returns {Promise<PackedSpritesheet | undefined>}
 */
export async function packFrames(frames, alphaFrames) {
	const combinedFrames = await Promise.all(frames.map((frame, idx) => combineFrames(frame, alphaFrames[idx], idx)));
	const packedData = combinedFrames.map((data) => ({
		w: data.trimmedRect.w + 2 * SPRITE_PADDING,
		h: data.trimmedRect.h + 2 * SPRITE_PADDING,
		x: undefined,
		y: undefined,
		data,
	}));
	const { w, h } = potpack(packedData);
	// round up to nearest multiple of 4 to support uastc compression later on
	const sprites = new Array(packedData.length);
	const spriteWidth = Math.ceil(w / 4) * 4;
	const spriteHeight = Math.ceil(h / 4) * 4;
	if (spriteWidth > 8192 || spriteHeight > 8192) {
		console.warn("Packed spritesheet is too large", spriteWidth, spriteHeight);
		return undefined;
	}
	const spriteBuffer = new Uint8ClampedArray(spriteHeight * spriteWidth * 4);
	for (const { x, y, data } of packedData) {
		const imageBuffer = data.imageBuffer;
		const alphaBuffer = data.alphaData?.alphaBuffer;
		const alphaPack = data.alphaData?.packSize;
		const hasAlpha = !!alphaBuffer && !!alphaPack;
		const xStart = data.trimmedRect.x;
		const yStart = data.trimmedRect.y;
		const width = data.sourceSize.w;
		for (let row = 0; row < data.trimmedRect.h; row++) {
			for (let col = 0; col < data.trimmedRect.w; col++) {
				const spriteIdx = (x + col + SPRITE_PADDING + (y + row + SPRITE_PADDING) * spriteWidth) * 4;
				const frameIdx = (col + xStart + (row + yStart) * width) * 4;
				let alpha = 1;
				if (hasAlpha === true) {
					const alphaIdx = (col + xStart + (row + yStart) * width) * alphaPack;
					const alphaValue = alphaBuffer[alphaIdx];
					spriteBuffer[spriteIdx + 3] = alphaValue;
					alpha = alphaValue / 255;
				} else {
					spriteBuffer[spriteIdx + 3] = 255;
				}
				// zero color info for completely transparent pixels
				if (alpha === 0) {
					spriteBuffer[spriteIdx] = 0;
					spriteBuffer[spriteIdx + 1] = 0;
					spriteBuffer[spriteIdx + 2] = 0;
				} else {
					spriteBuffer[spriteIdx] = imageBuffer[frameIdx] * alpha;
					spriteBuffer[spriteIdx + 1] = imageBuffer[frameIdx + 1] * alpha;
					spriteBuffer[spriteIdx + 2] = imageBuffer[frameIdx + 2] * alpha;
				}
			}
		}
		sprites[data.idx] = {
			rotated: false,
			trimmed:
				data.trimmedRect.x > 0 ||
				data.trimmedRect.y > 0 ||
				data.trimmedRect.w < data.sourceSize.w ||
				data.trimmedRect.h < data.sourceSize.h,
			sourceSize: data.sourceSize,
			frame: {
				x: x + SPRITE_PADDING,
				y: y + SPRITE_PADDING,
				w: SPRITE_PADDING + data.trimmedRect.w,
				h: SPRITE_PADDING + data.trimmedRect.h,
			},
			spriteSourceSize: data.trimmedRect,
		};
	}
	return {
		w: spriteWidth,
		h: spriteHeight,
		imageBuffer: spriteBuffer,
		sprites,
	};
}
/**
 * @param {VideoFrame} frame
 * @param {VideoFrame | undefined} alphaFrame
 * @param {number} idx
 * @returns {Promise<CombinedFrameData>}
 */
async function combineFrames(frame, alphaFrame, idx) {
	const sourceSize = { w: frame.displayWidth, h: frame.displayHeight };
	const copyOptions = { format: "RGBX" };
	const buffer = new Uint8Array(frame.allocationSize(copyOptions));
	const alphaDataPromise = await (alphaFrame ? getAlphaTrimInfo(alphaFrame) : Promise.resolve(null));
	const [alphaData] = await Promise.all([alphaDataPromise, frame.copyTo(buffer, copyOptions)]);
	frame.close();
	return {
		idx,
		imageBuffer: buffer,
		sourceSize,
		alphaData,
		trimmedRect: alphaData ? alphaData.trimmedRect : { x: 0, y: 0, w: sourceSize.w, h: sourceSize.h },
	};
}
/**
 * @param {VideoFrame} frame
 * @returns {Promise<AlphaFrameData>}
 */
async function getAlphaTrimInfo(frame) {
	const sourceSize = { w: frame.displayWidth, h: frame.displayHeight };
	const alphaBuffer = new Uint8Array(frame.allocationSize());
	const [chromaPlane] = await frame.copyTo(alphaBuffer);
	const alphaThreshold = frame.format?.startsWith("I") ? 1 : 0;
	frame.close();
	let top = null;
	let right = null;
	let left = null;
	let bottom = null;
	const packSize = Math.floor(chromaPlane.stride / sourceSize.w);
	// find top most opaque
	for (let y = 0; y < sourceSize.h; y++) {
		let x = 0;
		while (x < sourceSize.w) {
			const idx = (x + y * sourceSize.w) * packSize;
			if (alphaBuffer[idx] > alphaThreshold) {
				top = y;
				break;
			}
			x++;
		}
		if (top !== null) break;
	}
	if (top == null) {
		return {
			trimmedRect: { x: 0, y: 0, w: 0, h: 0 },
		};
	}
	const topStart = Math.max(top - 1, 0);
	// find right most opaque pixel
	for (let x = sourceSize.w - 1; x >= 0; x--) {
		let y = topStart;
		while (y < sourceSize.h) {
			const idx = (x + y * sourceSize.w) * packSize;
			if (alphaBuffer[idx] > alphaThreshold) {
				right = x;
				break;
			}
			y++;
		}
		if (right !== null) break;
	}
	const rightEnd = Math.min(right + 1, sourceSize.w);
	// find bottom most opaque pixel
	for (let y = sourceSize.h - 1; y >= 0; y--) {
		let x = 0;
		while (x < rightEnd) {
			const idx = (x + y * sourceSize.w) * packSize;
			if (alphaBuffer[idx] > alphaThreshold) {
				bottom = y;
				break;
			}
			x++;
		}
		if (bottom !== null) break;
	}
	// find left most opaque pixel
	const bottomEnd = Math.min(bottom + 1, sourceSize.h);
	for (let x = 0; x < rightEnd; x++) {
		let y = topStart;
		while (y < bottomEnd) {
			const idx = (x + y * sourceSize.w) * packSize;
			if (alphaBuffer[idx] > alphaThreshold) {
				left = x;
				break;
			}
			y++;
		}
		if (left !== null) break;
	}
	const trimmedRect = { x: left, y: top, w: right - left, h: bottom - top };
	return {
		alphaBuffer,
		packSize,
		trimmedRect,
	};
}
/** @typedef {Size & Point} Rect */
/**
 * @typedef {Object} Size
 * @property {number} w
 * @property {number} h
 */
/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */
/**
 * @typedef {Object} AlphaFrameData
 * @property {Uint8Array} [alphaBuffer]
 * @property {Rect} trimmedRect
 * @property {number} [packSize]
 */
/**
 * @typedef {Object} CombinedFrameData
 * @property {number} idx
 * @property {Uint8Array} imageBuffer
 * @property {Size} sourceSize
 * @property {Rect} trimmedRect
 * @property {AlphaFrameData | null} alphaData
 */
/**
 * @typedef {Object} SpriteData
 * @property {Rect} frame
 * @property {boolean} rotated
 * @property {boolean} trimmed
 * @property {Rect} spriteSourceSize
 * @property {Size} sourceSize
 */
/**
 * @typedef {Object} PackedSpritesheet
 * @property {number} w
 * @property {number} h
 * @property {Uint8ClampedArray} imageBuffer
 * @property {SpriteData[]} sprites
 */
