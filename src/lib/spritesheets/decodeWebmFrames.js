/** @import { Frame } from '../inspector-js/inspectorjs-js' */
/**
 * @param {{
 * 	metadata: WebmMetadata
 * 	frameData: Frame[]
 * 	codec: string
 * }}
 * @returns {Promise<VideoFrame[]>}
 */
export async function decodeWebmFrames({ metadata, frameData, codec, }) {
    if (frameData.length === 0) {
        return [];
    }
    const config = {
        codec: codec === 'VP8' ? 'vp8' : codec === 'VP9' ? 'vp09.00.31.08' : codec,
        codedWidth: metadata.codecSize.width,
        codedHeight: metadata.codecSize.height,
        colorSpace: {},
    };
    if (!VideoDecoder.isConfigSupported(config)) {
        return Promise.reject('Config not supported');
    }
    const renderedFrames = [];
    const decoder = new VideoDecoder({
        output: (frame) => {
            renderedFrames.push(frame);
        },
        error: (error) => {
            decoder.close();
            throw error.message;
        },
    });
    decoder.configure(config);
    for (let i = 0; i < frameData.length; i++) {
        const frame = frameData[i];
        const chunk = new EncodedVideoChunk({
            data: frame.data,
            timestamp: frame.dts,
            type: frame.frameType === 'P' && i > 0 ? 'delta' : 'key',
        });
        decoder.decode(chunk);
    }
    await decoder.flush();
    return renderedFrames;
}
/**
 * @typedef {Object} WebmMetadata
 * @property {Object} codecSize
 * @property {number} codecSize.width
 * @property {number} codecSize.height
 */
