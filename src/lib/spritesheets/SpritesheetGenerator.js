/** @import { CompressedSpritesheet, SpritesheetMessageFromWorker } from './decodeWorker' */
import DecodeWorker from "./decodeWorker.js?worker";
const BASIS_TO_PIXI_FORMAT = {
	ASTC: PIXI.INTERNAL_FORMATS.COMPRESSED_RGBA_ASTC_4x4_KHR,
	BC7: PIXI.INTERNAL_FORMATS.COMPRESSED_RGBA_BPTC_UNORM_EXT,
	BC3: PIXI.INTERNAL_FORMATS.COMPRESSED_RGBA_S3TC_DXT5_EXT,
};

export class SpritesheetGenerator {
	/** @type {Record<string, Worker>} */
	#workers = {};
	/** @type {WorkerId[]} */
	#freeWorkers = [];
	/** @type {Map<JobId, (message: SpritesheetMessageFromWorker) => void>} */
	#jobMessageCallbacks = new Map();
	/** @type {WorkerId[]} */
	#workerFreeCallbacks = [];

	/**
	 * @static
	 * @return {SpritesheetGenerator | undefined}
	 */
	static create() {
		if (!window.isSecureContext) {
			console.warn(
				"Cannot initialize Spritesheet Generator. Secure Context Required. Serve Foundry VTT over a https connection to enable Spritesheet Generator"
			);
			return undefined;
		}
		if (VideoDecoder == null || typeof VideoDecoder !== "function") {
			console.warn(
				"Cannot initialize Spritesheet Generator. Required VideoDecoder API is not implemented by your browser. All current version of Firefox, Chrome, Edge and Safari support this API. Please make sure your browser is up to date."
			);
			return undefined;
		}
		return new SpritesheetGenerator();
	}

	constructor() {
		const workerCount = Math.max(Math.floor((navigator.hardwareConcurrency - 2) / 2), 1);
		for (let i = 0; i < workerCount; i++) {
			const workerId = String(i);
			const worker = new DecodeWorker();
			this.#workers[workerId] = worker;
			this.#freeWorkers.push(workerId);
			worker.onmessage = this.#getMessageHandler(workerId);
		}
	}
	/**
	 * @param {string} id
	 * @returns {(message: MessageEvent<SpritesheetMessageFromWorker>) => void}
	 */
	#getMessageHandler(id) {
		return (message) => {
			// remove the handler after message is received. There's only ever one of two
			// messages. Eithere success or error data
			const jobId = message.data.id;
			const callback = this.#jobMessageCallbacks.get(jobId);
			this.#jobMessageCallbacks.delete(jobId);
			callback?.(message.data);
			this.#markWorkerFree(id);
		};
	}
	/**
	 * @param {string} id
	 * @returns {void}
	 */
	#markWorkerFree(id) {
		const firstCallback = this.#workerFreeCallbacks.shift();
		if (firstCallback) {
			firstCallback?.(id);
		} else {
			this.#freeWorkers.push(id);
		}
	}
	/**
	 * @returns {Promise<Worker>}
	 */
	async #getWorker() {
		let workerId = this.#freeWorkers.pop();
		if (!workerId) {
			workerId = await new Promise((resolve) => {
				const workerFreeCallback = (id) => {
					resolve(id);
				};
				this.#workerFreeCallbacks.push(workerFreeCallback);
			});
		}
		this.#freeWorkers = this.#freeWorkers.filter((id) => id !== workerId);
		return this.#workers[workerId];
	}
	/**
	 * @param {string} id
	 * @param {ArrayBuffer} buffer
	 * @param {number} minimumScale
	 * @returns {Promise<SpritesheetMessageFromWorker>}
	 */
	async #postJob(id, buffer, minimumScale) {
		let worker = await this.#getWorker();
		const finishedPromise = new Promise((resolve) => {
			this.#jobMessageCallbacks.set(id, (message) => resolve(message));
		});
		worker.postMessage(
			{ id, type: "CreateSpritesheet", payload: { buffer, minimumScale } },
			{
				transfer: [buffer.buffer ?? buffer],
			}
		);
		return finishedPromise;
	}
	/**
	 * @param {string} url
	 * @param {number} minimumScale
	 * @returns {Promise<PIXI.Spritesheet>}
	 */
	async spritesheetFromUrl(url, minimumScale) {
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();
		return this.spritesheetFromBuffer({ buffer, id: url, minimumScale });
	}
	/**
	 * @param {{ buffer: ArrayBuffer; id: string, minimumScale: number }}
	 * @returns {Promise<PIXI.Spritesheet>}
	 */
	async spritesheetFromBuffer({ buffer, id, minimumScale }) {
		const result = await this.#postJob(id, buffer, minimumScale);
		if (result.type === "Cancel") {
			throw result.payload.message;
		}
		return this.#createSpritesheet({ id, sheet: result.payload.sheet });
	}
	/**
	 * @param {{ id: string; sheet: CompressedSpritesheet }}
	 * @returns {Promise<PIXI.Spritesheet>}
	 */
	async #createSpritesheet({ id, sheet }) {
		const firstLevel = sheet.levelData[0];
		const resource = new PIXI.CompressedTextureResource(null, {
			format: BASIS_TO_PIXI_FORMAT[sheet.format],
			width: firstLevel.width,
			height: firstLevel.height,
			levels: sheet.levelData.length,
			levelBuffers: sheet.levelData.map((level, idx) => ({
				levelID: idx,
				levelWidth: level.width,
				levelHeight: level.height,
				levelBuffer: level.data,
			})),
		});
		const texture = new PIXI.BaseTexture(resource, {
			alphaMode: PIXI.ALPHA_MODES.PREMULTIPLIED_ALPHA,
			mipmap: PIXI.MIPMAP_MODES.ON_MANUAL,
			scaleMode: PIXI.SCALE_MODES.LINEAR,
			width: firstLevel.width,
			height: firstLevel.height,
			wrapMode: PIXI.WRAP_MODES.CLAMP,
			format: PIXI.FORMATS.RGBA,
			type: PIXI.TYPES.UNSIGNED_INT,
			target: PIXI.TARGETS.TEXTURE_2D,
			pixiIdPrefix: id,
		});
		const numberPadding = Math.floor(Math.log10(sheet.sprites.length)) + 1;
		const frames = Object.fromEntries(
			sheet.sprites.map((sprite, idx) => [
				`frame-${String(idx).padStart(numberPadding, "0")}`,
				{
					frame: sprite.frame,
					rotated: sprite.rotated,
					trimmed: sprite.trimmed,
					spriteSourceSize: sprite.spriteSourceSize,
					sourceSize: sprite.sourceSize,
				},
			])
		);
		const spritesheetJson = {
			frames: frames,
			animations: { [id]: sheet.sprites.map((_, idx) => `frame-${String(idx).padStart(numberPadding, "0")}`) },
			meta: {
				app: "https://fantasycomputer.works/FoundryVTT-Sequencer",
				version: `INSERTVERSION`,
				image: id,
				format: sheet.format,
				size: { w: firstLevel.width, h: firstLevel.height },
				scale: "1",
				// @ts-expect-error additional info never hurt nobody
				frameRate: sheet.fps,
			},
		};
		const spritesheet = new PIXI.Spritesheet({
			texture,
			data: spritesheetJson,
			cachePrefix: id,
		});
		await spritesheet.parse();
		return { spritesheet, scale: sheet.scale };
	}
}
/** @typedef {string} JobId */
/** @typedef {string} WorkerId */
