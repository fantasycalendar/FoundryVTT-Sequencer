import CrosshairsDocument from "./CrosshairsDocument.js";
import CrosshairsPlaceable from "./CrosshairsPlaceable.js";

export default class TokenCrosshairsDocument extends CrosshairsDocument {
	/**
	 * @inheritdoc
	 */
	constructor(tokenPlaceable, context = {}, crosshair = {}, callbacks = {}) {

		const tokenDoc = tokenPlaceable.document

		const { distance, size } = context.parent.grid;
		const rayBounds = new Ray(
			{ x: 0, y: 0 },
			{ x: tokenDoc.width * distance, y: tokenDoc.height * distance });

		const initial = {
			t: 'rect',
			'icon.display': false,
			direction: Math.toDegrees(rayBounds.angle),
			distance: rayBounds.distance,
		};

		const defaultCrosshair = foundry.utils.mergeObject(TokenCrosshairsDocument.defaultConfig, {
				distanceMinMax: {
					min: rayBounds.distance,
					max: rayBounds.distance,
				},
				location: {
					offset: {
						x: (tokenDoc.width * size) / -2,
						y: (tokenDoc.height * size) / -2
					}
				},
				token: tokenPlaceable
			}
		)

		super(initial, context, foundry.utils.mergeObject(defaultCrosshair, crosshair), callbacks);
	}

	static get defaultConfig() {
		return foundry.utils.mergeObject(super.defaultConfig, {
			gridHighlight: false,
			snap: {
				position: CONST.GRID_SNAPPING_MODES.VERTEX
			},
			label: {
				display: false,
			},
			lockDrag: true,
			alpha: 0.5
		});
	}

	static get placeableClass() {
		return TokenCrosshair;
	}
}

class TokenCrosshair extends CrosshairsPlaceable {

	#clonedToken = false
	#tokenRotation = 0;

	/**
	 * @override
	 */
	_refreshTemplate() {
		this.template.clear();
		this.#clonedToken.document.x = this.x;
		this.#clonedToken.document.y = this.y;
		this.#clonedToken.document.rotation = this.#tokenRotation;
		this.#clonedToken.document.alpha = this.crosshair.alpha;
		this.#clonedToken.renderFlags.set({ refreshPosition: true, refreshRotation: true, refreshMesh: true });
		this.#clonedToken.initializeSources();
	}

	/**
	 * @override
	 */
	async draw() {
		this.#clonedToken = this.crosshair.token.clone();
		this.#tokenRotation = this.#clonedToken.document.rotation;
		this.#clonedToken.visible = false;
		this.layer.preview.addChild(this.#clonedToken);
		await this.#clonedToken.draw().then(c => c.visible = true);
		return super.draw();
	}

	_destroy(options = {}) {
		super._destroy(options);
		this.#clonedToken?.destroy();
	}

	updateDirection(evt) {
		if (this.crosshair.lockManualRotation) return;
		const scrollDelta = Math.sign(evt.deltaY);
		let delta = this.crosshair.snap.direction ? this.crosshair.snap.direction * scrollDelta : scrollDelta * 10;
		if (delta < 0) delta += 360;
		if (delta > 360) delta -= 360;
		this.#tokenRotation += delta;
	}

	_onConfirm(evt) {
		evt.preventDefault();
		canvas.mouseInteractionManager.cancel(evt);
		if (this.isDrag) {
			this.isDrag = false;
			canvas.mouseInteractionManager.reset({
				interactionData: true,
				state: false,
			});
			return;
		}
		this.document.updateSource({
			direction: this.#tokenRotation
		})
		return super._onConfirm(evt);
	}
}
