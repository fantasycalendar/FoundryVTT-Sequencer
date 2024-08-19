export default class VisionSamplerShader extends BaseSamplerShader {
	// /** @override */
	static classPluginName = "sequencerVisionBatch";

	/** @override */
	static reservedTextureUnits = 1; // We need a texture unit for the occlusion texture

	/**
	 * The batch vertex shader source.
	 * @type {string}
	 */
	static batchVertexShader = `
    #version 300 es
    precision ${PIXI.settings.PRECISION_VERTEX} float;

    uniform vec2 screenDimensions;

    in vec2 aVertexPosition;
    in vec2 aTextureCoord;
    in vec4 aColor;
    in float aTextureId;
    uniform mat3 projectionMatrix;
    uniform mat3 translationMatrix;
    uniform vec4 tint;
    out vec2 vTextureCoord;
    out vec2 vVisionCoord;
    flat out vec4 vColor;
    flat out float vTextureId;

    void main(void){
      gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
      vTextureId = aTextureId;
      vColor = aColor * tint;
      vVisionCoord = aVertexPosition / screenDimensions;
    }
  `;

	/**
	 * The batch fragment shader source.
	 * @type {string}
	 */
	static batchFragmentShader = `
    #version 300 es
    precision ${PIXI.settings.PRECISION_FRAGMENT} float;
    in vec2 vTextureCoord;
    flat in vec4 vColor;
    flat in float vTextureId;
    in vec2 vVisionCoord;
    uniform bool enableVisionMasking;
    uniform sampler2D visionMaskTexture;
    uniform sampler2D uSamplers[%count%];
    out vec4 fragColor;

    #define texture2D texture

    void main(void){
      float mask = enableVisionMasking ? texture2D(visionMaskTexture, vVisionCoord).r : 1.0;
      vec4 color;
      %forloop%
      fragColor = color * vColor * mask;
    }
  `;

	/** @override */
	static batchDefaultUniforms(maxTex) {
		return {
			screenDimensions: [1, 1],
			visionMaskTexture: maxTex,
		};
	}

	/** @override */
	static _preRenderBatch(batchRenderer) {
		const uniforms = batchRenderer._shader.uniforms;
		uniforms.screenDimensions = canvas.screenDimensions;
		uniforms.enableVisionMasking = canvas?.visibility?.visible ?? canvas?.effects?.visibility?.visible ?? true;
		batchRenderer.renderer.texture.bind(canvas.masks.vision.renderTexture, uniforms.visionMaskTexture);
	}
}
