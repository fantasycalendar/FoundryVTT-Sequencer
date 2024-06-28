import CONSTANTS from "./constants.js";
import { libWrapper } from "./lib/libWrapper/shim.js";

export default function registerLibwrappers() {
  libWrapper.register(CONSTANTS.MODULE_NAME, "PIXI.BaseImageResource.prototype.upload", PIXIUPLOAD);
}

function PIXIUPLOAD(wrapped, ...args) {
  let baseTexture = args[1];

  if (
    baseTexture.sequencer_patched ||
    !game.settings.get(CONSTANTS.MODULE_NAME, "enable-global-fix-pixi")
  ) {
    return wrapped(...args);
  }

  let source = args[3];
  source = source || this.source;
  const isVideo = !!source.videoWidth;
  if (isVideo) {
    baseTexture.alphaMode = PIXI.ALPHA_MODES.PREMULTIPLIED_ALPHA;
    baseTexture.sequencer_patched = true;
  }
  return wrapped(...args);
}
