const SequencerFileCache = {

    _videos: {},
    _totalCacheSize: 0,

    async loadVideo(inSrc) {
        let src = this._videos[inSrc];
        if (!src) {
            try {
                src = await fetch(inSrc)
                    .then(r => r.blob())
                    .catch(err => {
                        console.error(err)
                    });

                if (src?.type !== "video/webm") return false;

                while((this._totalCacheSize + src.size) >= 524288000){
                    let [oldSrc, blob] = Object.entries(this._videos)[0];
                    delete this._videos[oldSrc];
                    this._totalCacheSize -= blob.size;
                }

                this._totalCacheSize += src.size;
                this._videos[inSrc] = src;

            } catch (err) {
                return false;
            }
        }
        return src;
    },

    async loadFile(inSrc, preload = false) {

        if (inSrc.toLowerCase().endsWith(".webm")) {

            let blob = await this.loadVideo(inSrc);
            if(!blob) return false;
            if(preload) return true;
            return get_video_texture(blob);

        } else if (AudioHelper.hasAudioExtension(inSrc)) {

            try {
                return await AudioHelper.preloadSound(inSrc);
            } catch (err) {
                console.error(`Failed to load audio: ${inSrc}`)
                return false;
            }

        }

        return await loadTexture(inSrc);

    }

}

async function get_video_texture(inBlob){

    return new Promise(async (resolve) => {

        const video = document.createElement("video");
        video.preload = "auto";
        video.crossOrigin = "anonymous";
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
            baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA;

            const texture = new PIXI.Texture(baseTexture);

            resolve(texture);
        };

        video.onerror = () => {
            reject();
        };

    });

}

export default SequencerFileCache;