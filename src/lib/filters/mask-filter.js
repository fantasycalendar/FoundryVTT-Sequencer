import FoundryShim from "../../utils/foundry-shim.js";

export default class MaskFilter extends FoundryShim.AbstractBaseFilter {
  /** @override */
  static fragmentShader = `\
        varying vec2 vTextureCoord;

        uniform sampler2D uSampler;
        uniform sampler2D uMaskSampler;

        void main(void) {
            gl_FragColor = texture2D(uSampler, vTextureCoord)
                * texture2D(uMaskSampler, vTextureCoord).a;
        }`;

  /** @override */
  static defaultUniforms = { uMaskSampler: null };

  /** @type {DisplayObject[]|null} */
  masks = [];

  /** @override */
  apply(filterManager, input, output, clearMode, currentState) {
    const maskFilterTexture = filterManager.getFilterTexture();
    const originalFilterTexture = this.#push(
      filterManager,
      currentState,
      maskFilterTexture
    );
    const renderer = filterManager.renderer;

    for (const mask of this.masks) {
      if (mask?.obj?.destroyed) continue;
      const renderable = mask.renderable;
      mask.renderable = true;
      mask.render(renderer);
      mask.renderable = renderable;
    }

    renderer.batch.flush();

    this.#pop(filterManager, currentState, originalFilterTexture);
    this.uniforms.uMaskSampler = maskFilterTexture;
    filterManager.applyFilter(this, input, output, clearMode);
    filterManager.returnFilterTexture(maskFilterTexture);
  }

  #push(filterManager, currentState, maskFilterTexture) {
    const originalFilterTexture = currentState.renderTexture;

    currentState.renderTexture = maskFilterTexture;
    filterManager.defaultFilterStack.push(currentState);
    filterManager.bindAndClear(maskFilterTexture);

    return originalFilterTexture;
  }

  #pop(filterManager, currentState, originalFilterTexture) {
    currentState.renderTexture = originalFilterTexture;
    filterManager.defaultFilterStack.pop();

    if (filterManager.activeState === currentState) {
      return;
    }

    filterManager.activeState = currentState;

    const globalUniforms = filterManager.globalUniforms.uniforms;

    globalUniforms.outputFrame = currentState.sourceFrame;
    globalUniforms.resolution = currentState.resolution;

    const inputSize = globalUniforms.inputSize;
    const inputPixel = globalUniforms.inputPixel;
    const inputClamp = globalUniforms.inputClamp;

    inputSize[0] = currentState.destinationFrame.width;
    inputSize[1] = currentState.destinationFrame.height;
    inputSize[2] = 1.0 / inputSize[0];
    inputSize[3] = 1.0 / inputSize[1];

    inputPixel[0] = Math.round(inputSize[0] * currentState.resolution);
    inputPixel[1] = Math.round(inputSize[1] * currentState.resolution);
    inputPixel[2] = 1.0 / inputPixel[0];
    inputPixel[3] = 1.0 / inputPixel[1];

    inputClamp[0] = 0.5 * inputPixel[2];
    inputClamp[1] = 0.5 * inputPixel[3];
    inputClamp[2] =
      currentState.sourceFrame.width * inputSize[2] - 0.5 * inputPixel[2];
    inputClamp[3] =
      currentState.sourceFrame.height * inputSize[3] - 0.5 * inputPixel[3];

    if (currentState.legacy) {
      const filterArea = globalUniforms.filterArea;

      filterArea[0] = currentState.destinationFrame.width;
      filterArea[1] = currentState.destinationFrame.height;
      filterArea[2] = currentState.sourceFrame.x;
      filterArea[3] = currentState.sourceFrame.y;

      globalUniforms.filterClamp = globalUniforms.inputClamp;
    }

    filterManager.globalUniforms.update();
  }
}
