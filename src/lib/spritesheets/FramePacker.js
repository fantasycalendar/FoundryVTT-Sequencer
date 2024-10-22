// @ts-check
import potpack from "potpack";
export const SPRITE_PADDING = 1;

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
	 * @returns {Promise<Uint8Array>}
	 */
	async #getVideoFrameRgbxBuffer(frame) {
		/** @type {VideoFrameCopyToOptions} */
		// @ts-expect-error VideoFrameCopyToOptions is wrongly typed
		const chromaCopyOptions = { format: "RGBX" };
		let imageBuffer = new Uint8Array(frame.allocationSize(chromaCopyOptions));
		const planes = await frame.copyTo(imageBuffer, chromaCopyOptions);
		if (planes.length === 1) {
			return imageBuffer;
		}

		const context2d = this.#getOffscreenContext();
		if (!context2d) {
			throw new Error("Sequencer | Spritesheets | could not create offscreen canvas context, abort");
		}
		context2d.canvas.width = frame.displayWidth;
		context2d.canvas.height = frame.displayHeight;
		context2d.drawImage(frame, 0, 0);
		imageBuffer = new Uint8Array(context2d.getImageData(0, 0, frame.displayWidth, frame.displayHeight).data.buffer);
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

		const packedData = await this.#packScaledFrames(combinedFrames, minimumScale);
		if (!packedData) {
			return;
		}

		const { sheetWidth, sheetHeight, packedFrames, scale } = packedData;

		const sprites = new Array(packedFrames.length);
		const spriteBuffer = new Uint8ClampedArray(sheetHeight * sheetWidth * 4);
		for (const { x, y, trimmedRect, data } of packedFrames) {
			const imageBuffer = data.imageBuffer;
			const xStart = trimmedRect.x;
			const yStart = trimmedRect.y;
			const width = data.sourceSize.w;
			for (let row = 0; row < trimmedRect.h; row++) {
				for (let col = 0; col < trimmedRect.w; col++) {
					const spriteIdx = (x + col + SPRITE_PADDING + (y + row + SPRITE_PADDING) * sheetWidth) * 4;
					const frameIdx = (col + xStart + (row + yStart) * width) * 4;
					spriteBuffer[spriteIdx] = imageBuffer[frameIdx];
					spriteBuffer[spriteIdx + 1] = imageBuffer[frameIdx + 1];
					spriteBuffer[spriteIdx + 2] = imageBuffer[frameIdx + 2];
					spriteBuffer[spriteIdx + 3] = imageBuffer[frameIdx + 3];
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
					w: Math.round(data.sourceSize.w * scale),
					h: Math.round(data.sourceSize.h * scale),
				},
				frame: {
					x: x + SPRITE_PADDING,
					y: y + SPRITE_PADDING,
					w: SPRITE_PADDING + trimmedRect.w,
					h: SPRITE_PADDING + trimmedRect.h,
				},
				spriteSourceSize: trimmedRect,
			};
		}
		return {
			w: sheetWidth,
			h: sheetHeight,
			scale,
			imageBuffer: spriteBuffer,
			sprites,
		};
	}

	/**
	 * @param {CombinedFrameData[]} frameData
	 * @param {number} minimumScale
	 * @return {Promise<PackedFramesContainer | undefined>}
	 */
	async #packScaledFrames(frameData, minimumScale) {
		let scale = 1;

		/**
		 * @param {Uint8Array} buffer
		 * @param {Size} sourceSize
		 * @param {number} scaleFactor
		 * @return {Promise<{buffer: Uint8Array, size: Size}>}
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
			const imageBitmap = await createImageBitmap(imageData, 0, 0, sourceSize.w, sourceSize.h, {
				resizeWidth: scaledWidth,
				resizeHeight: scaledHeight,
				resizeQuality: "high",
			});
			context2d.clearRect(0, 0, scaledWidth, scaledHeight);
			context2d.drawImage(imageBitmap, 0, 0, scaledWidth, scaledHeight);
			imageBitmap.close();
			const scaledBuffer = new Uint8Array(context2d.getImageData(0, 0, scaledWidth, scaledHeight).data.buffer);
			const scaledSize = { w: scaledWidth, h: scaledHeight };
			return { size: scaledSize, buffer: scaledBuffer };
		}

		let spriteWidth, spriteHeight;

		while (scale >= minimumScale) {
			/** @type {PackedFrame[]} */
			const packedData = [];
			for (const data of frameData) {
				const { buffer, size } = await getScaledImageBuffer(data.imageBuffer, data.sourceSize, scale);
				const trimmedRect = this.#getAlphaTrimInfo(buffer, size);
				packedData.push({
					w: trimmedRect.w + 2 * SPRITE_PADDING,
					h: trimmedRect.h + 2 * SPRITE_PADDING,
					// @ts-expect-error temprorary null
					x: undefined,
					// @ts-expect-error temprorary null
					y: undefined,
					trimmedRect,
					data,
				});
			}
			const { w, h } = potpack(packedData);
			// round up to nearest multiple of 4 to support uastc compression later on
			spriteWidth = Math.ceil(w / 4) * 4;
			spriteHeight = Math.ceil(h / 4) * 4;
			if (Math.max(spriteHeight, spriteWidth) > 8192) {
				scale /= 2;
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
		const sourceSize = { w: frame.displayWidth, h: frame.displayHeight };
		const imageBuffer = await this.#getVideoFrameRgbxBuffer(frame);
		frame.close();

		if (alphaFrame) {
			const alphaBuffer = new Uint8Array(alphaFrame.allocationSize());
			const [chromaPlane] = await alphaFrame.copyTo(alphaBuffer);
			const alphaPackSize = Math.floor(chromaPlane.stride / sourceSize.w);
			await alphaFrame.copyTo(alphaBuffer);
			alphaFrame.close();

			// copy alpha info to image buffer
			for (let tex = 0; tex < imageBuffer.length; tex += 4) {
				const alphaIdx = (tex >> 2) * alphaPackSize;
				const alphaValue = alphaBuffer[alphaIdx];
				const alpha = alphaValue / 255;
				// zero color info for completely transparent pixels
				if (alpha === 0) {
					imageBuffer[tex] = 0;
					imageBuffer[tex + 1] = 0;
					imageBuffer[tex + 2] = 0;
				} else {
					// premultiply alpha values
					imageBuffer[tex] = imageBuffer[tex] * alpha;
					imageBuffer[tex + 1] = imageBuffer[tex + 1] * alpha;
					imageBuffer[tex + 2] = imageBuffer[tex + 2] * alpha;
				}
				imageBuffer[tex + 3] = alphaValue;
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
	 * @param {Uint8Array} imageBuffer
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
		// find top most opaque
		for (let y = 0; y < sourceSize.h; y++) {
			let x = 0;
			while (x < sourceSize.w) {
				const idx = (x + y * sourceSize.w) * packSize;
				if (imageBuffer[idx] > alphaThreshold) {
					top = y;
					break;
				}
				x++;
			}
			if (top !== null) break;
		}
		if (top == null) {
			return { x: 0, y: 0, w: 0, h: 0 };
		}
		const topStart = Math.max(top - 1, 0);
		// find right most opaque pixel
		for (let x = sourceSize.w - 1; x >= 0; x--) {
			let y = topStart;
			while (y < sourceSize.h) {
				const idx = (x + y * sourceSize.w) * packSize;
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
				const idx = (x + y * sourceSize.w) * packSize;
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
				const idx = (x + y * sourceSize.w) * packSize;
				if (imageBuffer[idx] > alphaThreshold) {
					left = x;
					break;
				}
				y++;
			}
			if (left !== null) break;
		}
		left ??= 0;
		return { x: left, y: top, w: right - left, h: bottom - top };
	}
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
 * @property {Uint8Array} imageBuffer
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
