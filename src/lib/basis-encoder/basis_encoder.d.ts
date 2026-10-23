export declare class BasisEncoder {
	/**
	 * Only slice 0 is supported
	 */
	setSliceSourceImage(slice: number, imageBuffer: Uint8Array, width: number, height: number): void
	/**
	 * Encodes to KTX2 (UASTC LDR, Zstd, sRGB, no mips). Writes into
	 * fileBuffer and returns the number of bytes, or 0 if it does not fit.
	 */
	encode(fileBuffer: Uint8Array): number
	delete(): void
}

export declare class KTX2File {
	constructor(fileBuffer: Uint8Array)
	isValid(): boolean
	close(): void
	delete(): void
	startTranscoding(): boolean
	getLevels(): number
	getWidth(): number
	getHeight(): number
	getImageTranscodedSizeInBytes(level: number, layer: number, face: number, format: number): number
	transcodeImage(
		destinationBuffer: Uint8Array,
		level: number,
		layer: number,
		face: number,
		format: number,
		getAlphaForOpaque: boolean,
		channel0: number,
		channel1: number
	): number
	getImageLevelInfo(
		level: number,
		layer: number,
		face: number
	): {
		levelIndex: number
		layerIndex: number
		faceIndex: number
		origWidth: number
		origHeight: number
		width: number
		height: number
		alphaFlag: number
	} | null
}

export interface BASISModule {
	BasisEncoder: typeof BasisEncoder
	KTX2File: typeof KTX2File
}

declare function BASIS(options?: { locateFile?: (path: string) => string }): Promise<BASISModule>
export { BASIS }
