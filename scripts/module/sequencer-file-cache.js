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

    _loader: false,

    get loader() {
        if (!this._loader) {
            this._loader = new TextureLoader();
        }
        return this._loader;
    },

    async loadImage(inSrc) {
        let src = await this.loader.getCache(inSrc);

        if (!src) {
            try {
                src = await this._loader.loadTexture(inSrc);
            } catch (err) {
                return false;
            }
        }

        return src;
    },

    async loadFile(inSrc) {
        return new Promise(async (resolve, reject) => {
            let file;
            if (inSrc.toLowerCase().endsWith(".webm")) {
                file = await this.loadVideo(inSrc);
            } else if (AudioHelper.hasAudioExtension(inSrc)) {
                try {
                    file = await AudioHelper.preloadSound(inSrc);
                } catch (err) {
                    console.error(`Failed to load audio: ${inSrc}`)
                }
            } else {
                file = await this.loadImage(inSrc);
            }
            if (file) {
                resolve(file);
            } else {
                reject();
            }
        })
    }

}

export default SequencerFileCache;