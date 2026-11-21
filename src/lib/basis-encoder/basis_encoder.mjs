// Compatibility facade for the old embind-style Basis API, backed by the
// minimal UASTC C API (basis_uastc_esm.mjs)
import createBasisUastc from "./basis_uastc_esm.mjs";

const ENCODE_OPTIONS_SRGB_ZSTD = 3; // BU_UASTC_ENCODE_SRGB | BU_UASTC_ENCODE_ZSTD
const BLOCK_BYTES = 16;
const KTX2_DFD_OFFSET = 48;
const KTX2_DFD_CHANNEL_OFFSET = 31;
const KTX2_DF_CHANNEL_UASTC_RGBA = 3;

function makeBasisEncoderClass(M) {
	return class BasisEncoder {
		#image = null;
		#width = 0;
		#height = 0;

		setSliceSourceImage(slice, imageBuffer, width, height) {
			if (slice !== 0) {
				throw new Error("basis_encoder: only slice 0 is supported");
			}
			if (!imageBuffer || width <= 0 || height <= 0) {
				throw new Error("basis_encoder: invalid source image");
			}
			const source = (imageBuffer instanceof Uint8Array || imageBuffer instanceof Uint8ClampedArray)
				? imageBuffer
				: new Uint8Array(imageBuffer);
			this.#image = source.slice();
			this.#width = width | 0;
			this.#height = height | 0;
		}

		encode(fileBuffer) {
			if (!this.#image || !fileBuffer) {
				return 0;
			}

			const w = this.#width;
			const h = this.#height;
			const src = M._malloc(w * h * 4);
			const cap = M._bu_uastc_encode_max_size(w, h);
			const dst = M._malloc(cap);
			if (!src || !dst) {
				M._free(dst);
				M._free(src);
				return 0;
			}

			M.HEAPU8.set(this.#image, src);
			const size = M._bu_uastc_encode_rgba(src, w, h, 0, ENCODE_OPTIONS_SRGB_ZSTD, 0, dst, cap);
			let written = 0;
			if (size && size <= fileBuffer.length) {
				fileBuffer.set(M.HEAPU8.subarray(dst, dst + size));
				written = size;
			}

			M._free(dst);
			M._free(src);
			return written;
		}

		delete() {
			this.#image = null;
			this.#width = 0;
			this.#height = 0;
		}
	};
}

function makeKtx2FileClass(M) {
	return class KTX2File {
		#ptr = 0;
		#handle = 0;
		#width = 0;
		#height = 0;
		#blocks = 0;
		#alphaFlag = 0;

		constructor(fileBuffer) {
			if (!fileBuffer || !fileBuffer.byteLength) {
				return;
			}

			if (fileBuffer.byteLength >= KTX2_DFD_OFFSET + 4) {
				const view = new DataView(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
				const dfdOffset = view.getUint32(KTX2_DFD_OFFSET, true);
				const channelOffset = dfdOffset + KTX2_DFD_CHANNEL_OFFSET;
				if (channelOffset < fileBuffer.byteLength) {
					this.#alphaFlag = (fileBuffer[channelOffset] & 0x0f) === KTX2_DF_CHANNEL_UASTC_RGBA ? 1 : 0;
				}
			}

			const ptr = M._malloc(fileBuffer.byteLength);
			if (!ptr) {
				return;
			}
			M.HEAPU8.set(fileBuffer, ptr);
			const handle = M._bu_uastc_open(ptr, fileBuffer.byteLength);
			if (!handle) {
				M._free(ptr);
				return;
			}

			this.#ptr = ptr;
			this.#handle = handle;
			this.#width = M._bu_uastc_width(handle);
			this.#height = M._bu_uastc_height(handle);
			this.#blocks = M._bu_uastc_blocks(handle);
		}

		isValid() {
			return this.#handle !== 0;
		}

		startTranscoding() {
			return this.#handle !== 0;
		}

		getLevels() {
			return this.#handle ? 1 : 0;
		}

		getWidth() {
			return this.#width;
		}

		getHeight() {
			return this.#height;
		}

		getImageTranscodedSizeInBytes(level, layer, face, format) {
			if (!this.#handle || level !== 0 || layer !== 0 || face !== 0) {
				return 0;
			}
			return this.#blocks * BLOCK_BYTES;
		}

		transcodeImage(destinationBuffer, level, layer, face, format, getAlphaForOpaque, channel0, channel1) {
			if (!this.#handle || !destinationBuffer || level !== 0 || layer !== 0 || face !== 0) {
				return 0;
			}
			const size = this.#blocks * BLOCK_BYTES;
			if (destinationBuffer.length < size) {
				return 0;
			}
			const dst = M._malloc(size);
			if (!dst) {
				return 0;
			}
			const ok = M._bu_uastc_transcode(this.#handle, format, dst, this.#blocks);
			if (ok) {
				destinationBuffer.set(M.HEAPU8.subarray(dst, dst + size));
			}
			M._free(dst);
			return ok ? size : 0;
		}

		getImageLevelInfo(level, layer, face) {
			if (!this.#handle || level !== 0 || layer !== 0 || face !== 0) {
				return null;
			}
			return {
				levelIndex: 0,
				layerIndex: 0,
				faceIndex: 0,
				origWidth: this.#width,
				origHeight: this.#height,
				width: this.#width,
				height: this.#height,
				alphaFlag: this.#alphaFlag,
			};
		}

		close() {
			if (this.#handle) {
				M._bu_uastc_close(this.#handle);
				this.#handle = 0;
			}
			if (this.#ptr) {
				M._free(this.#ptr);
				this.#ptr = 0;
			}
			this.#width = 0;
			this.#height = 0;
			this.#blocks = 0;
		}

		delete() {
			this.close();
		}
	};
}

export async function BASIS(options = {}) {
	/** @type {import("./basis_encoder").BASISModule} */
	const M = await createBasisUastc(options);
	M._bu_uastc_init();
	M.BasisEncoder = makeBasisEncoderClass(M);
	M.KTX2File = makeKtx2FileClass(M);
	return M;
}
