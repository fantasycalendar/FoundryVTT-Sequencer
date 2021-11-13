import SequencerPlayer from "../sequencer-effect-player.js";

export class BaseEffectsLayer extends CanvasLayer {

    constructor(...args) {
        super(...args);
        this._container = false;
        this.sampleLine = false;
        this.point = false;
    }

    static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
            canDragCreate: false,
            zIndex: 180,
            name: "sequencerEffectsAboveTokens",
            interactive: true
        });
    }

    activate(){
        super.activate();
        SequencerPlayer.show();
    }

    get UIContainer(){

        if(!this._container) {
            this._container = new PIXI.Container();
            this._container.sortableChildren = true;
            this._container.parentName = "sequencerUIContainer";
            this._container.zIndex = -1;
            this.addChild(this._container);
            this.sortChildren();
        }

        return this._container;
    }

    getMousePos(){
        const mouse = canvas.app.renderer.plugins.interaction.mouse;
        let pos = mouse.getLocalPosition(canvas.app.stage);
        if(this.snapToGrid){
            pos = canvas.grid.getSnappedPosition(pos.x, pos.y, 2)
        }
        return new PIXI.Point(pos.x, pos.y);
    }

    updateStartPoint(){
        this.startPos = this.getMousePos();
    }

    updateEndPoint(){
        this.endPos = this.getMousePos();
    }

    get playActive(){
        return SequencerPlayer.playActive;
    }

    get snapToGrid(){
        return SequencerPlayer.snapLocationToGrid;
    }

    render(...args){
        super.render(...args);
        this.drawLine();
        this.drawPoint();
    }

    drawLine(){

        if(!this.startPos || !this.endPos) return;

        if(this.sampleLine){
            this.sampleLine.clear();
        }

        if(!this.playActive) return;

        this.sampleLine = new PIXI.Graphics();
        this.sampleLine.lineStyle(3, 0xff0000, 1)
        this.sampleLine.alpha = 0.5;
        this.UIContainer.addChild(this.sampleLine);

        // If line already present then set its position only
        this.sampleLine.moveTo(this.startPos.x, this.startPos.y);
        let mousePos = this.getMousePos();
        this.sampleLine.lineTo(mousePos.x, mousePos.y);

    }

    clearLine(){
        this.startPos = false;
        this.endPos = false;
        if(this.sampleLine){
            this.sampleLine.clear();
        }
    }

    drawPoint(){

        if(this.point){
            this.point.clear();
        }

        if(!this.playActive) return;

        let mousePos = this.getMousePos();

        this.point = new PIXI.Graphics();
        this.point.beginFill(0xff0000);
        this.point.drawCircle(mousePos.x, mousePos.y, 10)
        this.point.alpha = 0.5;
        this.UIContainer.addChild(this.point);

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