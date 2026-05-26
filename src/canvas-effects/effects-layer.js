import { EffectPlayer, InteractionManager, SelectionManager, } from "../modules/sequencer-interaction-manager.js";
import * as canvaslib from "../lib/canvas-lib.js";
import * as lib from "../lib/lib.js";
import CONSTANTS from "../constants.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";

/**
 * Inert compatibility layer.
 *
 * Prior to Foundry v14 this layer was the default render target for
 * Sequencer effects via `canvas.sequencerEffects`. Default effects now
 * render inside `canvas.primary` so that they participate in elevation /
 * sortLayer ordering with tokens, tiles, drawings, and weather (see
 * CanvasEffect._addToContainer). The layer remains registered solely for
 * backward compatibility with external modules or macros that reference
 * `canvas.sequencerEffects` directly.
 */
export class BaseEffectsLayer extends foundry.canvas.layers.InteractionLayer {
	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			name: CONSTANTS.EFFECTS_LAYER,
		});
	}
}

export class SequencerInterfaceLayer extends foundry.canvas.layers.InteractionLayer {
	constructor(...args) {
		super(...args);
	}

	isActive = false;

	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			elevation: 100000000,
			name: CONSTANTS.INTERFACE_LAYER,
		});
	}

	activate(...args) {
		const result = super.activate(...args);
		this.isActive = true;
		return result;
	}

	deactivate() {
		super.deactivate();
		if (!this.isActive) return;
		this._clearChildren();
		this.isActive = false;
		InteractionManager.tearDown();
	}

	_setup() {
		if (!this.UIContainer || this.UIContainer._destroyed) {
			this.UIContainer = new PIXI.Container();
			this.UIContainer.sortableChildren = true;
			this.UIContainer.parentName = "sequencerUIContainer";
			this.UIContainer.zIndex = 10000000000000;
			this.addChild(this.UIContainer);

			this.visualizedSound = this.UIContainer.addChild(new PIXI.Graphics());

			this.linePoint = this.UIContainer.addChild(new PIXI.Graphics());
			this.line = this.UIContainer.addChild(new PIXI.Graphics());
			this.lineHead = this.UIContainer.addChild(new PIXI.Graphics());
			this.suggestionPoint = this.UIContainer.addChild(new PIXI.Graphics());
			this.effectHoverBoxes = this.UIContainer.addChild(new PIXI.Graphics());
			this.effectSelectionBorder = this.UIContainer.addChild(
				new PIXI.Graphics()
			);
			this.effectSourcePosition = this.UIContainer.addChild(
				new PIXI.Graphics()
			);
			this.effectTargetPosition = this.UIContainer.addChild(
				new PIXI.Graphics()
			);

			this.suggestionPoint.filters = [new PIXI.AlphaFilter(0.75)];
			this.effectSourcePosition.filters = [new PIXI.AlphaFilter(0.75)];
			this.effectTargetPosition.filters = [new PIXI.AlphaFilter(0.75)];

			this.effectSelectionBorder.zIndex = 1;

			this.effectSourcePosition.interactive = true;
			this.effectSourcePosition.on("mousedown", () => {
				SelectionManager.sourcePointSelected();
			});

			this.effectTargetPosition.interactive = true;
			this.effectTargetPosition.on("mousedown", () => {
				SelectionManager.targetPointSelected();
			});
		}
	}

	async _draw(...args) {
	}

	render(...args) {
		super.render(...args);
		this._setup();
		this._clearChildren();
		this._drawHoveredEffectElements();
		this._drawVisualizedSounds();
		if (!this.isActive) return;
		this._drawLine();
		this._drawPoints();
		this._drawSelectedEffectElements();
		this._drawSuggestionPoint();
	}

	_drawVisualizedSounds() {
		let sound = SelectionManager.hoveredSoundUI;
		if (!sound || sound.status === SequencerSoundManager.states.ENDED || !sound.data.source) return;

		const baseRadius = sound.data.locationOptions?.radius;
		if (!lib.is_real_number(baseRadius)) return;

		const sourcePos = sound.sourcePosition;
		let radius = (baseRadius / canvas.grid.distance) * canvas.grid.size;
		let data = {
			position: {
				x: sourcePos.x,
				y: sourcePos.y
			},
			radius: radius,
			shape: foundry.canvas.geometry.ClockwiseSweepPolygon.create(sourcePos, {
				type: "sound",
				radius: radius
			})
		};

		for (let constraint of data.shape.config.boundaryShapes) {
			this.visualizedSound.lineStyle(2, 0xFF4444, 1.0);
			this.visualizedSound.beginFill(0xFF4444, 0.10);
			this.visualizedSound.drawShape(constraint);
			this.visualizedSound.endFill();
		}

		this.visualizedSound.beginFill(CONSTANTS.COLOR.PRIMARY, 0.5);
		this.visualizedSound.lineStyle(2, CONSTANTS.COLOR.PRIMARY, 1.0);
		this.visualizedSound.drawCircle(data.position.x, data.position.y, canvas.grid.size / 4);
		this.visualizedSound.endFill();

		this.visualizedSound.beginFill(0x00AAFF, 0.25);
		this.visualizedSound.drawShape(data.shape);
		this.visualizedSound.endFill();
	}

	_clearChildren() {
		if (!this.UIContainer) return;
		this.UIContainer.children.forEach((child) => {
			child.clear();
		});
	}

	_drawLine() {
		if (
			!EffectPlayer.startPos ||
			!EffectPlayer.endPos ||
			game?.activeTool !== CONSTANTS.TOOLS.PLAY
		)
			return;

		this.line.lineStyle(3, CONSTANTS.COLOR.PRIMARY, 1);
		// If line already present then set its position only
		this.line.moveTo(EffectPlayer.startPos.x, EffectPlayer.startPos.y);
		this.line.lineTo(EffectPlayer.endPos.x, EffectPlayer.endPos.y);
	}

	_drawPoints() {
		if (game?.activeTool !== CONSTANTS.TOOLS.PLAY) return;

		const startPos = EffectPlayer.startPos || EffectPlayer.cursorPos;

		this.linePoint.beginFill(CONSTANTS.COLOR.PRIMARY);
		this.linePoint.drawCircle(startPos.x, startPos.y, 5);

		if (EffectPlayer.sourceAttachFound) {
			this._drawCrossAtPosition(this.linePoint, startPos);
		}

		if (!EffectPlayer.endPos) return;

		const angle = new foundry.canvas.geometry.Ray(startPos, EffectPlayer.endPos).angle;

		this.lineHead.beginFill(CONSTANTS.COLOR.PRIMARY);
		this.lineHead.moveTo(0, -5);
		this.lineHead.lineTo(-15, 30);
		this.lineHead.lineTo(15, 30);
		this.lineHead.endFill();
		this.lineHead.rotation = angle + Math.PI / 2;
		this.lineHead.position.set(EffectPlayer.endPos.x, EffectPlayer.endPos.y);

		if (EffectPlayer.targetAttachFound) {
			this.linePoint.beginFill(CONSTANTS.COLOR.SECONDARY);
			this._drawCrossAtPosition(this.linePoint, EffectPlayer.endPos);
		}
	}

	_drawHoveredEffectElements() {
		const effects = new Set(SelectionManager.hoveredEffects);
		if (SelectionManager.hoveredEffectUI)
			effects.add(SelectionManager.hoveredEffectUI);
		for (const effect of effects) {
			if (
				!effect ||
				effect === SelectionManager.selectedEffect ||
				effect.data.screenSpace ||
				effect._isEnding
			)
				continue;
			this._drawBoxAroundEffect(this.effectHoverBoxes, effect);
		}
	}

	_drawSelectedEffectElements() {
		if (!SelectionManager.selectedEffect) return;
		this._drawBoxAroundEffect(
			this.effectSelectionBorder,
			SelectionManager.selectedEffect,
			true
		);
		this._drawEffectStartEndPoints(SelectionManager.selectedEffect);
	}

	_drawBoxAroundEffect(graphic, effect, selected = false) {
		if (
			!effect ||
			effect._destroyed ||
			!effect.spriteContainer ||
			!effect.ready
		)
			return;

		graphic.lineStyle(3, selected ? CONSTANTS.COLOR.PRIMARY : 0xffffff, 0.9);

		let boundingBox = effect.sprite.getLocalBounds();

		let dimensions = {
			x: effect.position.x + boundingBox.x,
			y: effect.position.y + boundingBox.y,
			width: boundingBox.width,
			height: boundingBox.height,
		};

		if (effect.data.shapes.length) {
			for (const shape of Object.values(effect.shapes)) {
				boundingBox = shape.getLocalBounds();
				dimensions = {
					x: Math.min(
						dimensions.x,
						effect.position.x + boundingBox.x * shape.scale.x
					),
					y: Math.min(
						dimensions.y,
						effect.position.y + boundingBox.y * shape.scale.y
					),
					width: Math.max(dimensions.width, boundingBox.width * shape.scale.x),
					height: Math.max(
						dimensions.height,
						boundingBox.height * shape.scale.y
					),
				};
			}
		}

		const rotation = Math.normalizeRadians(
			effect.rotationContainer.rotation +
			effect.spriteContainer.rotation +
			effect.sprite.rotation
		);

		this._drawRectangle(graphic, effect.position, rotation, dimensions);
	}

	_drawRectangle(graphic, position, rotation, dimensions) {
		graphic.moveTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x,
					y: dimensions.y,
				},
				-rotation
			)
		);

		graphic.lineTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x + dimensions.width,
					y: dimensions.y,
				},
				-rotation
			)
		);

		graphic.lineTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x + dimensions.width,
					y: dimensions.y + dimensions.height,
				},
				-rotation
			)
		);

		graphic.lineTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x,
					y: dimensions.y + dimensions.height,
				},
				-rotation
			)
		);

		graphic.lineTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x,
					y: dimensions.y,
				},
				-rotation
			)
		);

		graphic.lineTo(
			...canvaslib.rotate_coordinate(
				position,
				{
					x: dimensions.x + dimensions.width,
					y: dimensions.y,
				},
				-rotation
			)
		);
	}

	/**
	 * Draws the start/end point circles
	 * @private
	 */
	_drawEffectStartEndPoints(effect) {
		if (!effect || effect._destroyed || !effect.spriteContainer) return;
		if (!effect.data.stretchTo) return;

		const sourcePos = effect.sourcePosition;
		const targetPos = effect.targetPosition;
		if (!sourcePos || !targetPos) return;

		this.effectSourcePosition.beginFill(CONSTANTS.COLOR.PRIMARY);
		this.effectSourcePosition.drawCircle(
			sourcePos.x,
			sourcePos.y,
			canvas.grid.size * 0.25
		);

		if (typeof effect.data.source === "string") {
			this._drawCrossAtPosition(
				this.effectSourcePosition,
				sourcePos
			);
		}

		this.effectTargetPosition.beginFill(CONSTANTS.COLOR.SECONDARY);
		this.effectTargetPosition.drawCircle(
			targetPos.x,
			targetPos.y,
			canvas.grid.size * 0.25
		);
		this.effectTargetPosition.alpha = 0.75;

		if (typeof effect.data.target === "string") {
			this._drawCrossAtPosition(
				this.effectTargetPosition,
				targetPos
			);
		}
	}

	_drawSuggestionPoint() {
		if (
			!SelectionManager.suggestedProperties ||
			!SelectionManager.selectedEffect
		)
			return;

		const effect = SelectionManager.selectedEffect;
		const suggestion = SelectionManager.suggestedProperties;

		this.suggestionPoint.position.set(0, 0);
		this.suggestionPoint.rotation = 0;

		if (effect.data.stretchTo) {
			this.suggestionPoint.beginFill(suggestion.color);
			this.suggestionPoint.drawCircle(
				suggestion.position.x,
				suggestion.position.y,
				canvas.grid.size * 0.25
			);
			if (suggestion.showCursor) {
				this._drawCrossAtPosition(this.suggestionPoint, suggestion.position);
			}
			return;
		}

		const boundingBox = effect.spriteContainer.getLocalBounds();

		const dimensions = {
			x: boundingBox.x * effect.scale.x,
			y: boundingBox.y * effect.scale.y,
			width: boundingBox.width * effect.scale.x,
			height: boundingBox.height * effect.scale.y,
		};

		this.suggestionPoint.lineStyle(3, CONSTANTS.COLOR.PRIMARY, 0.9);
		this.suggestionPoint.position.set(
			suggestion.position.x,
			suggestion.position.y
		);
		this._drawRectangle(
			this.suggestionPoint,
			suggestion.position,
			effect.rotation,
			dimensions,
			true
		);

		if (suggestion.showCursor) {
			this.suggestionPoint.beginFill(CONSTANTS.COLOR.SECONDARY);
			this._drawCrossAtPosition(this.suggestionPoint);
		}

		if (suggestion.showPoint) {
			this.suggestionPoint.drawCircle(0, 0, canvas.grid.size * 0.2);
		}
	}

	_drawCrossAtPosition(inElement, inPosition = { x: 0, y: 0 }) {
		inElement.drawRect(
			inPosition.x + canvas.grid.size * -0.05,
			inPosition.y + canvas.grid.size * -0.5,
			canvas.grid.size * 0.1,
			canvas.grid.size
		);
		inElement.drawRect(
			inPosition.x + canvas.grid.size * -0.5,
			inPosition.y + canvas.grid.size * -0.05,
			canvas.grid.size,
			canvas.grid.size * 0.1
		);
	}
}

export class UIEffectsLayer extends foundry.canvas.layers.InteractionLayer {
	static get layerOptions() {
		return foundry.utils.mergeObject(super.layerOptions, {
			zIndex: 999999999999999,
			name: "sequencerEffectsAboveEverything",
		});
	}

	async _draw(options) {
		await super._draw(options);
		this.sortableChildren = true;
	}

	updateTransform() {
		if (this.sortableChildren && this.sortDirty) {
			this.sortChildren();
		}

		this._boundsID++;

		this.transform.updateTransform(PIXI.Transform.IDENTITY);
		this.worldAlpha = this.alpha;

		for (let child of this.children) {
			if (child.visible) {
				child.updateTransform();
			}
		}
	}
}

let ABOVE_UI_LAYER = false;

export class SequencerAboveUILayer {
	constructor(name, zIndex = 0.1) {
		this.canvas = document.createElement("canvas");
		this.canvas.id = name;

		this.canvas.style.cssText = `
            position:absolute;
            touch-action: none;
            pointer-events: none;
            width:100%;
            height:100%;
            z-index:${zIndex};
            padding: 0;
            margin: 0;
        `;

		document.body.appendChild(this.canvas);

		this.app = new PIXI.Application({
			width: window.innerWidth,
			height: window.innerHeight,
			view: this.canvas,
			antialias: true,
			backgroundAlpha: 0.0,
			sharedTicker: true,
		});

		this.app.resizeTo = window;
		this.app.stage.renderable = false;
		this.app.stage.sortableChildren = true;
		// PIXI's TickerPlugin auto-registers app.render on the shared ticker
		// when the app is constructed. Undo that so the secondary renderer
		// only ticks while there are children to draw; addChild / remove
		// re-register and de-register the callback at the right transitions.
		PIXI.Ticker.shared.remove(this.app.render, this.app);
		this._renderTickerActive = false;
	}

	static getLayer() {
		return ABOVE_UI_LAYER ? ABOVE_UI_LAYER.app.stage : canvas.sequencerEffectsUILayer;
	}

	static addChild(...args) {
		if (!ABOVE_UI_LAYER && game.settings.get("sequencer", "enable-above-ui-screenspace")) {
			ABOVE_UI_LAYER = new this("sequencerUILayerAbove", 10000);
		}
		const targetLayer = this.getLayer();
		const result = targetLayer.addChild(...args);
		if (ABOVE_UI_LAYER && targetLayer === ABOVE_UI_LAYER.app.stage) {
			targetLayer.renderable = targetLayer.children.length > 0;
			if (targetLayer.renderable && !ABOVE_UI_LAYER._renderTickerActive) {
				PIXI.Ticker.shared.add(
					ABOVE_UI_LAYER.app.render,
					ABOVE_UI_LAYER.app,
					PIXI.UPDATE_PRIORITY.LOW
				);
				ABOVE_UI_LAYER._renderTickerActive = true;
			}
		}
		return result;
	}

	static sortChildren() {
		this.getLayer().sortDirty = true;
	}

	static removeContainerByEffect(inEffect) {
		const targetLayer = this.getLayer();
		if (!targetLayer) return;
		targetLayer.removeChild(inEffect);
		if (ABOVE_UI_LAYER && targetLayer === ABOVE_UI_LAYER.app.stage) {
			targetLayer.renderable = targetLayer.children.length > 0;
			if (!targetLayer.renderable && ABOVE_UI_LAYER._renderTickerActive) {
				// Clear the framebuffer one last time before we stop ticking.
				ABOVE_UI_LAYER.app.render();
				PIXI.Ticker.shared.remove(
					ABOVE_UI_LAYER.app.render,
					ABOVE_UI_LAYER.app
				);
				ABOVE_UI_LAYER._renderTickerActive = false;
			}
		}
	}
}
