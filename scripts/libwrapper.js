import { libWrapper } from "./module/lib/libWrapper/shim.js";

export default function registerLibwrappers(){
    libWrapper.register("sequencer", "PIXI.resources.BaseImageResource.prototype.upload", PIXIUPLOAD);
}

function PIXIUPLOAD(wrapped, ...args){
    let baseTexture = args[1];
    if(baseTexture.sequencer_patched) return wrapped(...args);
    let source = args[3];
    source = source || this.source;
    const isVideo = !!source.videoWidth
    if(isVideo) {
        baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA;
        baseTexture.sequencer_patched = true;
    }
    return wrapped(...args);
}