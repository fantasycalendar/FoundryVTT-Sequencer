export default class VisionSamplerShader extends BaseSamplerShader {
  /** @override */
  static classPluginName = null;

  /** @inheritdoc */
  static vertexShader = `
      precision ${PIXI.settings.PRECISION_VERTEX} float;
      attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      uniform mat3 projectionMatrix;
      uniform vec2 screenDimensions;
      varying vec2 vUvsMask;
      varying vec2 vUvs;
      void main() {
        vUvs = aTextureCoord;
        vUvsMask = aVertexPosition / screenDimensions;
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      }
    `;

  /** @inheritdoc */
  static fragmentShader = `
      precision ${PIXI.settings.PRECISION_FRAGMENT} float;
      varying vec2 vUvs;
      varying vec2 vUvsMask;
      uniform vec4 tintAlpha;
      uniform sampler2D sampler;
      uniform sampler2D maskSampler;
      uniform bool enableVisionMasking;
      void main() {
        float mask = enableVisionMasking ? texture2D(maskSampler, vUvsMask).r : 1.0;
        gl_FragColor = texture2D(sampler, vUvs) * tintAlpha * mask;
      }
    `;

  /** @inheritdoc */
  static defaultUniforms = {
    tintAlpha: [1, 1, 1, 1],
    sampler: 0,
    maskSampler: 0,
    screenDimensions: [1, 1],
    enableVisionMasking: false,
  };

  /** @override */
  _preRender(mesh) {
    super._preRender(mesh);
    this.uniforms.maskSampler = canvas.masks.vision.renderTexture;
    this.uniforms.screenDimensions = canvas.screenDimensions;
    this.uniforms.enableVisionMasking = canvas?.visible ?? canvas.visibility.visible;
  }
}
