export class BaseEffectsLayer extends CanvasLayer {
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            canDragCreate: false,
            zIndex: 180,
            name: "sequencereffects",
            interactive: true
        });
    }

    drawLine(positions){

        console.log(positions);

        if(!this.sampleLine){
            this.sampleLine = new PIXI.Graphics();
            this.sampleLine.lineWidth = 5;
            this.sampleLine.lineColor = 0x000000;
            this.addChild(this.sampleLine);
        }
        this.sampleLine.clear();

        // If line already present then set its position only
        this.sampleLine.position = new PIXI.Point(positions.start.x, positions.start.y);
        this.sampleLine.lineTo(positions.end.x, positions.end.y);

    }

    clearLine(){
        if(this.sampleLine){
            this.sampleLine.clear();
        }
    }
}

export class BelowTokensEffectsLayer extends BaseEffectsLayer {
    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            zIndex: 95
        });
    }
}