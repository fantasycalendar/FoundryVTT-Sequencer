import { libWrapper } from "./module/lib/libWrapper/shim.js";
import CONSTANTS from "./module/constants.js";

export default function registerLibwrappers(){
  
  libWrapper.register(CONSTANTS.MODULE_NAME, "PIXI.resources.BaseImageResource.prototype.upload", PIXIUPLOAD);
}

function PIXIUPLOAD(wrapped, ...args){
    let baseTexture = args[1];
    
    if(baseTexture.sequencer_patched || game.settings.get(CONSTANTS.MODULE_NAME, "disable-pixi-fix")) return wrapped(...args);
    
    let source = args[3];
    source = source || this.source;
    const isVideo = !!source.videoWidth
    if(isVideo) {
        baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA;
        baseTexture.sequencer_patched = true;
    }
    return wrapped(...args);
}