import CONSTANTS from "../constants.js"
import { debug } from "../lib/lib.js"

const SequencerFileCache = {
  _videos: {},
  _preloadedFiles: new Set(),
  _totalCacheSize: 0,
  _validTypes: ["video/webm", "video/x-webm", "application/octet-stream", "binary/octet-stream"],
  /** @type {Map<string, PIXI.Spritesheet>} */
  _spritesheets: new Map(),
  /** @type {Map<string, Promise<{spritesheet: PIXI.Spritesheet, scale: number}> | null>} */
  _generateSpritesheetJobs: new Map(),

  /** @type {Promise<import("../lib/spritesheets/SpritesheetGenerator.js").SpritesheetGenerator> | null} */
  _spritesheetGenerator: null,

  /**
   *
   * @param {string} inSrc
   * @returns {Promise<Blob>} the video blob
   */
  async loadVideo(inSrc) {
    if (!this._videos[inSrc]) {
      const blob = await fetch(inSrc, {
        mode: "cors",
        credentials: "same-origin",
      })
        .then((r) => r.blob())
        .catch((err) => {
          console.error(err)
        })

      if (this._validTypes.indexOf(blob?.type) === -1) return false

      while (this._totalCacheSize + blob.size > 524288000) {
        const entries = Object.entries(this._videos)

        entries.sort((a, b) => {
          return b[1].lastUsed - a[1].lastUsed
        })

        const [oldSrc] = entries[0]

        this._preloadedFiles.delete(oldSrc)
        this._totalCacheSize -= this._videos[oldSrc].blob.size
        delete this._videos[oldSrc]
      }

      this._totalCacheSize += blob.size
      this._preloadedFiles.add(inSrc)
      this._videos[inSrc] = {
        blob,
        lastUsed: +new Date(),
      }
    }

    this._videos[inSrc].lastUsed = +new Date()
    return this._videos[inSrc].blob
  },

  srcExists(inSrc) {
    if (this._preloadedFiles.has(inSrc)) {
      return true
    }
    return foundry.canvas.srcExists(inSrc)
  },

  async loadFile(inSrc, preload = false) {
    if (inSrc.toLowerCase().endsWith(".webm")) {
      let blob = await this.loadVideo(inSrc)
      if (!blob) return false
      this._preloadedFiles.add(inSrc)
      if (preload) return true
      return get_video_texture(blob)
    } else if (foundry.audio.AudioHelper.hasAudioExtension(inSrc)) {
      try {
        const audio = await foundry.audio.AudioHelper.preloadSound(inSrc)
        if (audio) {
          this._preloadedFiles.add(inSrc)
        }
        return audio
      } catch (err) {
        console.error(`Failed to load audio: ${inSrc}`)
        return false
      }
    }

    const texture = await foundry.canvas.loadTexture(inSrc)
    if (texture) {
      this._preloadedFiles.add(inSrc)
    }
    return texture
  },

  /**
   * @param {string} inSrc
   * @param {Object} options
   * @param {number} options.minimumScale
   * @return {Promise<PIXI.Spritesheet | undefined>} the compiled spritesheet or
   * undefined if it cannot be generated
   */
  async requestCompiledSpritesheet(inSrc, { minimumScale }) {
    if (!inSrc.toLowerCase().endsWith(".webm")) {
      return
    }
    if (this._spritesheetGenerator == null) {
      this._spritesheetGenerator = import(
        "../lib/spritesheets/SpritesheetGenerator.js"
      ).then((m) => m.SpritesheetGenerator.create())
    }
    const generator = await this._spritesheetGenerator
    if (!generator) {
      return
    }
    let job = this._generateSpritesheetJobs.get(inSrc)
    if (!job) {
      job = new Promise(async (resolve) => {
        const timeStart = Date.now()

        debug(
          `Spritesheets | generating ${inSrc}. Required scale ${minimumScale}`,
        )
        const blob = await this.loadVideo(inSrc)
        const buffer = await blob.arrayBuffer()
        /** @type {PIXI.Spritesheet | null} */
        let spritesheet = null
        let scale = 1
        try {
          const result = await generator.spritesheetFromBuffer({
            buffer,
            id: inSrc,
            minimumScale,
          })
          spritesheet = result.spritesheet
          scale = result.scale
        } catch (error) {
          console.warn(error)
          resolve(null)
          return
        }
        const w = spritesheet.baseTexture.width
        const h = spritesheet.baseTexture.height
        const megaBytes =
          Math.round(
            spritesheet.baseTexture.resource._levelBuffers.reduce(
              (acc, cur) => acc + cur.levelBuffer.byteLength,
              0,
            ) / 100_000,
          ) / 10
        const time = Math.round((Date.now() - timeStart) / 100) / 10
        debug(
          `Spritesheets | ${inSrc} generated in ${time}s. ${w}x${h} ${megaBytes}mb`,
        )
        resolve({ spritesheet, scale })
      })
      this._generateSpritesheetJobs.set(inSrc, job)
    }

    const result = await job
    if (result && result.scale < minimumScale) {
      debug(
        `Spritesheets | ${inSrc} minimum scale of ${minimumScale} requested but only scale ${result.scale} is available`,
      )
      return undefined
    }
    return result?.spritesheet
  },

  registerSpritesheet(inSrc, inSpriteSheet) {
    const existingSheetRef = this._spritesheets.get(inSrc)
    if (existingSheetRef) {
      existingSheetRef[1] += 1
    } else {
      this._spritesheets.set(inSrc, [inSpriteSheet, 1])
    }
  },

  /**
   *
   * @param {string} inSrc
   * @returns {void}
   */
  async unloadSpritesheet(inSrc) {
    const existingSheetRef = this._spritesheets.get(inSrc)
    if (!existingSheetRef) {
      console.error("trying to unlaod spritesheet that was not loaded:", inSrc)
      return
    }
    existingSheetRef[1] -= 1
    if (existingSheetRef[1] > 0) {
      return
    }
    this._generateSpritesheetJobs.delete(inSrc)
    this._spritesheets.delete(inSrc)
    /** @type {PIXI.Spritesheet} */
    const sheet = existingSheetRef[0]
    const relatedPacks = sheet.data?.meta?.related_multi_packs ?? []
    const relatedSheets = sheet.linkedSheets
    // const packsSize = Math.max(relatedPacks.length, relatedSheets.length)
    // clean up related sheets starting with the last (leaf)

    const cacheKeys = [
      get_sheet_image_url(inSrc, sheet),
      foundry.utils.getRoute(inSrc),
    ]
    await PIXI.Assets.unload(cacheKeys.filter((src) => !!src))
		if (sheet.textures) {
			Object.values(sheet.textures).forEach((t) => t.destroy())
		}
    sheet.baseTexture?.destroy()
  },
}

/**
 * @param {PIXI.Spritesheet} sheet
 */
function get_sheet_image_url(inSrc, sheet) {
  const imageName = sheet?.data?.meta?.image
  if (!imageName) {
    return
  }
  const srcPrefix = inSrc.split("/").slice(0, -1).join("/")
  const sheetSrc = `${srcPrefix}/${imageName}`
  return foundry.utils.getRoute(sheetSrc)
}
function get_sheet_source_url(inSrc, sheetFilename) {
  const srcPrefix = inSrc.split("/").slice(0, -1).join("/")
  const sheetSrc = `${srcPrefix}/${sheetFilename}`
  return foundry.utils.getRoute(sheetSrc)
}

// TODO: video base textures need to be cleaned up...
// We should introduce manual reference counting like with spritesheet textures.
async function get_video_texture(inBlob) {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "auto"
    video.crossOrigin = "anonymous"
    video.controls = true
    video.autoplay = false
    video.autoload = true
    video.muted = true
    video.src = URL.createObjectURL(inBlob)

    let canplay = true
    video.oncanplay = async () => {
      if (!canplay) return
      canplay = false

      video.height = video.videoHeight
      video.width = video.videoWidth

      const baseTexture = PIXI.BaseTexture.from(video, {
        resourceOptions: { autoPlay: false },
      })

      if (game.settings.get(CONSTANTS.MODULE_NAME, "enable-fix-pixi")) {
        baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLIED_ALPHA
      }

      const texture = new PIXI.Texture(baseTexture)

      resolve(texture)
      video.oncanplay = null
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject()
    }
  })
}

export default SequencerFileCache
