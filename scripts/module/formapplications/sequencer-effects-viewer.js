export default class SequencerEffectsViewer extends FormApplication {

    constructor(effects, dialogData = {}, options = {}) {
        super(dialogData, options);
        this.effects = effects;
    }

    static show(inFocus, effects){
        if (!game.user.isTrusted) return;
        for(let app of Object.values(ui.windows)){
            if(app instanceof this){
                if(effects) app.effects = effects;
                return app.render(true, { focus: inFocus });
            }
        }
        return new this(effects).render(true);
    }

    static get isVisible(){
        for(let app of Object.values(ui.windows)){
            if(app instanceof this) return app;
        }
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Sequencer Effect Viewer",
            template: `modules/sequencer/templates/sequencer-effects-template.html`,
            classes: ["dialog"],
            width: 450,
            height: 400,
            resizable: true
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        let data = super.getData();
        data.noEffects = this.effects.length === 0;
        let index = -1;
        data.persistentEffects = this.effects
            .filter(effect => effect.data.persist)
            .map(effect => {
                index++;
                const name = this.formatEffectName(effect);
                return {
                    name,
                    index
                };
            })
        data.temporaryEffects = this.effects
            .filter(effect => !effect.data.persist)
            .map(effect => {
                index++;
                const name = this.formatEffectName(effect);
                return {
                    name,
                    index
                };
            })
        data.hasBothEffects = data.persistentEffects.length && data.temporaryEffects;
        return data;
    }

    formatEffectName(effect){
        let fileName = effect.data.file.split('\\').pop().split('/').pop();
        fileName = fileName !== "" ? fileName : "Text: " + effect.data.text.text;
        let name = effect.data.name ? `${effect.data.name} (${fileName})` : fileName;
        if(effect.data.creatorUserId !== game.userId){
            name += ` (${game.users.get(effect.data.creatorUserId)?.name ?? "Unknown"}'s effect)`
        }
        return name;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        let self = this;
        html.find('.btn_end').click(function () {
            const index = $(this).parent().attr("data-id");
            self._endEffect.bind(self)(index);
        });
        html.find('.hover-highlight').mouseover(function () {
            const index = $(this).attr("data-id");
            self._showHighlight.bind(self)(index);
        });
        html.find('.hover-highlight').mouseleave(function () {
            const index = $(this).attr("data-id");
            self._showHighlight.bind(self)(index, false);
        });
    }

    _endEffect(index){
        const effect = this.effects[index];
        Sequencer.EffectManager.endEffects({ effects: effect, sceneId: game.user.viewedScene });
    }

    _showHighlight(index, show = true){
        const effect = this.effects[index];
        effect._showHighlight(show);
    }

    async _onSubmit(event) {
        super._onSubmit(event, { preventClose: true })
    }

    async _updateObject() {
    }

}