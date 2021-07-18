export class BaseEffectsLayer extends CanvasLayer {
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            canDragCreate: false,
            zIndex: 180,
            name: "sequencereffects"
        });
    }
}

export class BelowTokensEffectsLayer extends BaseEffectsLayer {
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 95
        });
    }
}