// @ts-check
import potpack from "potpack";
export const SPRITE_PADDING = 1;
// compressed textures encode 4x4 pixel blocks
const BLOCK_SIZE = 4;
const alignToBlock = (value) => Math.ceil(value / BLOCK_SIZE) * BLOCK_SIZE;
const YUV_FORMATS = ["I420", "I420A", "I422", "I422A", "I444", "I444A", "NV12"];
const RGB_FORMATS = ["RGBA", "RGBX", "BGRA", "BGRX"];

export class FramePacker {
	/** @type {OffscreenCanvasRenderingContext2D | null} */
	#context2d;

	/**
	 * @returns {OffscreenCanvasRenderingContext2D | null}
	 */
	#getOffscreenContext() {
		if (this.#context2d) {
			return this.#context2d;
		}
		const canvas = new OffscreenCanvas(0, 0);
		this.#context2d = canvas.getContext("2d", { willReadFrequently: true });
		if (this.#context2d) {
			this.#context2d.imageSmoothingQuality = "high";
		}
		return this.#context2d;
	}

	/**
	 *
	 * @param {VideoFrame} frame
	 * @returns {Promise<Uint8ClampedArray>}
	 */
	async #getVideoFrameRgbxBuffer(frame) {
		/** @type {VideoFrameCopyToOptions} */
		const chromaCopyOptions = { format: "RGBX" };
		let imageBuffer = new Uint8ClampedArray(frame.allocationSize(chromaCopyOptions));
		const planes = await frame.copyTo(imageBuffer, chromaCopyOptions);
		const { width, height } = frame.visibleRect;
		if (planes.length === 1 && planes[0].offset === 0 && planes[0].stride === width * 4) {
			return imageBuffer;
		}

		const context2d = this.#getOffscreenContext();
		if (!context2d) {
			throw new Error("Sequencer | Spritesheets | could not create offscreen canvas context, abort");
		}
		context2d.canvas.width = width;
		context2d.canvas.height = height;
		context2d.drawImage(frame, 0, 0, width, height);
		imageBuffer = new Uint8ClampedArray(context2d.getImageData(0, 0, width, height).data.buffer);
		return imageBuffer;
	}

	/**
	 * @param {VideoFrame[]} frames
	 * @param {VideoFrame[]} alphaFrames
	 * @param {number} minimumScale
	 * @returns {Promise<PackedSpritesheet | undefined>}
	 */
	async packFrames(frames, alphaFrames, minimumScale) {
		const combinedFrames = await Promise.all(
			frames.map((frame, idx) => this.#combineFrames(frame, alphaFrames[idx], idx))
		);

		const packedData = await this.scaleAndPackFrames(combinedFrames, minimumScale);
		if (!packedData) {
			return;
		}

		const { sheetWidth, sheetHeight, packedFrames, scale } = packedData;

		const sprites = new Array(packedFrames.length);
		const sheetBuffer = new Uint8ClampedArray(sheetHeight * sheetWidth * 4);
		for (const { x, y, trimmedRect, data } of packedFrames) {
			const imageBuffer = data.imageBuffer;
			const xStart = trimmedRect.x;
			const yStart = trimmedRect.y;
			const width = data.sourceSize.w;
			for (let row = 0; row < trimmedRect.h; row++) {
				for (let col = 0; col < trimmedRect.w; col++) {
					const spriteIdx = (x + col + SPRITE_PADDING + (y + row + SPRITE_PADDING) * sheetWidth) * 4;
					const frameIdx = (col + xStart + (row + yStart) * width) * 4;
					const alphaValue = imageBuffer[frameIdx + 3]
					const alpha = alphaValue / 255
					sheetBuffer[spriteIdx + 0] = imageBuffer[frameIdx + 0] * alpha;
					sheetBuffer[spriteIdx + 1] = imageBuffer[frameIdx + 1] * alpha;
					sheetBuffer[spriteIdx + 2] = imageBuffer[frameIdx + 2] * alpha;
					sheetBuffer[spriteIdx + 3] = alphaValue;
				}
			}
			sprites[data.idx] = {
				rotated: false,
				trimmed:
					trimmedRect.x > 0 ||
					trimmedRect.y > 0 ||
					trimmedRect.w < data.sourceSize.w ||
					trimmedRect.h < data.sourceSize.h,
				sourceSize: {
					w: Math.round(data.sourceSize.w),
					h: Math.round(data.sourceSize.h),
				},
				frame: {
					x: x + SPRITE_PADDING,
					y: y + SPRITE_PADDING,
					w: trimmedRect.w,
					h: trimmedRect.h,
				},
				spriteSourceSize: trimmedRect,
			};
		}
		return {
			w: sheetWidth,
			h: sheetHeight,
			scale,
			imageBuffer: sheetBuffer,
			sprites,
		};
	}

	/**
	 * @param {CombinedFrameData[]} frameData
	 * @param {number} minimumScale
	 * @return {Promise<PackedFramesContainer | undefined>}
	 */
	async scaleAndPackFrames(frameData, minimumScale) {
		let scale = 1;

		/**
		 * @param {Uint8ClampedArray} buffer
		 * @param {Size} sourceSize
		 * @param {number} scaleFactor
		 * @return {Promise<{buffer: Uint8ClampedArray, size: Size}>}
		 */
		const getScaledImageBuffer = async (buffer, sourceSize, scaleFactor) => {
			if (scaleFactor === 1) {
				return { buffer, size: sourceSize };
			}
			const context2d = this.#getOffscreenContext();
			if (!context2d) {
				return { buffer, size: sourceSize };
			}
			const scaledWidth = Math.max(Math.round(sourceSize.w * scaleFactor), 1);
			const scaledHeight = Math.max(Math.round(sourceSize.h * scaleFactor), 1);
			context2d.canvas.width = scaledWidth;
			context2d.canvas.height = scaledHeight;
			const imageData = new ImageData(new Uint8ClampedArray(buffer.buffer), sourceSize.w, sourceSize.h);
			// Resizing ImageData interpolates unpremultiplied colors in some browsers (Chromium), leading to artifacts
			// around alpha-transparent edges
			const sourceContext = new OffscreenCanvas(sourceSize.w, sourceSize.h).getContext("2d");
			if (!sourceContext) {
				return { buffer, size: sourceSize };
			}
			sourceContext.putImageData(imageData, 0, 0);
			const imageBitmap = await createImageBitmap(sourceContext.canvas, 0, 0, sourceSize.w, sourceSize.h, {
				resizeWidth: scaledWidth,
				resizeHeight: scaledHeight,
				resizeQuality: "high",
			});
			context2d.clearRect(0, 0, scaledWidth, scaledHeight);
			context2d.drawImage(imageBitmap, 0, 0);
			imageBitmap.close();
			const scaledBuffer = new Uint8ClampedArray(context2d.getImageData(0, 0, scaledWidth, scaledHeight).data.buffer);
			const scaledSize = { w: scaledWidth, h: scaledHeight };
			return { size: scaledSize, buffer: scaledBuffer };
		};

		let spriteWidth, spriteHeight;

		while (scale >= minimumScale) {
			/** @type {PackedFrame[]} */
			const packedData = [];
			for (const data of frameData) {
				const { buffer, size } = await getScaledImageBuffer(data.imageBuffer, data.sourceSize, scale);
				const trimmedRect = this.#getAlphaTrimInfo(buffer, size);
				packedData.push({
					w: alignToBlock(trimmedRect.w + 2 * SPRITE_PADDING),
					h: alignToBlock(trimmedRect.h + 2 * SPRITE_PADDING),
					// @ts-expect-error temprorary null
					x: undefined,
					// @ts-expect-error temprorary null
					y: undefined,
					trimmedRect,
					data: {
						...data,
						imageBuffer: buffer,
						sourceSize: size,
					},
				});
			}
			const { w, h } = potpack(packedData);
			spriteWidth = alignToBlock(w);
			spriteHeight = alignToBlock(h);
			if (Math.max(spriteHeight, spriteWidth) > 8192) {
				scale -= 0.1;
				continue;
			}

			return {
				scale,
				sheetWidth: spriteWidth,
				sheetHeight: spriteHeight,
				packedFrames: packedData,
			};
		}

		console.warn("Packed spritesheet is too large", spriteWidth, spriteHeight);
		return undefined;
	}

	/**
	 * @param {VideoFrame} frame
	 * @param {VideoFrame | undefined} alphaFrame
	 * @param {number} idx
	 * @returns {Promise<CombinedFrameData>}
	 */
	async #combineFrames(frame, alphaFrame, idx) {
		// copyTo and the canvas fallback both copy the visible rect, which can differ from the display size
		const sourceSize = { w: frame.visibleRect.width, h: frame.visibleRect.height };
		const imageBuffer = await this.#getVideoFrameRgbxBuffer(frame);
		frame.close();

		if (alphaFrame) {
			const alphaBuffer = new Uint8ClampedArray(alphaFrame.allocationSize());
			const [{ offset, stride }] = await alphaFrame.copyTo(alphaBuffer);
			const format = alphaFrame.format;
			const isYuv = YUV_FORMATS.includes(format);
			const isRgb = RGB_FORMATS.includes(format);
			const isExpandedRange = isRgb && !alphaFrame.colorSpace?.fullRange;
			const sizeMatches =
				alphaFrame.visibleRect.width === sourceSize.w && alphaFrame.visibleRect.height === sourceSize.h;
			alphaFrame.close();

			// safeguard against wild browser configs and colour formats
			if (!(isYuv || isRgb) || !sizeMatches) {
				throw new Error(`Sequencer | Spritesheets | unsupported alpha frame ${format}`);
			}

			// copy alpha info to image buffer, using the correct plane for yuv or rgb formats
			const pixelSize = isYuv ? 1 : 4;
			const channel = isYuv ? 0 : 1;
			for (let y = 0; y < sourceSize.h; y++) {
				for (let x = 0; x < sourceSize.w; x++) {
					const alpha = alphaBuffer[offset + y * stride + x * pixelSize + channel];
					imageBuffer[(y * sourceSize.w + x) * 4 + 3] = isExpandedRange ? limitedRangeAlpha(alpha) : alpha;
				}
			}
		}

		return {
			hasAlpha: !!alphaFrame,
			idx,
			imageBuffer,
			sourceSize,
		};
	}
	/**
	 * @param {Uint8ClampedArray} imageBuffer
	 * @param {Size} sourceSize
	 * @returns {Rect}
	 */
	#getAlphaTrimInfo(imageBuffer, sourceSize) {
		let top = null;
		let right = null;
		let left = null;
		let bottom = null;
		const alphaThreshold = 0;
		const packSize = 4; // rgba hardcoded for image buffer
		const alphaOffset = 3; // rgba hardcoded for image buffer
		// find top most opaque
		for (let y = 0; y < sourceSize.h; y++) {
			let x = 0;
			while (x < sourceSize.w) {
				const idx = (x + y * sourceSize.w) * packSize + alphaOffset;
				if (imageBuffer[idx] > alphaThreshold) {
					top = y;
					break;
				}
				x++;
			}
			if (top !== null) break;
		}
		if (top == null) {
			// fully transparent, keep one (transparent) pixel so the frame texture stays valid
			return { x: 0, y: 0, w: 1, h: 1 };
		}
		const topStart = Math.max(top - 1, 0);
		// find right most opaque pixel
		for (let x = sourceSize.w - 1; x >= 0; x--) {
			let y = topStart;
			while (y < sourceSize.h) {
				const idx = (x + y * sourceSize.w) * packSize + alphaOffset;
				if (imageBuffer[idx] > alphaThreshold) {
					right = x;
					break;
				}
				y++;
			}
			if (right !== null) break;
		}
		right ??= sourceSize.w - 1;
		const rightEnd = Math.min(right + 1, sourceSize.w);
		// find bottom most opaque pixel
		for (let y = sourceSize.h - 1; y >= 0; y--) {
			let x = 0;
			while (x < rightEnd) {
				const idx = (x + y * sourceSize.w) * packSize + alphaOffset;
				if (imageBuffer[idx] > alphaThreshold) {
					bottom = y;
					break;
				}
				x++;
			}
			if (bottom !== null) break;
		}
		// find left most opaque pixel
		bottom ??= sourceSize.h - 1;
		const bottomEnd = Math.min(bottom + 1, sourceSize.h);
		for (let x = 0; x < rightEnd; x++) {
			let y = topStart;
			while (y < bottomEnd) {
				const idx = (x + y * sourceSize.w) * packSize + alphaOffset;
				if (imageBuffer[idx] > alphaThreshold) {
					left = x;
					break;
				}
				y++;
			}
			if (left !== null) break;
		}
		left ??= 0;
		return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
	}
}

/**
 * Recovers an alpha value from that was expanded from limited range.
 * @param {number} value
 * @returns {number}
 */
function limitedRangeAlpha(value) {
	if (value === 0 || value === 255) {
		return value;
	}
	return (value * 219) / 255 + 16;
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
 * @typedef {Object} CombinedFrameData
 * @property {number} idx
 * @property {Uint8ClampedArray} imageBuffer
 * @property {Size} sourceSize
 * @property {boolean} hasAlpha
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
 *
 * @typedef {Size & { x: number, y: number, trimmedRect: Rect, data: CombinedFrameData }} PackedFrame
 */
/**
 * @typedef {Object} PackedFramesContainer
 * @property {number} sheetWidth
 * @property {number} sheetHeight
 * @property {number} scale
 * @property {PackedFrame[]} packedFrames
 */
/**
 * @typedef {Object} PackedSpritesheet
 * @property {number} w
 * @property {number} h
 * @property {number} scale
 * @property {Uint8ClampedArray} imageBuffer
 * @property {SpriteData[]} sprites
 */
