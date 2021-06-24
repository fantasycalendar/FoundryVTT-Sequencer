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