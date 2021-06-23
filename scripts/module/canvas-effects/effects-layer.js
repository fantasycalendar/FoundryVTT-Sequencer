import Version from "../../version.js";
import CanvasEffect from "./canvas-effect.js";

export class BaseEffectsLayer extends CanvasLayer {

    constructor() {
        super();
        this.effectsContainer = undefined;
    }

    static get layerOptions() {

        let version = new Version().onOrAfter("0.8.6");
        let mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        let obj = {
            canDragCreate: false,
            zIndex: 180
        }

        if(version){
            obj.name = "sequencereffects"
        }else{
            obj.objectClass = Note
            obj.sheetClass = NoteConfig
        }

        return mergeFunc(super.layerOptions, obj);

    }

    _setUpEffectsContainer(){
        if(!this.effectsContainer) {
            this.effectsContainer = new PIXI.Container();
            this.effectsContainer.sortableChildren = true;
            this.addChild(this.effectsContainer);
        }
    }

    playEffect(data) {
        this._setUpEffectsContainer();
        return new CanvasEffect(this.effectsContainer, data).play();
    }

}

export class BelowTokensEffectsLayer extends BaseEffectsLayer {

    static get layerOptions() {

        let version = new Version().onOrAfter("0.8.6");
        let mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        return mergeFunc(super.layerOptions, {
            zIndex: 95
        });

    }

}

export class BelowTilesEffectsLayer extends BaseEffectsLayer {

    static get layerOptions() {

        let version = new Version().onOrAfter("0.8.6");
        let mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        return mergeFunc(super.layerOptions, {
            zIndex: 25
        });

    }

}