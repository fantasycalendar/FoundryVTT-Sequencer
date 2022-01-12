const SequencerFileCache = {

    _videos: {},

    async loadVideo(inSrc) {
        let src = this._videos[inSrc];
        if (!src) {
            try {
                src = await fetch(inSrc)
                    .then(r => r.blob());
            } catch (err) {
                return false;
            }
            if (src?.type !== "video/webm") return false;
            this._videos[inSrc] = src;
        }
        return src;
    },

    async loadFile(inSrc) {

        if (inSrc.toLowerCase().endsWith(".webm")) {

            let blob = await this.loadVideo(inSrc);
            if(!blob) return false;
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