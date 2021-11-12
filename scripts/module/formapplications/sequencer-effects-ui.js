import * as lib from "../lib/lib.js";
import { reactiveEl as html } from "../lib/html.js";
import SequencerPlayer from "../sequencer-effect-player.js";

export default class SequencerEffectsUI extends FormApplication {

    constructor(dialogData = {}, options = {}) {
        super(dialogData, options);
        this._settings = duplicate(SequencerEffectsUI.defaultNoninputSettings);
        this.settingsElements = [];
        this.presetSelect = undefined;
        this.deletePresetButton = undefined;
        this.fileInput = undefined;
        this.userSelect = undefined;
        this.lastSearch = undefined;
        this.lastResults = [];
        this.effects = [];
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Sequencer Effects",
            template: `modules/sequencer/templates/sequencer-effects-template.html`,
            classes: ["dialog"],
            width: "auto",
            height: 570,
            top: 65,
            left: 120,
            resizable: true,
            tabs: [{
                navSelector: ".tabs",
                contentSelector: ".content",
                initial: "manager"
            }]
        });
    }

    static show({inFocus = true, tab = "player" }={}){
        if (!game.user.isTrusted) return;
        let activeApp;
        for(let app of Object.values(ui.windows)){
            if(app instanceof this){
                activeApp = app;
                break;
            }
        }

        if(activeApp){
            if(activeApp._tabs[0].active !== tab){
                activeApp.render(true, { focus: inFocus });
                activeApp.reapplySettings();
            }
        }else{
            activeApp = new this();
            activeApp.render(true, { focus: inFocus });
        }

        return activeApp.setTab(tab);
    }

    setTab(tab){
        this._tabs[0].active = tab;
        return this;
    }

    static get isVisible() {
        return this.activeInstance !== undefined;
    }

    static get activeInstance(){
        for (let app of Object.values(ui.windows)) {
            if (app instanceof this) return app;
        }
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        this.activateManagerListeners(html);
        this.activatePlayerListeners(html);
        this.updateEffects();
    }

    /** @override */
    getData() {
        let data = super.getData()
        data.isGM = game.user.isGM;
        data = this.getPlayerData(data);
        return data;
    }

    close(options){
        super.close(options)
        SequencerPlayer.snapLocationToGrid = false;
    }

    async _onSubmit(event) {
        super._onSubmit(event, { preventClose: true })
    }

    /* --------------------------------------------------------------
     *                        EFFECT MANAGER
     * -------------------------------------------------------------- */

    activateManagerListeners(html){
        this.noEffectsLabel = html.find(".no-effects");
        this.effectsContainer = html.find(".effects");
        this.persistentEffectsContainer = html.find(".persistent-effects");
        this.temporaryEffectsContainer = html.find(".temporary-effects");
    }

    createEffectElement(effect){

        let fileName = effect.data.file.split('\\').pop().split('/').pop();
        fileName = fileName !== "" ? fileName : "Text: " + effect.data.text.text;
        let effectName = effect.data.name ? `${effect.data.name} (${fileName})` : fileName;
        if(effect.data.creatorUserId !== game.userId){
            effectName += ` (${game.users.get(effect.data.creatorUserId)?.name ?? "Unknown"}'s effect)`
        }

        const el = html`
            <div class="effect hover-highlight">
                <button type="button" class="btn_end"><i class="fas fa-times"></i></button>
                <div class="effect-text hover-text"></div>
            </div>`;

        const endButton = el.querySelector(
            ".btn_end"
        );

        const nameInput = el.querySelector(
            ".effect-text"
        );

        nameInput.innerText = effectName;

        endButton.addEventListener("click", function(e) {
            Sequencer.EffectManager.endEffects({ effects: effect, sceneId: game.user.viewedScene });
        });

        el.addEventListener("mouseover", function() {
            effect.highlight(true);
        });

        el.addEventListener("mouseleave", function() {
            effect.highlight(false);
        });

        return el;
    }

    updateEffects() {

        const effects = Sequencer.EffectManager.effects
            .filter(effect => effect.onCurrentScene && effect.userCanUpdate);

        this.persistentEffectsContainer.empty();
        this.temporaryEffectsContainer.empty();

        this.effectsContainer.toggle(effects.length !== 0);
        this.noEffectsLabel.toggle(effects.length === 0);

        if(effects.length === 0) return;

        const persistentEffects = effects
            .filter(effect => effect.data.persist)
            .map(effect => this.createEffectElement(effect));

        this.persistentEffectsContainer.append(persistentEffects);

        const temporaryEffects = effects
            .filter(effect => !effect.data.persist)
            .map(effect => this.createEffectElement(effect));

        this.temporaryEffectsContainer.append(temporaryEffects);

    }


    /* --------------------------------------------------------------
     *                        EFFECT PLAYER
     * -------------------------------------------------------------- */

    static get activeSettings(){
        const defaultSettings = SequencerEffectsUI.defaultSettingsMap;
        return foundry.utils.mergeObject(defaultSettings,
            this.activeInstance?._settings ?? SequencerEffectsUI.defaultNoninputSettings
        );
    }

    static get defaultSettingsMap(){
        return Object.fromEntries(Object.entries(this.defaultSettings)
            .map(setting => {
                return [setting[0], setting[1].default];
            }));
    }

    static get defaultNoninputSettings(){
        return { file: "", users: ['all'] };
    }

    static get defaultSettings(){
        return {
            "scale": {
                type: "number",
                default: 1.0,
                label: "Scale",
            },
            "belowTokens": {
                type: "checkbox",
                default: false,
                label: "Below Tokens",
            },
            "snapToGrid": {
                type: "checkbox",
                default: false,
                label: "Snap to grid",
                callback: (e) => {
                    SequencerPlayer.snapLocationToGrid = e.target.checked;
                }
            },
            "randomRotation": {
                type: "checkbox",
                default: false,
                label: "Random rotation",
            },
            "randomMirrorY": {
                type: "checkbox",
                default: false,
                label: "Random mirror",
            },
            "randomOffset": {
                type: "checkbox",
                default: false,
                label: "Random offset",
            },
            "repetitions": {
                type: "number",
                default: 1.0,
                label: "Repetitions",
            },
            "repeatDelayMin": {
                type: "number",
                default: 200,
                label: "Delay (min)",
            },
            "repeatDelayMax": {
                type: "number",
                default: 400,
                label: "Delay (max)"
            },
            "preload": {
                type: "checkbox",
                default: false,
                label: "Preload",
            }
        }
    }

    getPlayerData(data) {
        data.defaultSettings = SequencerEffectsUI.defaultSettings;
        data.users = Array.from(game.users);
        data.presets = this.presets;
        return data;
    }

    activatePlayerListeners(html) {

        if(!game.user.isGM) return;

        html.find('.activate-layer').click(() => {
            canvas.sequencerEffectsAboveTokens.activate();
            ui.controls.render();
            ui.controls.control.activeTool = "play-effect";
        });

        const _this = this;

        this.settingsElements = html.find(".setting");

        this.settingsElements.each(function() {

            $(this).change(function(event) {
                const type = $(this).attr("type")
                const settingValue = type === "checkbox" ? $(this).prop("checked") : Number($(this).val());
                _this.setSetting(settingName, settingValue);
            });

            let settingName = $(this).attr("name");
            const setting = SequencerEffectsUI.defaultSettings?.[settingName];
            if(setting?.callback){
                $(this).change(setting.callback.bind(_this));
            }

        });

        this.userSelect = html.find('.user-select');
        this.userSelect.change(function() {
            let selected = $(this).val();
            _this.setSetting('users', selected);
        })

        this.fileInput = html.find('.file-input');
        const autosuggestions = html.find('#dblist');

        const debouncedSearch = debounce(function() {
            _this.showResults(autosuggestions, _this.fileInput.val());
        }, 250);

        debouncedSearch();

        this.fileInput.keyup((e) => {
            debouncedSearch();
        });

        this.fileInput.change(async function(){
            _this.updateFile(_this.fileInput.val());
        });

        this.fileInput.focus(function() {
            debouncedSearch();
        });

        const filepicker = html.find('.custom-file-picker');
        filepicker.click(function() {
            new FilePicker({
                type: "imagevideo",
                displayMode: "tiles",
                callback: async (imagePath) => {
                    fileInput.val(imagePath);
                    _this.updateFile(imagePath);
                }
            }).browse();
        });


        this.presetSelect = html.find('.preset-select');
        this.deletePresetButton = html.find('.delete-preset');
        const applyPresetButton = html.find('.apply-preset');

        applyPresetButton.click(function() {
            _this.applyPreset(_this.presetSelect.val());
        });

        this.presetSelect.change(function() {
            let preset_name = _this.presetSelect.val();
            _this.deletePresetButton.disabled = preset_name === "default" || preset_name === "new";
        })

        this.deletePresetButton.click(function() {
            _this.deletePreset(_this.presetSelect.val());
        });

    }

    async updateFile(inPath){
        if(!(Sequencer.Database.entryExists(inPath) || (await srcExists(inPath)))) return;
        this.setSetting('file', inPath);
    }

    applyPresetData(inSettings){

        const settings = foundry.utils.mergeObject(
            SequencerEffectsUI.defaultSettingsMap,
            inSettings
        );

        this.fileInput.val(settings.file);

        this.userSelect.val(settings.users);

        this.settingsElements.each(function(){
            const settingName = $(this).attr('name');
            const settingType = $(this).attr("type")
            if(settingType === "checkbox"){
                $(this).prop("checked", settings[settingName]);
            }else{
                $(this).val(settings[settingName]);
            }
            $(this).change();
        });

        this._settings = foundry.utils.duplicate(settings);

    }

    reapplySettings(){
        let _this = this;
        setTimeout(() => {
            _this.applyPresetData(_this._settings);
        }, 50);
    }

    setSetting(name, value){
        this._settings[name] = value;
    }

    get presets(){
        return game.settings.get('sequencer', 'effectPresets');
    }

    getPreset(inName){
        if(inName === "default") return SequencerEffectsUI.defaultNoninputSettings;
        return this.presets[inName];
    }

    async applyPreset(inPresetName){
        if(inPresetName === "new"){
            inPresetName = await this.nameNewPreset();
            console.log(inPresetName);
            if(!inPresetName) return;
            await this.createPreset(inPresetName)
            await this.render(true);
            await lib.wait(50);
        }

        const presetData = this.getPreset(inPresetName);

        this.applyPresetData(presetData);

        this._settings['name'] = inPresetName;

        this.presetSelect.val(inPresetName);

        this.deletePresetButton.disabled = inPresetName === "default" || inPresetName === "new";
    }

    async createPreset(inName){
        const presets = this.presets;
        presets[inName] = foundry.utils.duplicate(SequencerEffectsUI.activeSettings);
        await game.settings.set('sequencer', 'effectPresets', presets)
    }

    async deletePreset(inName){
        const presets = this.presets;
        delete presets[inName];
        await game.settings.set('sequencer', 'effectPresets', presets)
        await this.render(true);
    }

    async nameNewPreset(inName = ""){

        let presetName = await new Promise((resolve) => {
            let rejected = false;
            new Dialog({
                title: "Create new Sequencer effect preset",
                content: `<p><input type="text" placeholder="Input new preset name" id="newPresetName" style="width:100%;"></p>`,
                buttons: {
                    okay: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Okay',
                        callback: async (html) => {
                            let name = html.find('#newPresetName').val();

                            if(name === "" || !name){
                                name = false;
                                rejected = true;
                            }

                            resolve(name);

                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => {
                            rejected = true;
                            resolve(false);
                        }
                    }
                },
                close: () => {

                },
                render: (html) => {
                    html.find('#newPresetName').val(inName).focus();
                }
            }).render(true);
        });

        if(this.presets[presetName]){

            const overwrite = await Dialog.confirm({
                title: "Overwrite preset?",
                content: `<p>Are you sure you want to overwrite the "${presetName}" preset?</p>`
            });

            if(!overwrite){
                presetName = await this.nameNewPreset(presetName);
            }
        }

        return presetName;
    }

    showResults(autosuggestions, input) {

        if(this.lastSearch === input) return;

        this.lastSearch = input;

        let results = Sequencer.Database.searchFor(input);

        if(this.lastResults.equals(results)) return;

        autosuggestions.innerHTML = "";

        this.lastResults = foundry.utils.duplicate(results);

        if (results.length === 1 && input === results[0]) return;

        if (results.length > 100) {
            results = results.slice(0, 100);
        }

        let frag = document.createDocumentFragment();

        results.forEach(entry => {
            const option = document.createElement('option');
            option.value = entry;
            frag.appendChild(option)
        });

        autosuggestions.append(frag);

    }

}