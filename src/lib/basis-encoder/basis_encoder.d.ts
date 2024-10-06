export declare class BasisEncoder {
	setCreateKTX2File(value: boolean): void
	setKTX2UASTCSupercompression(value: boolean): void
	setKTX2SRGBTransferFunc(value: boolean): void
	setSliceSourceImage(slice: number, imageBuffer: Uint8Array, width: number, height: number, isPNG: boolean): void
	setUASTC(value: boolean): void
	setPackUASTCFlags(qualityFlags: number): void
	setPerceptual(value: boolean): void
	setCheckForAlpha(value: boolean): void
	setMipGen(value: boolean): void
	setMipSRGB(value: boolean): void
	setMipSmallestDimension(value: number): void
	setDebug(value: boolean): void
	/**
	 * @param fileBuffer Input Buffer. Must be able to hold the complete file data
	 * @returns the number of bytes actually needed for the encoding
	 */
	encode(fileBuffer: Uint8Array): number
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
	}
}

declare function BASIS(): Promise<BASISModule>
export interface BASISModule {
	initializeBasis(): void
	BasisEncoder: typeof BasisEncoder
	KTX2File: typeof KTX2File
}

export default BASIS
