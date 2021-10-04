import { libWrapper } from "./module/lib/libWrapper/shim.js";

export default function registerLibwrappers(){
    libWrapper.register("sequencer", "PIXI.resources.BaseImageResource.prototype.upload", PIXIUPLOAD);
}

function PIXIUPLOAD(wrapped, ...args){
    let baseTexture = args[1];
    let source = args[3];
    source = source || this.source;
    const isVideo = !!source.videoWidth
    if(isVideo) {
        baseTexture.alphaMode = (source?.src ?? "").toLowerCase().endsWith('.webm')
            ? PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA
            : baseTexture.alphaMode;
    }
    return wrapped(...args);
}