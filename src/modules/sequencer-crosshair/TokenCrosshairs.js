import Crosshairs from './Crosshairs.js';
import CrosshairsPlaceable from './CrosshairsPlaceable.js';

export default class TokenCrosshairs extends Crosshairs {
	/**
	 * @inheritdoc
	 */
	constructor(token, context = {}) {

		const {distance} = context.parent.grid;
		const rayBounds = new Ray(
			{x: 0, y: 0},
			{x: token.width * distance, y: token.height * distance});

		const initial = {
			t: 'rect',
			'icon.display': false,
			'label.text': token.name,
			texture: token.texture.src,
			direction: Math.toDegrees(rayBounds.angle),
			distance: rayBounds.distance,
		};
		super(initial, context);
	}

	static get placeableClass() {
		return class extends CrosshairsPlaceable {
			/**
			 * @override
			 */
			_refreshTemplate() {
				const t = this.template.clear();
				t.lineStyle(this._borderThickness, this.document.borderColor, 0.75).beginFill(0x000000, 0.0);
				/* Just draw a "properly" (lol) scaled token
				 * preview */
				const {distance, size} = this.document.parent.grid;
				const w = this.document.distance * Math.cos(Math.toRadians(this.document.direction)) / distance;
				const h = this.document.distance * Math.sin(Math.toRadians(this.document.direction)) / distance;
				const scaleX = w * size / this.texture.width;
				const scaleY = h * size / this.texture.height;
				t.beginTextureFill({
					texture: this.texture,
					matrix: new PIXI.Matrix().scale(scaleX, scaleY),
				});

				t.drawShape(this.shape).endFill();
			}
		};
	}
}
