// @ts-check
/** @import { WebMTrack } from '../inspector-js/inspectorjs-js' */
/** @import { SpriteData } from './packFrames' */
/** @import { BASIS_FORMAT, MipLevelData } from './TextureCompressor' */
import { Compress } from "@typhonjs-fvtt/runtime/data/compress";
import { createWebMDemuxer } from "../inspector-js/inspectorjs-js";
import { decodeWebmFrames } from "./decodeWebmFrames";
import { Ktx2FileCache } from "./ktx2Filecache";
import { packFrames } from "./packFrames";
import { SpritesheetCompressor } from "./TextureCompressor";
import { getUint8ArrayHash } from "./hasher";

let ktx2FileCache = new Ktx2FileCache();
let compressorPromise = SpritesheetCompressor.create(ktx2FileCache);
onmessage = async function (e) {
	if (e.data?.type === "CreateSpritesheet") {
		const result = await decodeWebm(e.data.payload.buffer, e.data.id);
		const id = e.data.id;
		if (result.type === "Cancel") {
			postMessage({ id, ...result });
		} else if (result.type === "SpritesheetCreated") {
			postMessage(
				{ id, ...result },
				{
					transfer: [...result.payload.sheet.levelData.map((l) => l.data.buffer)],
				}
			);
		}
	}
};
/**
 * @param {string} message
 * @returns {SpritesheetDataFromWorker}
 */
function errorResponse(message) {
	return { type: "Cancel", payload: { message } };
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} id
 * @returns {Promise<SpritesheetDataFromWorker>}
 */
async function decodeWebm(buffer, id) {
	/** @type {import("./TextureCompressor").CompressedTextureData | undefined} */
	let compressedSheet;
	const data = new Uint8Array(buffer);
	const sourceHash = getUint8ArrayHash(data)
	const ktx2Buffer = await ktx2FileCache.getCachedKtxFile(id, sourceHash);
	let compressor = await compressorPromise;

	let spritesheetData = await ktx2FileCache.getCachedSprites(id, sourceHash);
	
	/** @type {CompressedSpritesheet} */
	let sheet

	if (ktx2Buffer && spritesheetData) {
		compressedSheet = await compressor.transcodeKtx2Buffer(ktx2Buffer);
		if (!compressedSheet) {
			return errorResponse("Could not encode spritesheet to compressed texture");
		}
		sheet = { ...compressedSheet, fps: spritesheetData.frameRate, sprites: spritesheetData.sprites };
	} else {
		const demuxer = createWebMDemuxer();
		demuxer.append(data);
		demuxer.end();
		const tracks = Object.values(demuxer.tracks);
		const hasAudio = tracks.some((t) => t.type === 1);
		if (hasAudio) {
			return errorResponse("File has Audio Tracks");
		}
		const videoTrack = tracks.find((t) => t.type === 0);
		if (!videoTrack) {
			return errorResponse("File has no Video Tracks");
		}
		const metadata = videoTrack.getMetadata();
		if (metadata.codecSize.width >= 1000 && metadata.codecSize.height >= 1000 && videoTrack.frames.length > 80) {
			const w = metadata.codecSize.width
			const h = metadata.codecSize.height
			const frameCount = videoTrack.frames.length
			return errorResponse(`Video file is too large for ${id}: ${frameCount} * ${w}x${h}px`);
		}
		const codec = videoTrack.getCodec();
		let frames, alphaFrames;
		try {
			[frames, alphaFrames] = await Promise.all([
				decodeWebmFrames({ metadata, codec, frameData: videoTrack.frames }),
				decodeWebmFrames({ metadata, codec, frameData: videoTrack.framesAlpha }),
			]);
		} catch (error) {
			if (error instanceof Error) {
				return errorResponse(error.message);
			}
			return errorResponse("Error decoding video");
		}
		if (frames.length !== alphaFrames.length && videoTrack.framesAlpha.length !== 0) {
			return errorResponse("alpha frame count mismatch");
		}
		const packedSheet = await packFrames(frames, alphaFrames);
		if (!packedSheet) {
			return errorResponse("Could not pack spritesheet");
		}

		ktx2FileCache.saveSpritesToCache(id, sourceHash, { sprites: packedSheet.sprites, frameRate: metadata.frameRate });
		spritesheetData = { sprites: packedSheet.sprites, frameRate: metadata.frameRate };

		compressedSheet = await compressor.getCompressedRessourceInfo(
			packedSheet.imageBuffer,
			sourceHash,
			packedSheet.w,
			packedSheet.h,
			id
		);

		if (!compressedSheet) {
			return errorResponse("Could not encode spritesheet to compressed texture");
		}
		sheet = { ...compressedSheet, fps: spritesheetData.frameRate, sprites: spritesheetData.sprites };
	}

	return {
		type: "SpritesheetCreated",
		payload: { sheet },
	};
}

/**
 * @typedef {Object} SpritesheetMessageBase
 * @property {string} id
 */
/**
 * @typedef {| { type: 'Cancel'; payload: { message: string } }
 * 	| { type: 'SpritesheetCreated'; payload: { sheet: CompressedSpritesheet } }} SpritesheetDataFromWorker
 */
/** @typedef {SpritesheetMessageBase & SpritesheetDataFromWorker} SpritesheetMessageFromWorker */
/**
 * @typedef {Object} SpritesheetDataToWorker
 * @property {'CreateSpritesheet'} type
 * @property {Object} payload
 * @property {ArrayBuffer} payload.buffer
 */
/** @typedef {SpritesheetMessageBase & SpritesheetDataToWorker} SpritesheetMessageToWorker */
/**
 * @typedef {Object} CompressedSpritesheet
 * @property {keyof typeof BASIS_FORMAT} format
 * @property {MipLevelData[]} levelData
 * @property {number} fps
 * @property {SpriteData[]} sprites
 */
