import CONSTANTS from "../constants.js";
import SequencerSoundManager from "./sequencer-sound-manager.js";

const SequencerFileCache = {
  _videos: {},
  _preloadedFiles: new Set(),
  _totalCacheSize: 0,
  _validTypes: ["video/webm", "video/x-webm", "application/octet-stream"],
  _spritesheets: new Map(),

  async loadVideo(inSrc) {
    if (!this._videos[inSrc]) {
      const blob = await fetch(inSrc, {
        mode: "cors",
        credentials: "same-origin",
      })
        .then((r) => r.blob())
        .catch((err) => {
          console.error(err);
        });

      if (this._validTypes.indexOf(blob?.type) === -1) return false;

      while (this._totalCacheSize + blob.size > 524288000) {
        const entries = Object.entries(this._videos);

        entries.sort((a, b) => {
          return b[1].lastUsed - a[1].lastUsed;
        });

        const [oldSrc] = entries[0];

        this._preloadedFiles.delete(oldSrc);
        this._totalCacheSize -= this._videos[oldSrc].blob.size;
        delete this._videos[oldSrc];
      }

      this._totalCacheSize += blob.size;
      this._preloadedFiles.add(inSrc);
      this._videos[inSrc] = {
        blob,
        lastUsed: +new Date(),
      };
    }

    this._videos[inSrc].lastUsed = +new Date();
    return this._videos[inSrc].blob;
  },

  srcExists(inSrc) {
    if (this._preloadedFiles.has(inSrc)) {
      return true;
    } 
    return srcExists(inSrc);
  },

  async loadFile(inSrc, preload = false) {
    if (inSrc.toLowerCase().endsWith(".webm")) {
      let blob = await this.loadVideo(inSrc);
      if (!blob) return false;
      this._preloadedFiles.add(inSrc);
      if (preload) return true;
      return get_video_texture(blob);
    } else if (SequencerSoundManager.AudioHelper.hasAudioExtension(inSrc)) {
      try {
        const audio = await SequencerSoundManager.AudioHelper.preloadSound(inSrc);
        if (audio) {
          this._preloadedFiles.add(inSrc);
        }
        return audio;
      } catch (err) {
        console.error(`Failed to load audio: ${inSrc}`);
        return false;
      }
    }

    const texture = await loadTexture(inSrc);
    if (texture) {
      this._preloadedFiles.add(inSrc);
    }
    return texture;
  },

  registerSpritesheet(inSrc, inSpriteSheet) {
    console.log('register', inSrc)
    const existingSheetRef = this._spritesheets.get(inSrc)
    if (existingSheetRef ) {
      existingSheetRef[1] += 1
    } else {
      this._spritesheets.set(inSrc, [inSpriteSheet, 1])
    }
  },
  
  unloadSpritesheet(inSrc) {
    const existingSheetRef = this._spritesheets.get(inSrc)
    if (!existingSheetRef) {
      console.error('trying to unlaod spritesheet that was not loaded:', inSrc)
    }
    existingSheetRef[1] -= 1
    console.log('deregister', inSrc, 'new refscount', existingSheetRef[1])
    if (existingSheetRef[1] > 0) {
      return
    }
    this._spritesheets.delete(inSrc)
    /** @type {PIXI.Spritesheet} */ 
    const sheet = existingSheetRef[0] 
    const relatedPacks = sheet.data?.meta?.related_multi_packs ?? []
    const relatedSheets = sheet.linkedSheets
    const packsSize = Math.max(relatedPacks.length, relatedSheets.length)
    // clean up related sheets starting with the last (leaf)

    const cacheKeys = [get_sheet_image_url(inSrc, sheet), foundry.utils.getRoute(inSrc)]
    console.log('unloading', cacheKeys)
    PIXI.Assets.unload(cacheKeys.filter(src => !!src))
  }
};


/**
 * @param {PIXI.Spritesheet} sheet
 */
function get_sheet_image_url(inSrc, sheet) {
  const imageName = sheet?.data?.meta?.image
  if (!imageName) {
    return
  }
  const srcPrefix = inSrc.split('/').slice(0, -1).join('/')
  const sheetSrc = `${srcPrefix}/${imageName}`
  return foundry.utils.getRoute(sheetSrc)
}
function get_sheet_source_url(inSrc, sheetFilename) {
  const srcPrefix = inSrc.split('/').slice(0, -1).join('/')
  const sheetSrc = `${srcPrefix}/${sheetFilename}`
  return foundry.utils.getRoute(sheetSrc)
};

async function get_video_texture(inBlob) {
  return new Promise(async (resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.controls = true;
    video.autoplay = false;
    video.autoload = true;
    video.muted = true;
    video.src = URL.createObjectURL(inBlob);

    let canplay = true;
    video.oncanplay = async () => {
      if (!canplay) return;
      canplay = false;

      video.height = video.videoHeight;
      video.width = video.videoWidth;

      const baseTexture = PIXI.BaseTexture.from(video, {
        resourceOptions: { autoPlay: false },
      });

      if (game.settings.get(CONSTANTS.MODULE_NAME, "enable-fix-pixi")) {
        baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLIED_ALPHA;
      }

      const texture = new PIXI.Texture(baseTexture);

      resolve(texture);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject();
    };
  });
}

export default SequencerFileCache;
