// @ts-check
/** @import { BASISModule, BasisEncoder } from '../basis-encoder/basis_encoder' */
import BASIS from "../basis-encoder/basis_encoder.mjs";

// this is just a typescript-styel enum / bidrectional mapping of values
export var BASIS_FORMAT;
(function (BASIS_FORMAT) {
	BASIS_FORMAT[(BASIS_FORMAT["BC3"] = 3)] = "BC3";
	BASIS_FORMAT[(BASIS_FORMAT["BC7"] = 6)] = "BC7";
	BASIS_FORMAT[(BASIS_FORMAT["ASTC"] = 10)] = "ASTC";
})(BASIS_FORMAT || (BASIS_FORMAT = {}));

export class SpritesheetCompressor {
	#basis;
	#supportedCodecs;
	/** @type {import("./ktx2FileCache.js").Ktx2FileCache} */
	#ktx2FileCache;

	/**
	 * @static
	 * @param {import("./ktx2FileCache.js").Ktx2FileCache} ktx2FileCache
	 * @returns {Promise<SpritesheetCompressor>}
	 */
	static async create(ktx2FileCache) {
		const basis = await BASIS();
		basis.initializeBasis();
		return new SpritesheetCompressor(basis, ktx2FileCache);
	}
	/**
	 * @private
	 * @param {BASISModule} basis
	 * @param {import("./ktx2FileCache.js").Ktx2FileCache} ktx2FileCache
	 */
	constructor(basis, ktx2FileCache) {
		this.#basis = basis;
		this.#ktx2FileCache = ktx2FileCache;
		const canvas = new OffscreenCanvas(0, 0);
		const gl = canvas.getContext("webgl2");
		this.#supportedCodecs = {
			astc: !!gl?.getExtension("WEBGL_compressed_texture_astc"),
			bc7: !!gl?.getExtension("EXT_texture_compression_bptc"),
			dxt: !!gl?.getExtension("WEBGL_compressed_texture_s3tc"),
		};
	}
	/**
	 * @returns {BasisEncoder}
	 */
	#getConfiguredEncoder() {
		const encoder = new this.#basis.BasisEncoder();
		encoder.setCreateKTX2File(true);
		encoder.setKTX2UASTCSupercompression(true);
		encoder.setKTX2SRGBTransferFunc(true);
		encoder.setPackUASTCFlags(0);
		encoder.setPerceptual(true);
		encoder.setUASTC(true);
		encoder.setCheckForAlpha(true);
		encoder.setMipGen(false);
		encoder.setMipSRGB(true);
		encoder.setDebug(false);
		return encoder;
	}
	/**
	 * @returns {number | undefined}
	 */
	#getTranscoderFormat() {
		if (this.#supportedCodecs.astc) {
			return BASIS_FORMAT.ASTC;
		}
		if (this.#supportedCodecs.bc7) {
			return BASIS_FORMAT.BC7;
		}
		if (this.#supportedCodecs.dxt) {
			return BASIS_FORMAT.BC3;
		}
	}

	/**
	 * @param {ArrayBuffer} imageBuffer
	 * @param {string} sourceHash
	 * @param {number} width
	 * @param {number} height
	 * @param {string} id
	 * @returns {Promise<CompressedTextureData | undefined>}
	 */
	async getCompressedRessourceInfo(imageBuffer, sourceHash, width, height, id) {
		const format = this.#getTranscoderFormat();
		if (!format) {
			return;
		}

		const encoder = this.#getConfiguredEncoder();
		encoder.setSliceSourceImage(0, new Uint8Array(imageBuffer), width, height);
		// todo only initialize if needed!
		let ktx2Buffer = new Uint8Array(width * height * 4);
		const encodedBytes = encoder.encode(ktx2Buffer);
		if (!encodedBytes) {
			return;
		}
		ktx2Buffer = ktx2Buffer.slice(0, encodedBytes);

		await this.#ktx2FileCache.saveKtxFileToCache(id, sourceHash, ktx2Buffer);
		return this.transcodeKtx2Buffer(ktx2Buffer);
	}

	/**
	 *
	 * @param {Uint8Array} ktx2Buffer
	 * @returns {Promise<CompressedTextureData | undefined>}
	 */
	async transcodeKtx2Buffer(ktx2Buffer) {
		const format = this.#getTranscoderFormat();
		if (!format) {
			return;
		}

		const ktx2File = new this.#basis.KTX2File(ktx2Buffer);
		if (!ktx2File.isValid()) {
			console.warn("Encoded KTX2 file not valid.");
			ktx2File.close();
			ktx2File.delete();
			return;
		}
		const levels = ktx2File.getLevels();
		const width = ktx2File.getWidth();
		const height = ktx2File.getHeight();
		if (!width || !height || !levels) {
			console.warn("Encoded KTX2 file has no width, height or levels");
			ktx2File.close();
			ktx2File.delete();
			return;
		}
		if (!ktx2File.startTranscoding()) {
			console.warn("Unable to start transcoding to target texture");
			ktx2File.close();
			ktx2File.delete();
			return;
		}
		const compressedLevels = [];
		for (let lvl = 0; lvl < levels; lvl++) {
			const dstSize = ktx2File.getImageTranscodedSizeInBytes(lvl, 0, 0, format);
			const levelData = new Uint8Array(dstSize);
			if (!ktx2File.transcodeImage(levelData, lvl, 0, 0, format, false, -1, -1)) {
				console.warn("Error transcoding KTX2 file", lvl, format);
				ktx2File.close();
				ktx2File.delete();
				return;
			}
			const levelInfo = ktx2File.getImageLevelInfo(lvl, 0, 0);
			compressedLevels.push({
				level: lvl,
				width: levelInfo.origWidth,
				height: levelInfo.origHeight,
				data: levelData,
			});
		}
		ktx2File.close();
		ktx2File.delete();
		return {
			levelData: compressedLevels,
			format: BASIS_FORMAT[format],
		};
	}
}
/**
 * @typedef {Object} CodecSupport
 * @property {boolean} astc
 * @property {boolean} bc7
 * @property {boolean} dxt
 */
/**
 * @typedef {Object} MipLevelData
 * @property {number} level
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data
 */
/**
 * @typedef {Object} CompressedTextureData
 * @property {MipLevelData[]} levelData
 * @property {keyof typeof BASIS_FORMAT} format
 */
