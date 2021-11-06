import SequencerPlayer from "../sequencer-effect-player.js";

export class BaseEffectsLayer extends CanvasLayer {

    constructor(...args) {
        super(...args);
        this.sampleLine = false;
        this.point = false;
    }

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            canDragCreate: false,
            zIndex: 180,
            name: "sequencereffects",
            interactive: true
        });
    }

    get UIContainer(){

        let container = this.children.find(child => child?.parentName === "sequencerUIContainer");

        if(!container) {
            container = new PIXI.Container();
            container.sortableChildren = true;
            container.parentName = "sequencerUIContainer";
            container.zIndex = -1;
            this.addChild(container);
            this.sortChildren();
        }

        return container;
    }

    get mousePos(){
        const mouse = canvas.app.renderer.plugins.interaction.mouse;
        let pos = mouse.getLocalPosition(canvas.app.stage);
        if(SequencerPlayer.snapLocationToGrid){
            pos = canvas.grid.getSnappedPosition(pos.x, pos.y, 2)
        }
        return new PIXI.Point(pos.x, pos.y);
    }

    updateStartPoint(){
        this.startPos = this.mousePos;
    }

    updateEndPoint(){
        this.endPos = this.mousePos;
    }

    get active(){
        return SequencerPlayer.active;
    }

    render(...args){
        super.render(...args);
        if(!this.active) return;
        this.drawLine();
        this.drawPoint();
    }

    drawLine(){

        if(!this.startPos || !this.endPos) return;

        if(this.sampleLine){
            this.sampleLine.clear();
        }

        this.sampleLine = new PIXI.Graphics();
        this.sampleLine.lineStyle(3, 0xff0000, 1)
        this.sampleLine.alpha = 0.5;
        this.UIContainer.addChild(this.sampleLine);

        // If line already present then set its position only
        this.sampleLine.moveTo(this.startPos.x, this.startPos.y);
        let mousePos = this.mousePos;
        this.sampleLine.lineTo(mousePos.x, mousePos.y);

    }

    drawPoint(){

        if(this.point){
            this.point.clear();
        }

        let mousePos = this.mousePos;

        this.point = new PIXI.Graphics();
        this.point.beginFill(0xff0000);
        this.point.drawCircle(mousePos.x, mousePos.y, 10)
        this.point.alpha = 0.5;
        this.UIContainer.addChild(this.point);

    }

    clearLine(){
        this.startPos = false;
        this.endPos = false;
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