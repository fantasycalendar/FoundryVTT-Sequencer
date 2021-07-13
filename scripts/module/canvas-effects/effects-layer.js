export class BaseEffectsLayer extends CanvasLayer {

    static get layerOptions() {

        let version = isNewerVersion(game.data.version, "0.7.10");
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

        let version = isNewerVersion(game.data.version, "0.7.10");
        let mergeFunc = version ? foundry.utils.mergeObject : mergeObject;

        return mergeFunc(super.layerOptions, {
            zIndex: 95
        });

    }

}