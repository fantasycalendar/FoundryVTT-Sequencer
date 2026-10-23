/** @import { Frame } from '../inspector-js/inspectorjs-js' */
/**
 * @param {{
 * 	metadata: WebmMetadata
 * 	frameData: Frame[]
 * 	codec: string
 * }}
 * @returns {Promise<VideoFrame[]>}
 */
export async function decodeWebmFrames({ metadata, frameData, codec }) {
	if (frameData.length === 0) {
		return [];
	}
	let config = {
	  // Software decoders return planar YUV frames, so the alpha plane can be read unchanged.
	  // Hardware decoders may return converted RGB frames with limited colour and alpha range (16 to 235)
		hardwareAcceleration: "prefer-software",
		codec: codec === "VP8" ? "vp8" : codec === "VP9" ? "vp09.00.31.08" : codec,
		codedWidth: metadata.codecSize.width,
		codedHeight: metadata.codecSize.height,
		colorSpace: {},
	};
	if (!(await VideoDecoder.isConfigSupported(config)).supported) {
		return Promise.reject("Config not supported");
	}
	const renderedFrames = [];
	const decoder = new VideoDecoder({
		output: (frame) => {
			renderedFrames.push(frame);
		},
		error: (error) => {
			throw error.message;
		},
	});
	try {
		decoder.configure(config);
		for (let i = 0; i < frameData.length; i++) {
			const frame = frameData[i];
			const chunk = new EncodedVideoChunk({
				data: frame.data,
				timestamp: frame.dts,
				type: frame.frameType === "P" && i > 0 ? "delta" : "key",
			});
			decoder.decode(chunk);
		}
		await decoder.flush();
		return renderedFrames;
	} catch (err) {
		for (const frame of renderedFrames) frame.close();
		throw err;
	} finally {
		if (decoder.state !== "closed") decoder.close();
	}
}
/**
 * @typedef {Object} WebmMetadata
 * @property {Object} codecSize
 * @property {number} codecSize.width
 * @property {number} codecSize.height
 */
