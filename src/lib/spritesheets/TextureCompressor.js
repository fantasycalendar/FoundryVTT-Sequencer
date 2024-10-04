/** @import { BASISModule, BasisEncoder } from '../basis-encoder/basis_encoder' */
import BASIS from '../basis-encoder/basis_encoder';
export var BASIS_FORMAT;
(function (BASIS_FORMAT) {
    BASIS_FORMAT[BASIS_FORMAT["BC3"] = 3] = "BC3";
    BASIS_FORMAT[BASIS_FORMAT["BC7"] = 6] = "BC7";
    BASIS_FORMAT[BASIS_FORMAT["ASTC"] = 10] = "ASTC";
})(BASIS_FORMAT || (BASIS_FORMAT = {}));
export class SpritesheetCompressor {
    #basis;
    #supportedCodecs;
    /**
     * @static
     * @returns {Promise<SpritesheetCompressor>}
     */
    static async create() {
        const basis = await BASIS();
        basis.initializeBasis();
        return new SpritesheetCompressor(basis);
    }
    /**
     * @private
     * @param {BASISModule} basis
     */
    constructor(basis) {
        this.#basis = basis;
        const canvas = new OffscreenCanvas(0, 0);
        const gl = canvas.getContext('webgl2');
        this.#supportedCodecs = {
            astc: !!gl.getExtension('WEBGL_compressed_texture_astc'),
            bc7: !!gl.getExtension('EXT_texture_compression_bptc'),
            dxt: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
        };
    }
    /**
     * @returns {BasisEncoder}
     */
    #getConfiguredEncoder() {
        const encoder = new this.#basis.BasisEncoder();
        encoder.setCreateKTX2File(true);
        encoder.setKTX2UASTCSupercompression(false);
        encoder.setKTX2SRGBTransferFunc(true);
        encoder.setPackUASTCFlags(0);
        encoder.setPerceptual(true);
        encoder.setUASTC(true);
        encoder.setCheckForAlpha(true);
        encoder.setMipGen(true);
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
            return BASIS_FORMAT.ASTC;
        }
        if (this.#supportedCodecs.dxt) {
            return BASIS_FORMAT.BC3;
        }
    }
    /**
     * @param {ArrayBuffer} imageBuffer
     * @param {number} width
     * @param {number} height
     * @returns {CompressedTextureData | undefined}
     */
    getCompressedRessourceInfo(imageBuffer, width, height) {
        const format = this.#getTranscoderFormat();
        if (!format) {
            return;
        }
        const encoder = this.#getConfiguredEncoder();
        encoder.setSliceSourceImage(0, new Uint8Array(imageBuffer), width, height, false);
        let ktx2Buffer = new Uint8Array(width * height * 4);
        const encodedBytes = encoder.encode(ktx2Buffer);
        if (!encodedBytes) {
            return;
        }
        ktx2Buffer = new Uint8Array(ktx2Buffer, 0, encodedBytes);
        const ktx2File = new this.#basis.KTX2File(ktx2Buffer);
        if (!ktx2File.isValid()) {
            console.warn('Encoded KTX2 file not valid.');
            ktx2File.close();
            ktx2File.delete();
            return;
        }
        const levels = ktx2File.getLevels();
        width = ktx2File.getWidth();
        height = ktx2File.getHeight();
        if (!width || !height || !levels) {
            console.warn('Encoded KTX2 file has no width, height or levels');
            ktx2File.close();
            ktx2File.delete();
            return;
        }
        if (!ktx2File.startTranscoding()) {
            console.warn('Unable to start transcoding to target texture');
            ktx2File.close();
            ktx2File.delete();
            return;
        }
        const compressedLevels = [];
        for (let lvl = 0; lvl < levels; lvl++) {
            const dstSize = ktx2File.getImageTranscodedSizeInBytes(lvl, 0, 0, format);
            const levelData = new Uint8Array(dstSize);
            if (!ktx2File.transcodeImage(levelData, lvl, 0, 0, format, false, -1, -1)) {
                console.warn('Error transcoding KTX2 file', lvl, format);
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
