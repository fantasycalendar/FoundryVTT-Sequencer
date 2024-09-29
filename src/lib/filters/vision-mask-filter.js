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

const emptyColorMatrix = new Uint8Array(20);

export default class VisionSamplerShader extends BaseSamplerShader {
	static classPluginName = "sequencerVisionBatch";
	static batchShaderGeneratorClass = VisionSamplerShaderGenerator;

	static batchGeometry = [
		{ id: "aVertexPosition", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aTextureCoord", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aClampOffset", size: 2, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aClampFrame", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord1", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord2", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aMapCoord3", size: 3, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColor", size: 4, normalized: true, type: PIXI.TYPES.UNSIGNED_BYTE },
		{ id: "aColorMatrixR", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColorMatrixG", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColorMatrixB", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColorMatrixA", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColorMatrixOffset", size: 4, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aColorMatrixAlpha", size: 1, normalized: false, type: PIXI.TYPES.FLOAT },
		{ id: "aShaderFlags", size: 1, normalized: false, type: PIXI.TYPES.UNSIGNED_SHORT },
		{ id: "aTextureId", size: 1, normalized: false, type: PIXI.TYPES.UNSIGNED_SHORT },
	];

	static #SHADER_FLAGS = foundry.utils.BitMask.generateShaderBitMaskConstants([
		"IS_TILING",
		"IS_VISION_MASKING_ENABLED",
		"IS_COLOR_MATRIX_ENABLED",
	]);

	/** @override */
	static batchVertexSize = 42;

	/** @override */
	static reservedTextureUnits = 1; // We need a texture unit for the occlusion texture

	/**
	 * The batch vertex shader source.
	 * @type {string}
	 */
	static batchVertexShader = /* glsl */ `#version 300 es
	precision highp float;
	
	uniform vec2 screenDimensions;
	uniform mat3 projectionMatrix;
	uniform mat3 translationMatrix;
	uniform vec4 tint;
	
	in vec2 aVertexPosition;
	in vec2 aTextureCoord;
	in vec2 aClampOffset;
	in vec4 aClampFrame;
	in vec3 aMapCoord1;
	in vec3 aMapCoord2;
	in vec3 aMapCoord3;
	in vec4 aColor;
	in vec4 aColorMatrixR;
	in vec4 aColorMatrixG;
	in vec4 aColorMatrixB;
	in vec4 aColorMatrixA;
	in vec4 aColorMatrixOffset;
	in float aColorMatrixAlpha;
	in float aShaderFlags;
	in float aTextureId;
	
	out vec2 vTextureCoord;
	out vec2 vVisionCoord;
	flat out vec2 vClampOffset;
	flat out vec4 vClampFrame;
	flat out mat3 vMapCoord;
	flat out vec4 vColor;
	flat out mat4 vColorMatrix;
	flat out vec4 vColorMatrixOffset;
	flat out float vColorMatrixAlpha;
	flat out uint vShaderFlags;
	flat out float vTextureId;
	
	void main(void) {
		gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0f)).xy, 0.0f, 1.0f);
		vTextureCoord = aTextureCoord;
		vVisionCoord = aVertexPosition / screenDimensions;
		vColor = aColor * tint;
		vClampOffset = aClampOffset;
		vClampFrame = aClampFrame;
		vMapCoord = mat3(aMapCoord1, aMapCoord2, aMapCoord3);
		vColorMatrix = mat4(aColorMatrixR, aColorMatrixG, aColorMatrixB, aColorMatrixA);
		vColorMatrixOffset = aColorMatrixOffset;
		vColorMatrixAlpha = aColorMatrixAlpha;
		vShaderFlags = uint(aShaderFlags);
		vTextureId = aTextureId;
	}
	`;

	/**
	 * The batch fragment shader source.
	 * @type {string}
	 */
	static batchFragmentShader = /* glsl */ `#version 300 es
	precision mediump float;

	in vec2 vTextureCoord;
	in vec2 vVisionCoord;
	flat in float vTextureId;
	flat in vec4 vColor;
	flat in mat3 vMapCoord;
	flat in uint vShaderFlags;
	flat in vec2 vClampOffset;
	flat in vec4 vClampFrame;
	flat in mat4 vColorMatrix;
	flat in vec4 vColorMatrixOffset;
	flat in float vColorMatrixAlpha;

	uniform bool enableVisionMasking;
	uniform sampler2D visionMaskTexture;
	uniform sampler2D uSamplers[%count%];
	out vec4 fragColor;

	${VisionSamplerShader.#SHADER_FLAGS}

	void main(void){
		bool isTilingEnabled = ((vShaderFlags & IS_TILING) == IS_TILING);
		bool isVisionMaskingEnabled = ((vShaderFlags & IS_VISION_MASKING_ENABLED) == IS_VISION_MASKING_ENABLED);
		bool isColorMatrixEnabled = ((vShaderFlags & IS_COLOR_MATRIX_ENABLED) == IS_COLOR_MATRIX_ENABLED);

		vec2 coord = vTextureCoord;
		vec2 unclamped;
		if (isTilingEnabled) {
			coord = coord + ceil(vClampOffset - coord);
			coord = (vMapCoord * vec3(coord, 1.0)).xy;
			unclamped = coord;
			coord = clamp(coord, vClampFrame.xy, vClampFrame.zw);
		} else {
			unclamped = coord;
	  }
	  float mask = isVisionMaskingEnabled && enableVisionMasking ? texture(visionMaskTexture, vVisionCoord).r : 1.0;

	  vec4 color;
	  %forloop%

		if (isColorMatrixEnabled && vColorMatrixAlpha > 0.0) {
			if (color.a > 0.0) {
	      color.rgb /= color.a;
	    }
			vec4 result = color * vColorMatrix + vColorMatrixOffset;

			vec3 rgb = mix(color.rgb, result.rgb, vColorMatrixAlpha);
			rgb *= result.a;
			color = vec4(rgb, result.a);
	  }
	  fragColor = color * mask * vColor;
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
		const { float32View, uint32View, uint16View } = attributeBuffer;

		/** @type {import("../pixi/TilingSpriteMesh").default} */
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
		const colorMatrixArray = mesh.colorMatrixFilter?.matrix ?? emptyColorMatrix;
		const colorMatrixAlpha = mesh.colorMatrixFilter?.alpha ?? 1;
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

			float32View[k++] = colorMatrixArray[0];
			float32View[k++] = colorMatrixArray[1];
			float32View[k++] = colorMatrixArray[2];
			float32View[k++] = colorMatrixArray[3];

			float32View[k++] = colorMatrixArray[5];
			float32View[k++] = colorMatrixArray[6];
			float32View[k++] = colorMatrixArray[7];
			float32View[k++] = colorMatrixArray[8];

			float32View[k++] = colorMatrixArray[10];
			float32View[k++] = colorMatrixArray[11];
			float32View[k++] = colorMatrixArray[12];
			float32View[k++] = colorMatrixArray[13];

			float32View[k++] = colorMatrixArray[15];
			float32View[k++] = colorMatrixArray[16];
			float32View[k++] = colorMatrixArray[17];
			float32View[k++] = colorMatrixArray[18];

			float32View[k++] = colorMatrixArray[4];
			float32View[k++] = colorMatrixArray[9];
			float32View[k++] = colorMatrixArray[14];
			float32View[k++] = colorMatrixArray[19];

			float32View[k++] = colorMatrixAlpha;

			k <<= 1;
			uint16View[k++] = mesh.shaderFlags.valueOf();
			uint16View[k++] = textureId;
		}
	}

	// need to override createPlugin as canvas.performance is not defined in foundry when
	// we need it to be
	static createPlugin() {
		const shaderClass = this;
		const geometryClass = Array.isArray(shaderClass.batchGeometry)
			? class BatchGeometry extends PIXI.Geometry {
				constructor(_static = false) {
					super();
					this._buffer = new PIXI.Buffer(null, _static, false);
					this._indexBuffer = new PIXI.Buffer(null, _static, true);
					for (const { id, size, normalized, type } of shaderClass.batchGeometry) {
						this.addAttribute(id, this._buffer, size, normalized, type);
					}
					this.addIndex(this._indexBuffer);
				}
			} : shaderClass.batchGeometry;
		return class BatchPlugin extends shaderClass.batchRendererClass {

			/** @override */
			static get shaderGeneratorClass() {
				return shaderClass.batchShaderGeneratorClass;
			}

			/* ---------------------------------------- */

			/** @override */
			static get defaultVertexSrc() {
				return shaderClass.batchVertexShader;
			}

			/* ---------------------------------------- */

			/** @override */
			static get defaultFragmentTemplate() {
				return shaderClass.batchFragmentShader;
			}

			/* ---------------------------------------- */

			/** @override */
			static get defaultUniforms() {
				return shaderClass.batchDefaultUniforms;
			}

			/* ---------------------------------------- */

			/**
			 * The batch plugin constructor.
			 * @param {PIXI.Renderer} renderer    The renderer
			 */
			constructor(renderer) {
				super(renderer);
				this.geometryClass = geometryClass;
				this.vertexSize = shaderClass.batchVertexSize;
				this.reservedTextureUnits = shaderClass.reservedTextureUnits;
				this._packInterleavedGeometry = shaderClass._packInterleavedGeometry;
				this._preRenderBatch = shaderClass._preRenderBatch;
			}

			/* ---------------------------------------- */

			/** @inheritdoc */
			setShaderGenerator(options) {
				// if ( !canvas.performance ) return;
				super.setShaderGenerator(options);
			}

			/* ---------------------------------------- */

			/** @inheritdoc */
			contextChange() {
				this.shaderGenerator = null;
				super.contextChange();
			}
		};
	}
}
