export default class SequencerEffectsViewer extends FormApplication {

    constructor(effects, dialogData = {}, options = {}) {
        super(dialogData, options);
        this.effects = effects;
    }

    static show(effects){
        if (!game.user.isTrusted) return;
        for(let app of Object.values(ui.windows)){
            if(app instanceof this){
                app.effects = effects;
                return app.render(true, { focus: true });
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
        data.effects = this.effects.map(effect => {
            let fileName = effect.data.file.split('\\').pop().split('/').pop();
            let name = effect.data.name ? `${effect.data.name} (${fileName})` : fileName;
            if(effect.data.creatorUserId !== game.userId){
                name += ` (${game.users.get(effect.data.creatorUserId)?.name ?? "Unknown"}'s effect)`
            }
            return name;
        })
        return data;
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

    async _endEffect(index){
        const effect = this.effects[index];
        await SequencerEffectManager.endEffects({ effects: effect, sceneId: game.user.viewedScene });
        this.render(true);
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