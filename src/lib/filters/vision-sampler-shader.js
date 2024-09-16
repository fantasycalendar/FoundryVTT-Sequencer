const tempMat = new PIXI.Matrix();
const uvPoint = new PIXI.Point();

class VisionSamplerShaderGenerator extends BatchShaderGenerator {
	generateSampleSrc(maxTextures) {
		let src = "\n\n";
		for (let i = 0; i < maxTextures; i++) {
			if (i > 0) {
				src += "\nelse ";
			}
			if (i < maxTextures - 1) {
				src += `if(vTextureId < ${i}.5)`;
			}

			src += "\n{";
			src += `\n\tcolor = texture(uSamplers[${i}], coord, unclamped == coord ? 0.0f : -32.0f);`;
			src += "\n}";
		}

		src += "\n";
		src += "\n";

		return src;
	}
}

export default class VisionSamplerShader extends BaseSamplerShader {
	static classPluginName = "sequencerVisionBatch";
	static batchShaderGeneratorClass = VisionSamplerShaderGenerator;

	static batchGeometry = [
		{ id: "aVertexPosition", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aTextureCoord", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aClampOffset", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aClampFrame", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aTextureCoord", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord1", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord2", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord3", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColor", size: 4, normalized: true, type: PIXI.TYPES.UNSIGNED_BYTE },
		{ id: "aTextureId", size: 1, normalized: false, type: PIXI.TYPES.UNSIGNED_SHORT },
		{ id: "aVisionMaskingEnabled", size: 1, normalized: false, type: PIXI.TYPES.UNSIGNED_BYTE },
		{ id: "aTilingEnabled", size: 1, normalized: false, type: PIXI.TYPES.UNSIGNED_BYTE },
	];

	/** @override */
	static batchVertexSize = 21;

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
    in vec2 aClampOffset;
    in vec4 aClampFrame;
    in vec4 aColor;
    in vec3 aMapCoord1;
    in vec3 aMapCoord2;
    in vec3 aMapCoord3;
    in float aTextureId;
    in float aTilingEnabled;
    in float aVisionMaskingEnabled;
    uniform mat3 projectionMatrix;
    uniform mat3 translationMatrix;
    uniform vec4 tint;
    out vec2 vTextureCoord;
    out vec2 vVisionCoord;
    flat out vec4 vColor;
    flat out vec2 vClampOffset;
    flat out vec4 vClampFrame;
    flat out float vTextureId;
    flat out uint vVisionMaskingEnabled;
    flat out uint vTilingEnabled;
    flat out mat3 vMapCoord;

    void main(void){
      gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
      vClampOffset = aClampOffset;
      vClampFrame = aClampFrame;
      vMapCoord = mat3(aMapCoord1, aMapCoord2, aMapCoord3);
      vVisionMaskingEnabled = uint(aVisionMaskingEnabled);
      vTilingEnabled = uint(aTilingEnabled);
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
    flat in mat3 vMapCoord;
    flat in uint vVisionMaskingEnabled;
    flat in uint vTilingEnabled;
    flat in vec2 vClampOffset;
    flat in vec4 vClampFrame;
    
    in vec2 vVisionCoord;
    uniform bool enableVisionMasking;
    uniform sampler2D visionMaskTexture;
    uniform sampler2D uSamplers[%count%];
    out vec4 fragColor;

    #define texture2D texture

    void main(void){
      vec2 coord = vTextureCoord;
      vec2 unclamped;
      if (bool(vTilingEnabled)) {
        coord = coord + ceil(vClampOffset - coord);
        coord = (vMapCoord * vec3(coord, 1.0)).xy;
        vec2 unclamped = coord;
        coord = clamp(coord, vClampFrame.xy, vClampFrame.zw);
      } else {
        vec2 unclamped = coord;
      }
      float mask = bool(vVisionMaskingEnabled) && enableVisionMasking ? texture2D(visionMaskTexture, vVisionCoord).r : 1.0;
      vec4 color;
      %forloop%
      fragColor = color * mask;
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

	/** @override */
	static _packInterleavedGeometry(element, attributeBuffer, indexBuffer, aIndex, iIndex) {
		const { float32View, uint32View, uint16View, uint8View } = attributeBuffer;

		const mesh = element.object;
		// Write indices into buffer
		const packedVertices = aIndex / this.vertexSize;
		const indices = element.indices;
		for (let i = 0; i < indices.length; i++) {
			indexBuffer[iIndex++] = packedVertices + indices[i];
		}

		// Prepare attributes
		const vertexData = element.vertexData;
		let uvs = element.uvs;
		const alpha = Math.min(element.worldAlpha, 1.0);
		const baseTexture = element._texture.baseTexture;
		const argb = PIXI.Color.shared.setValue(element._tintRGB).toPremultiplied(alpha, baseTexture.alphaMode > 0);
		const textureId = element._texture.baseTexture._batchLocation;
		const mapCoord = mesh.uvMatrix.mapCoord.toArray(true);
		let clampFrame = mesh.uvMatrix.uClampFrame;
		let clampOffset = mesh.uvMatrix.uClampOffset;
		if (mesh.tiling) {
			const tex = element._texture;
			const w = tex.width;
			const h = tex.height;
			const W = mesh.width;
			const H = mesh.height;
			const lt = mesh.tileTransform.localTransform;
			tempMat.set((lt.a * w) / W, (lt.b * w) / H, (lt.c * h) / W, (lt.d * h) / H, lt.tx / W, lt.ty / H);

			const anchorX = mesh.uvRespectAnchor ? mesh.anchor.x : 0;
			const anchorY = mesh.uvRespectAnchor ? mesh.anchor.y : 0;

			uvs[0] = uvs[6] = -anchorX;
			uvs[1] = uvs[3] = -anchorY;
			uvs[2] = uvs[4] = 1.0 - anchorX;
			uvs[5] = uvs[7] = 1.0 - anchorY;
		}

		// Write attributes into buffer
		const vertexSize = this.vertexSize;
		for (let i = 0, j = 0; i < vertexData.length; i += 2, j += vertexSize) {
			uvPoint.set(uvs[i], uvs[i + 1]);
			if (mesh.tiling) {
				tempMat.applyInverse(uvPoint, uvPoint);
			}
			let k = aIndex + j;
			float32View[k++] = vertexData[i];
			float32View[k++] = vertexData[i + 1];
			float32View[k++] = uvPoint.x;
			float32View[k++] = uvPoint.y;
			float32View[k++] = clampOffset[0];
			float32View[k++] = clampOffset[1];
			float32View[k++] = clampFrame[0];
			float32View[k++] = clampFrame[1];
			float32View[k++] = clampFrame[2];
			float32View[k++] = clampFrame[3];
			float32View[k++] = mapCoord[0];
			float32View[k++] = mapCoord[1];
			float32View[k++] = mapCoord[2];
			float32View[k++] = mapCoord[3];
			float32View[k++] = mapCoord[4];
			float32View[k++] = mapCoord[5];
			float32View[k++] = mapCoord[6];
			float32View[k++] = mapCoord[7];
			float32View[k++] = mapCoord[8];
			uint32View[k++] = argb;
			k <<= 1;
			uint16View[k++] = textureId;
			k <<= 1;
			uint8View[k++] = mesh.isVisionMaskingEnabled ? 1 : 0;
			uint8View[k++] = mesh.tiling ? 1 : 0;
		}
	}
}
