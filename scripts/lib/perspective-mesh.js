export default class PerspectiveMesh extends PIXI.Mesh {
	#ratio = 1;
	#textureID = -1;

	constructor(texture = PIXI.Texture.WHITE, ratio = 1) {
		super(new PerspectiveMeshGeometry(), new PerspectiveMeshMaterial());

		this.texture = texture;
		this.ratio = ratio;
	}

	#updateGeometry() {
		const texture = this.texture;

		this.geometry.update(texture.width, texture.height, this.ratio);
		this.#textureID = texture._updateID;
	}

	/** @override */
	get texture() {
		return this.shader.texture;
	}

	/** @override */
	set texture(value) {
		if (this.shader.texture === value) {
			return;
		}

		this.shader.texture = value;
		this.#textureID = -1;

		if (value.baseTexture.valid) {
			this.#updateGeometry();
		} else {
			value.once("update", this.#updateGeometry, this);
		}
	}

	get ratio() {
		return this.#ratio;
	}

	set ratio(value) {
		if (this.#ratio === value) {
			return;
		}

		this.#ratio = value;
		this.#updateGeometry();
	}

	/** @override */
	updateTransform() {
		if (this.#textureID !== this.texture._updateID) {
			this.#updateGeometry();
		}

		super.updateTransform();
	}

	/** @override */
	_render(renderer) {
		if (this.#textureID !== this.texture._updateID) {
			this.#updateGeometry();
		}

		super._render(renderer);
	}

	/** @override */
	destroy(options) {
		this.texture.off("update", this.#updateGeometry, this);

		super.destroy(options);
	}
}

class PerspectiveMeshGeometry extends PIXI.Geometry {
	constructor() {
		super();

		const vertexBuffer = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]));
		const uvsBuffer = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), true);
		const prespectiveBuffer = new PIXI.Buffer(new Float32Array([1, 1, 1, 1]), true);
		const indexBuffer = new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), true, true);

		this.addAttribute("aVertexPosition", vertexBuffer, 2, false, PIXI.TYPES.FLOAT)
			.addAttribute("aTextureCoord", uvsBuffer, 2, false, PIXI.TYPES.FLOAT)
			.addAttribute("aPerspective", prespectiveBuffer, 1, false, PIXI.TYPES.FLOAT)
			.addIndex(indexBuffer);
	}

	update(width, height, ratio = 1) {
		const vertexBuffer = this.buffers[0];

		vertexBuffer.data[0] = (0.5 - 1 / (1 / ratio + 1)) * width;
		vertexBuffer.data[1] = 0;
		vertexBuffer.data[2] = (0.5 + 1 / (1 / ratio + 1)) * width;
		vertexBuffer.data[3] = 0;
		vertexBuffer.data[4] = (0.5 + 1 / (ratio + 1)) * width;
		vertexBuffer.data[5] = height;
		vertexBuffer.data[6] = (0.5 - 1 / (ratio + 1)) * width;
		vertexBuffer.data[7] = height;
		vertexBuffer.update();

		const perspectiveBuffer = this.buffers[2];

		perspectiveBuffer.data[0] = perspectiveBuffer.data[1] = 1;
		perspectiveBuffer.data[2] = perspectiveBuffer.data[3] = ratio;
		perspectiveBuffer.update();
	}
}

class PerspectiveMeshMaterial extends PIXI.MeshMaterial {
	static #vertexSrc = `
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        attribute float aPerspective;

        uniform mat3 projectionMatrix;
        uniform mat3 translationMatrix;
        uniform mat3 uTextureMatrix;

        varying vec2 vTextureCoord;

        void main() {
            vTextureCoord = (uTextureMatrix * vec3(aTextureCoord, 1.0)).xy;
            gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0) * aPerspective;
        }`;

	static #fragmentSrc = `
        varying vec2 vTextureCoord;
        uniform vec4 uColor;

        uniform sampler2D uSampler;

        void main() {
            gl_FragColor = texture2D(uSampler, vTextureCoord) * uColor;
        }`;

	static #program;

	constructor() {
		super(PIXI.Texture.EMPTY, {
			program: PerspectiveMeshMaterial.#program ??= PIXI.Program.from(PerspectiveMeshMaterial.#vertexSrc, PerspectiveMeshMaterial.#fragmentSrc)
		});
	}
}
