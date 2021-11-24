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
                file = await loadTexture(inSrc);
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