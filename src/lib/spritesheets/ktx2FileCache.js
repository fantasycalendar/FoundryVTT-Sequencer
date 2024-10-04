// @ts-check

const cacheVersion = 1;
const cacheName = `SequencerKTX2Cache-${cacheVersion}`;
/** @type {Promise<Cache | null>} */
let ktx2FileCache;
try {
	ktx2FileCache = caches.open(cacheName);
} catch {
	ktx2FileCache = Promise.resolve(null);
}

// delete old caches if ever needed...
async function deleteOldCaches(currentCache) {
	const keys = await caches.keys();

	for (const key of keys) {
		const isOurCache = key.startsWith("SequencerKTX2Cache-");
		if (currentCache === key || !isOurCache) {
			continue;
		}
		caches.delete(key);
	}
}
deleteOldCaches(cacheName);


export class Ktx2FileCache {
	#getKtxFileCacheRequest(id) {
		return new Request(`${id}?spritesheet`);
	}

	/**
	 * @param {string} id
	 * @returns {Promise<Uint8Array | undefined>}
	 */
	async getCachedKtxFile(id) {
		const cacheStorage = await ktx2FileCache.catch(() => null);
		if (!cacheStorage) {
			return;
		}
		const request = this.#getKtxFileCacheRequest(id);
		const cacheResponse = await cacheStorage.match(request);
		if (!cacheResponse) {
			return;
		}
		return new Uint8Array(await cacheResponse.arrayBuffer());
	}

	/**
	 * @param {string} id
	 * @param {Uint8Array} ktx2FileBuffer
	 * @returns {Promise<void>}
	 */
	async saveKtxFileToCache(id, ktx2FileBuffer) {
		// only cache files < 25MB
		if (ktx2FileBuffer.length > 25 * 1000 * 1000) {
			return
		}
		const cacheStorage = await ktx2FileCache.catch(() => null);
		if (!cacheStorage) {
			return;
		}
		const request = this.#getKtxFileCacheRequest(id);
		const response = new Response(ktx2FileBuffer.buffer);
		await cacheStorage.put(request, response);
	}


	#getSpriteDataCacheRequest(id) {
		return new Request(`${id}?sprites`);
	}
	/**
	 * @param {string} id
	 * @returns {Promise<CachedSpriteData | undefined>}
	 */
	async getCachedSprites(id) {
		const cacheStorage = await ktx2FileCache.catch(() => null);
		if (!cacheStorage) {
			return;
		}
		const request = this.#getSpriteDataCacheRequest(id);
		const cacheResponse = await cacheStorage.match(request);
		if (!cacheResponse) {
			return;
		}
		return await cacheResponse.json();
	}

	/**
	 * @param {string} id
	 * @param {CachedSpriteData} spritesData
	 * @returns {Promise<void>}
	 */
	async saveSpritesToCache(id, spritesData) {
		const cacheStorage = await ktx2FileCache.catch(() => null);
		if (!cacheStorage) {
			return;
		}
		const request = this.#getSpriteDataCacheRequest(id);
		const response = new Response(JSON.stringify(spritesData));
		await cacheStorage.put(request, response);
	}
}

/**
 * @typedef {{sprites: import("./packFrames").SpriteData[], frameRate: number}} CachedSpriteData
 */