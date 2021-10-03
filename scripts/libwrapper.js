import { libWrapper } from "./module/lib/libWrapper/shim.js";

function patch(){
    if(this.texture && (this.texture?.baseTexture?.resource?.source?.src ?? "").toLowerCase().endsWith('.webm')) {
        this.texture.baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLY_ALPHA;
    }
}

export default function registerLibwrappers(){

    libWrapper.register(
        "sequencer",
        "CONFIG.Tile.objectClass.prototype.refresh",
        async function patchedRollHitDie(wrapped,...args){
            patch.bind(this)();
            return wrapped(...args);
        }
    );

    libWrapper.register(
        "sequencer",
        "CONFIG.Token.objectClass.prototype.refresh",
        async function patchedRollHitDie(wrapped,...args){
            patch.bind(this)();
            return wrapped(...args);
        }
    );

}