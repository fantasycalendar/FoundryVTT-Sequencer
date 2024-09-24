import VisionSamplerShader from "../filters/vision-mask-filter.js";

/**
 * Extends SpriteMesh to allow for tiling of sprites
 */
export default class TilingSpriteMesh extends SpriteMesh {
	/** @type {PIXI.Transform} */
	tileTransform;

	/** @type {PIXI.TextureMatrix} */
	uvMatrix;

	/** @type {PIXI.ColorMatrixFilter} */
	#colorMatrixFilter;

	shaderFlags = new foundry.utils.BitMask({
		isTiling: false,
		isVisionMaskingEnabled: true,
		isColorMatrixEnabled: false,
	});

	/**
	 * @param {PIXI.Texture} texture - The {@link PIXI.Texture} bound to this mesh
	 * @param {object} [options = {}]
	 * @property {typeof BaseSamplerShader} options.shaderClassader Shader class used by this sprite mesh.
	 * @property {boolean} options.tiling Shader class used by this sprite mesh.
	 * @property {boolean} options.isVisionMaskingEnabled Shader class used by this sprite mesh.
	 */
	constructor(texture, { shaderClass = VisionSamplerShader, tiling = false, isVisionMaskingEnabled = true } = {}) {
		super(texture, shaderClass);
		this.tileTransform = new PIXI.Transform();
		this.tiling = tiling;
		this.isVisionMaskingEnabled = isVisionMaskingEnabled;
		this.uvMatrix = this.texture.uvMatrix || new PIXI.TextureMatrix(texture);
	}

	get tiling() {
		return this.shaderFlags.hasState('isTiling')
	}
	/**
	 * @param {boolean} value
	 */
	set tiling(value) {
		this.shaderFlags.toggleState('isTiling', value)
	}

	
	get isVisionMaskingEnabled() {
		return this.shaderFlags.hasState('isVisionMaskingEnabled')
	}
	/**
	 * @param {boolean} value
	 */
	set isVisionMaskingEnabled(value) {
		this.shaderFlags.toggleState('isVisionMaskingEnabled', value)
	}


	/**
	 * @param {PIXI.ColorMatrixFilter | null} value
	 */
	set colorMatrixFilter(value) {
		this.shaderFlags.toggleState('isColorMatrixEnabled', value != null)
		this.#colorMatrixFilter = value;
	}
	get colorMatrixFilter() {
		return this.#colorMatrixFilter;
	}

	/** The scaling of the image that is being tiled. */
	get tileScale() {
		return this.tileTransform.scale;
	}

	set tileScale(value) {
		this.tileTransform.scale.copyFrom(value);
	}

	/** The offset of the image that is being tiled. */
	get tilePosition() {
		return this.tileTransform.position;
	}

	set tilePosition(value) {
		this.tileTransform.position.copyFrom(value);
	}

	_onTextureUpdate() {
		super._onTextureUpdate();
		if (this.uvMatrix) {
			this.uvMatrix.texture = this._texture;
		}
	}

	/**
	 * Renders the object using the WebGL renderer
	 * @param renderer - The renderer
	 */
	_render(renderer) {
		this.uvMatrix.update();
		this.tileTransform.updateLocalTransform();
		super._render(renderer);
	}

	destroy() {
		super.destroy();
		this.tileTransform = null;
		this.uvMatrix = null;
	}
}