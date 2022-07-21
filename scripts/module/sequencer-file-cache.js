import CONSTANTS from "./constants.js";

const SequencerFileCache = {

    _videos: {},
    _preloadedFiles: new Set(),
    _totalCacheSize: 0,

    async loadVideo(inSrc) {

        if (!this._videos[inSrc]) {

            const blob = await fetch(inSrc, {mode: "cors", credentials: "same-origin"})
                .then(r => r.blob())
                .catch(err => {
                    console.error(err)
                });

            if (blob?.type !== "video/webm") return false;

            while((this._totalCacheSize + blob.size) > 524288000){

                const entries = Object.entries(this._videos);

                entries.sort((a, b) => {
                    return b[1].lastUsed - a[1].lastUsed;
                });

                const [ oldSrc ] = entries[0];

                this._preloadedFiles.delete(oldSrc);
                this._totalCacheSize -= this._videos[oldSrc].blob.size;
                delete this._videos[oldSrc];
            }

            this._totalCacheSize += blob.size;
            this._preloadedFiles.add(inSrc);
            this._videos[inSrc] = {
                blob,
                lastUsed: (+new Date())
            };

        }

        this._videos[inSrc].lastUsed = (+new Date());
        return this._videos[inSrc].blob;
    },

    srcExists(inSrc){
        if(this._preloadedFiles.has(inSrc)){
            return true;
        }
        return srcExists(inSrc);
    },

    async loadFile(inSrc, preload = false) {

        if (inSrc.toLowerCase().endsWith(".webm")) {

            let blob = await this.loadVideo(inSrc);
            if(!blob) return false;
            this._preloadedFiles.add(inSrc);
            if(preload) return true;
            return get_video_texture(blob);

        } else if (AudioHelper.hasAudioExtension(inSrc)) {

            try {
                const audio = await AudioHelper.preloadSound(inSrc);
                if(audio){
                    this._preloadedFiles.add(inSrc);
                }
                return audio;
            } catch (err) {
                console.error(`Failed to load audio: ${inSrc}`)
                return false;
            }

        }

        const texture = await loadTexture(inSrc);
        if(texture){
            this._preloadedFiles.add(inSrc);
        }
        return texture;

    }

}

async function get_video_texture(inBlob){

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
            if(!canplay) return;
            canplay = false;

            video.height = video.videoHeight;
            video.width = video.videoWidth;

            const baseTexture = PIXI.BaseTexture.from(video, { resourceOptions: { autoPlay: false } });
            
            if(!game.settings.get(CONSTANTS.MODULE_NAME, "disable-pixi-fix")) {
              baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA;
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