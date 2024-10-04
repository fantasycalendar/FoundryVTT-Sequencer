/** @import { WebMTrack } from '../inspector-js/inspectorjs-js' */
/** @import { SpriteData } from './packFrames' */
/** @import { BASIS_FORMAT, MipLevelData } from './TextureCompressor' */
import { createWebMDemuxer } from "../inspector-js/inspectorjs-js";
import { decodeWebmFrames } from "./decodeWebmFrames";
import { packFrames } from "./packFrames";
import { SpritesheetCompressor } from "./TextureCompressor";
let compressorPromise = SpritesheetCompressor.create();
onmessage = async function (e) {
	if (e.data?.type === "CreateSpritesheet") {
		const result = await decodeWebm(e.data.payload.buffer);
		const id = e.data.id;
		if (result.type === "Cancel") {
			postMessage({ id, ...result });
		} else if (result.type === "SpritesheetCreated") {
			postMessage(
				{ id, ...result },
				{
					transfer: [...result.payload.sheet.levelData.map((l) => l.data.buffer)], // disable transfer for now to test compression
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
 * @returns {Promise<SpritesheetDataFromWorker>}
 */
async function decodeWebm(buffer) {
	const data = new Uint8Array(buffer);
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
		return errorResponse("Video file is too large");
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
	let compressor = await compressorPromise;
	const compressedSheet = compressor.getCompressedRessourceInfo(packedSheet.imageBuffer, packedSheet.w, packedSheet.h);
	if (!compressedSheet) {
		return errorResponse("Could not encode spritesheet to compressed texture");
	}
	return {
		type: "SpritesheetCreated",
		payload: {
			sheet: { ...compressedSheet, fps: metadata.frameRate, sprites: packedSheet.sprites },
		},
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
