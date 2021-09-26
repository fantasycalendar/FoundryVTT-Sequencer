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

export class ScreenSpaceEffectLayer extends BaseEffectsLayer {

    constructor() {
        super();
        this.container = false;
        this.canvas = document.querySelectorAll('canvas')[0];
        console.log(this.canvas);
        Hooks.on("canvasPan", this.handlePan.bind(this));
    }

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 800
        });
    }

    setUpContainer(){

        if(this.container) return;
        this.container = new PIXI.Container();
        this.addChild(this.container);

        let width = 500;
        let height = 500;
        let graphic = new PIXI.Graphics();
        graphic.lineStyle(4, "0xFFFFFF")
        graphic.moveTo(width/-2,height/-2);
        graphic.lineTo(width/2,height/-2);
        graphic.lineTo(width/2,height/2);
        graphic.lineTo(width/-2,height/2);
        graphic.lineTo(width/-2,height/-2);
        graphic.lineTo(width/2,height/-2);

        this.container.addChild(graphic);

        graphic.position.set(500, 500)

    }

    handlePan(...args){

        let [canvas, posData] = args;

        this.setUpContainer();

        let scale = 1/posData.scale;
        this.container.scale.set(scale, scale)

        let x = posData.x-((this.canvas.width/2)*scale);
        let y = posData.y-((this.canvas.height/2)*scale);
        this.container.position.set(x, y)
    }
}