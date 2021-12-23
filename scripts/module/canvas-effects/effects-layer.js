import { EffectPlayer, InteractionManager, SelectionManager } from "../sequencer-interaction-manager.js";
import * as canvaslib from "../lib/canvas-lib.js";

export class BaseEffectsLayer extends CanvasLayer {

    constructor(...args) {
        super(...args);

        this.active = false;
        this.isSetup = false;

        this.startPos = false;
        this.endPos = false;

    }

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 180,
            name: "sequencerEffectsAboveTokens"
        });
    }

    activate() {
        super.activate();
        this.active = true;
    }

    deactivate() {
        super.deactivate();
        this._clearChildren();
        this.active = false;
        InteractionManager.tearDown();
    }

    _setup() {
        if (this.isSetup) return;
        this.UIContainer = new PIXI.Container();
        this.UIContainer.sortableChildren = true;
        this.UIContainer.parentName = "sequencerUIContainer";
        this.UIContainer.zIndex = 10000000000000;
        this.addChild(this.UIContainer);

        this.linePoint = this.UIContainer.addChild(new PIXI.Graphics());
        this.line = this.UIContainer.addChild(new PIXI.Graphics());
        this.lineHead = this.UIContainer.addChild(new PIXI.Graphics());
        this.suggestionPoint = this.UIContainer.addChild(new PIXI.Graphics());
        this.effectHoverBoxes = this.UIContainer.addChild(new PIXI.Graphics());
        this.effectSelectionBorder = this.UIContainer.addChild(new PIXI.Graphics());
        this.effectSourcePosition = this.UIContainer.addChild(new PIXI.Graphics());
        this.effectTargetPosition = this.UIContainer.addChild(new PIXI.Graphics());

        this.suggestionPoint.filters = [new PIXI.filters.AlphaFilter(0.75)];
        this.effectSourcePosition.filters = [new PIXI.filters.AlphaFilter(0.75)];
        this.effectTargetPosition.filters = [new PIXI.filters.AlphaFilter(0.75)];

        this.effectSelectionBorder.zIndex = 1;
        this.effectSourcePosition.interactive = true;
        this.effectTargetPosition.interactive = true;

        this.effectSourcePosition.pointerdown = () => {
            SelectionManager.sourcePointSelected();
        }
        this.effectTargetPosition.pointerdown = () => {
            SelectionManager.targetPointSelected();
        }
        this.isSetup = true;
    }

    render(...args) {
        super.render(...args);
        this._setup();
        this._clearChildren();
        this._drawHoveredEffectElements();
        if (!this.active) return;
        this._drawLine();
        this._drawPoints();
        this._drawSelectedEffectElements();
        this._drawSuggestionPoint();
    }

    _clearChildren() {
        if (!this.UIContainer) return;
        this.UIContainer.children.forEach(child => {
            child.clear()
        });
    }

    _drawLine() {

        if (!this.startPos || !this.endPos || game.activeTool !== "play-effect") return;

        this.line.lineStyle(3, 0xFF2937, 1)
        // If line already present then set its position only
        this.line.moveTo(this.startPos.x, this.startPos.y);
        this.line.lineTo(this.endPos.x, this.endPos.y);

    }

    _drawPoints() {

        if (game.activeTool !== "play-effect") return;

        const position = this.startPos || canvaslib.get_mouse_position(EffectPlayer.snapLocationToGrid);

        this.linePoint.beginFill(0xFF2937);
        this.linePoint.drawCircle(position.x, position.y, 5)

        if (!this.endPos) return;

        const angle = new Ray(this.startPos, this.endPos).angle;

        this.lineHead.beginFill(0xFF2937);
        this.lineHead.moveTo(0, -5);
        this.lineHead.lineTo(-15, 30);
        this.lineHead.lineTo(15, 30);
        this.lineHead.endFill()
        this.lineHead.rotation = angle + Math.PI / 2;
        this.lineHead.position.set(this.endPos.x, this.endPos.y)

    }

    _drawHoveredEffectElements() {
        const effects = SelectionManager.hoveredEffects;
        effects.add(SelectionManager.hoveredEffectUI)
        for (const effect of effects) {
            if (effect._destroyed || !effect.spriteContainer || effect === SelectionManager.selectedEffect) continue;
            this._drawBoxAroundEffect(this.effectHoverBoxes, effect, 0xFFFFFF);
        }
    }

    _drawSelectedEffectElements() {

        if (SelectionManager.selectedEffect && SelectionManager.selectedEffect.spriteContainer) {
            this._drawBoxAroundEffect(this.effectSelectionBorder, SelectionManager.selectedEffect, 0xFF0000);
            this._drawEffectStartEndPoints(SelectionManager.selectedEffect);
        }

    }

    _drawBoxAroundEffect(graphic, effect, color) {

        const boundingBox = effect.spriteContainer.getLocalBounds();
        graphic.lineStyle(3, color, 0.9)

        const dimensions = {
            x: effect.position.x + boundingBox.x * effect.scale.x,
            y: effect.position.y + boundingBox.y * effect.scale.y,
            width: boundingBox.width * effect.scale.x,
            height: boundingBox.height * effect.scale.y,
        }

        graphic.moveTo(...canvaslib.rotate_coordinate(effect.position, {
            x: dimensions.x,
            y: dimensions.y
        }, -effect.rotation))
        graphic.lineTo(...canvaslib.rotate_coordinate(effect.position, {
            x: dimensions.x + dimensions.width,
            y: dimensions.y
        }, -effect.rotation))
        graphic.lineTo(...canvaslib.rotate_coordinate(effect.position, {
            x: dimensions.x + dimensions.width,
            y: dimensions.y + dimensions.height
        }, -effect.rotation))
        graphic.lineTo(...canvaslib.rotate_coordinate(effect.position, {
            x: dimensions.x,
            y: dimensions.y + dimensions.height
        }, -effect.rotation))
        graphic.lineTo(...canvaslib.rotate_coordinate(effect.position, {
            x: dimensions.x,
            y: dimensions.y
        }, -effect.rotation))

    }

    /**
     * Draws the start/end point circles
     * @private
     */
    _drawEffectStartEndPoints(effect) {
        if (!effect.data.stretchTo || !effect.sourcePosition || !effect.targetPosition) return;

        this.effectSourcePosition.beginFill(0xFFFF00);
        this.effectSourcePosition.drawCircle(effect.sourcePosition.x, effect.sourcePosition.y, canvas.grid.size * 0.25)

        if (typeof effect.data.source === "string") {
            this.effectSourcePosition.drawRect(
                effect.sourcePosition.x - canvas.grid.size * 0.05,
                effect.sourcePosition.y - canvas.grid.size * 0.5,
                canvas.grid.size * 0.1,
                canvas.grid.size,
            )
            this.effectSourcePosition.drawRect(
                effect.sourcePosition.x - canvas.grid.size * 0.5,
                effect.sourcePosition.y - canvas.grid.size * 0.05,
                canvas.grid.size,
                canvas.grid.size * 0.1,
            )
        }

        this.effectTargetPosition.beginFill(0xFF00FF);
        this.effectTargetPosition.drawCircle(effect.targetPosition.x, effect.targetPosition.y, canvas.grid.size * 0.25)
        this.effectTargetPosition.alpha = 0.75;

        if (typeof effect.data.target === "string") {
            this.effectTargetPosition.drawRect(
                effect.targetPosition.x - canvas.grid.size * 0.05,
                effect.targetPosition.y - canvas.grid.size * 0.5,
                canvas.grid.size * 0.1,
                canvas.grid.size,
            )
            this.effectTargetPosition.drawRect(
                effect.targetPosition.x - canvas.grid.size * 0.5,
                effect.targetPosition.y - canvas.grid.size * 0.05,
                canvas.grid.size,
                canvas.grid.size * 0.1,
            )
        }
    }

    _drawSuggestionPoint() {

        if (!SelectionManager.suggestedPosition || !SelectionManager.selectedEffect) return;

        const effect = SelectionManager.selectedEffect;
        const suggestion = SelectionManager.suggestedPosition;

        this.suggestionPoint.position.set(0, 0)
        this.suggestionPoint.rotation = 0;

        if (effect.data.stretchTo) {
            this.suggestionPoint.beginFill(suggestion.color);
            this.suggestionPoint.drawCircle(suggestion.x, suggestion.y, canvas.grid.size * 0.25);
            if (suggestion.showCursor) {
                this.suggestionPoint.drawRect(
                    suggestion.x - canvas.grid.size * 0.05,
                    suggestion.y - canvas.grid.size * 0.5,
                    canvas.grid.size * 0.1,
                    canvas.grid.size,
                )
                this.suggestionPoint.drawRect(
                    suggestion.x - canvas.grid.size * 0.5,
                    suggestion.y - canvas.grid.size * 0.05,
                    canvas.grid.size,
                    canvas.grid.size * 0.1,
                )
            }
            return;
        }

        const boundingBox = effect.spriteContainer.getLocalBounds()
        this.suggestionPoint.position.set(suggestion.x, suggestion.y)
        this.suggestionPoint.rotation = effect.rotation;
        this.suggestionPoint.lineStyle(3, 0xFF0000, 0.9)
        this.suggestionPoint.drawRect(
            boundingBox.x * effect.scale.x,
            boundingBox.y * effect.scale.y,
            boundingBox.width * effect.scale.x,
            boundingBox.height * effect.scale.y,
        )

        if (suggestion.showCursor) {
            this.suggestionPoint.beginFill(0xFF0000);
            this.suggestionPoint.drawRect(
                canvas.grid.size * -0.05,
                canvas.grid.size * -0.5,
                canvas.grid.size * 0.1,
                canvas.grid.size,
            )
            this.suggestionPoint.drawRect(
                canvas.grid.size * -0.5,
                canvas.grid.size * -0.05,
                canvas.grid.size,
                canvas.grid.size * 0.1,
            )
        }

        if (suggestion.showPoint) {
            this.suggestionPoint.drawCircle(0, 0, canvas.grid.size * 0.2)
        }
    }

}

export class BelowTokensEffectsLayer extends BaseEffectsLayer {
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 95,
            name: "sequencerEffectsBelowTokens",
        });
    }
}