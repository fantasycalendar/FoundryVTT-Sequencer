import * as lib from "../lib/lib.js";
import { reactiveEl as html } from "../lib/html.js";
import SequencerPlayer from "../sequencer-effect-player.js";
import CONSTANTS from "../constants.js";

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
            title: game.i18n.localize("SEQUENCER.Effects"),
            template: `modules/sequencer/templates/sequencer-effects-template.html`,
            classes: ["dialog"],
            width: "auto",
            height: 640,
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

        if(tab === "player"){
            activeApp.promptPermissionsWarning();
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
        data.userIsGM = game.user.isGM;
        data.canCreateEffects = lib.userCanDo("permissions-effect-create");
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

        html.find(".end-all-effects").click(function() {
            Sequencer.EffectManager.endAllEffects();
        });
    }

    createEffectElement(effect){

        let fileName = effect.data.file.split('\\').pop().split('/').pop();
        fileName = fileName !== "" ? fileName : "Text: " + effect.data.text.text;
        let effectName = effect.data.name ? `${effect.data.name} (${fileName})` : fileName;
        if(effect.data.creatorUserId !== game.userId){
            let user_name = game.users.get(effect.data.creatorUserId)?.name;
            let formattedUsername = (user_name
                ? game.i18n.format("SEQUENCER.ManagerPlayersEffect", { user_name })
                : game.i18n.localize("SEQUENCER.ManagerUnknownEffect"));
            effectName += ` (${formattedUsername})`;
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
            .filter(effect => effect.onCurrentScene && effect.userCanDelete);

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
                label: game.i18n.localize("SEQUENCER.PlayerOptionScale"),
            },
            "belowTokens": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionBelowTokens"),
            },
            "snapToGrid": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionSnapToGrid"),
                callback: (e) => {
                    SequencerPlayer.snapLocationToGrid = e.target.checked;
                }
            },
            "randomRotation": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionRandomRotation"),
            },
            "randomMirrorY": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionRandomMirrorY"),
            },
            "randomOffset": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionRandomOffset"),
            },
            "repetitions": {
                type: "number",
                default: 1.0,
                label: game.i18n.localize("SEQUENCER.PlayerOptionRepetitions"),
            },
            "repeatDelayMin": {
                type: "number",
                default: 200,
                label: game.i18n.localize("SEQUENCER.PlayerOptionDelayMin"),
            },
            "repeatDelayMax": {
                type: "number",
                default: 400,
                label: game.i18n.localize("SEQUENCER.PlayerOptionDelayMax"),
            },
            "preload": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionPreload"),
            },
            "moveTowards": {
                type: "checkbox",
                default: false,
                label: game.i18n.localize("SEQUENCER.PlayerOptionDragBehavior"),
            },
            "moveSpeed": {
                type: "number",
                default: 0,
                label: game.i18n.localize("SEQUENCER.PlayerOptionMoveSpeed"),
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

        if(!lib.userCanDo("permissions-effect-create")) return;

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
                    _this.fileInput.val(imagePath);
                    _this.updateFile(imagePath);
                }
            }).browse();
        });

        this.presetSelect = html.find('.preset-select');
        this.deletePresetButton = html.find('.delete-preset');
        const savePresetButton = html.find('.save-preset');

        savePresetButton.click(function() {
            const preset_name = _this.presetSelect.val();
            if(preset_name === "default"){
                _this.newPreset();
            }else{
                $(this).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
                _this.savePreset(preset_name);
            }
        });

        this.copyPresetButton = html.find('.copy-preset');
        this.copyPresetButton.click(function() {
            $(this).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
            _this.newPreset(true);
        });

        this.presetSelect.change(async function() {
            const preset_name = _this.presetSelect.val();
            const activeSettings = SequencerEffectsUI.activeSettings;
            if(activeSettings?.name && preset_name !== activeSettings?.name && activeSettings?.name !== "default"){
                const preset = _this.getPreset(activeSettings.name);
                const diff = foundry.utils.diffObject(preset, SequencerEffectsUI.activeSettings);
                delete diff['name'];
                if(Object.keys(diff).length){
                    $(this).val(activeSettings.name);
                    const doSwitch = await Dialog.confirm({
                        title: game.i18n.localize("SEQUENCER.PlayerApplyPresetTitle"),
                        content: `<p>${game.i18n.format("SEQUENCER.PlayerApplyPresetContent", { preset_name })}</p>`
                    });
                    if(!doSwitch){
                        return;
                    }
                    $(this).val(preset_name);
                }
            }
            _this.applyPreset(preset_name);
        })

        this.deletePresetButton.click(async function() {
            _this.deletePreset(_this.presetSelect.val());
        });

        html.find('.open-module-settings').click(function(){
            _this.renderPermissionsConfig();
        });

    }

    promptPermissionsWarning() {
        if(!game.user.isGM || game.settings.get(CONSTANTS.MODULE_NAME, "effect-tools-permissions-tools-warning")) return;

        const content = `<p>${ game.i18n.localize("SEQUENCER.PlayerPermissionsWarning") }</p><p><button type="button" class="w-100 open-module-settings"><i class="fas fa-plug"></i> Open Module Settings</button></p>`
        Dialog.prompt({
            title: "Sequencer Permissions",
            content: content,
            rejectClose: false,
            label: game.i18n.localize('SEQUENCER.OK'),
            callback: () => {
                game.settings.set(CONSTANTS.MODULE_NAME, "effect-tools-permissions-tools-warning", true)
            },
            render: (html) => {
                const thisDialog = html.closest('.app.window-app.dialog').attr('id').split("-")[1];
                const _this = this;
                html.find('.open-module-settings').click(function(){
                    _this.renderPermissionsConfig();
                    ui.windows[thisDialog].close();
                });
            }
        })
    }

    async renderPermissionsConfig() {

        game.settings.set(CONSTANTS.MODULE_NAME, "effect-tools-permissions-tools-warning", true);

        const settings = new SettingsConfig().render(true);

        settings._tabs[0].active = "modules";

        await lib.wait(250);

        const settingsList = $(settings.element).find(".settings-list");
        const settingToScrollTo = settingsList.find('select[name="sequencer.permissions-sidebar-tools"]').parent().parent();
        await lib.scrollToElement(settingsList, settingToScrollTo);
        await lib.highlightElement(settingToScrollTo, { duration: 2500 });

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
        let presets = game.settings.get('sequencer', 'effectPresets');
        for(let [name, preset] of Object.entries(presets)){
            presets[name] = foundry.utils.mergeObject(SequencerEffectsUI.defaultSettingsMap, preset);
        }
        return presets;
    }

    getPreset(inName){
        if(inName === "default") return SequencerEffectsUI.defaultNoninputSettings;
        return this.presets[inName];
    }

    async applyPreset(inPresetName){
        const presetData = this.getPreset(inPresetName);

        this.applyPresetData(presetData);

        this._settings['name'] = inPresetName;

        this.presetSelect.val(inPresetName);

        this.deletePresetButton.prop("disabled", inPresetName === "default");
        this.copyPresetButton.prop("disabled", inPresetName === "default");
    }

    async savePreset(inName){
        const presets = this.presets;
        presets[inName] = foundry.utils.duplicate(SequencerEffectsUI.activeSettings);
        await game.settings.set('sequencer', 'effectPresets', presets)
    }

    async deletePreset(inName){

        const doDelete = await Dialog.confirm({
            title: game.i18n.localize("SEQUENCER.PlayerDeletePresetTitle"),
            content: `<p>${game.i18n.format("SEQUENCER.PlayerDeletePresetContent", { preset_name: inName })}</p>`
        });
        if(!doDelete) return;

        const presets = this.presets;
        delete presets[inName];
        await game.settings.set('sequencer', 'effectPresets', presets)
        await this.render(true);
    }

    async newPreset(copy){
        const presetName = await this.promptPresetName(copy);
        if(!presetName) return;
        await this.savePreset(presetName)
        await this.render(true);
        await lib.wait(50);
        this.applyPreset(presetName);
    }

    async promptPresetName(copy = false, inName = ""){

        let title = copy
            ? game.i18n.localize("SEQUENCER.PlayerCopyPresetTitle")
            : game.i18n.localize("SEQUENCER.PlayerCreateNewPresetTitle");

        let presetName = await new Promise((resolve) => {
            let rejected = false;
            new Dialog({
                title: title,
                content: `<p><input type="text" placeholder="${game.i18n.localize("SEQUENCER.PlayerCreateNewPresetInputLabel")}" id="newPresetName" style="width:100%;"></p>`,
                buttons: {
                    okay: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize("SEQUENCER.OK"),
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
                        label: game.i18n.localize("SEQUENCER.Cancel"),
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

        if(presetName) {

            if (presetName.toLowerCase() === "default") {
                Dialog.prompt({
                    title: game.i18n.localize("SEQUENCER.PlayerDefaultErrorTitle"),
                    content: `<p>${game.i18n.localize("SEQUENCER.PlayerDefaultErrorContent")}</p>`,
                    label: game.i18n.localize("SEQUENCER.OK"),
                    callback: () => {}
                });
                return false;
            }

            if (this.presets[presetName]) {

                const overwrite = await Dialog.confirm({
                    title: game.i18n.localize("SEQUENCER.PlayerOverwritePresetTitle"),
                    content: `<p>${game.i18n.format("SEQUENCER.PlayerOverwritePresetContent", { preset_name: presetName })}</p>`
                });

                if (!overwrite) {
                    presetName = await this.promptPresetName(copy, presetName);
                }

            }
        }

        return presetName;
    }

    showResults(autosuggestions, input) {

        if(this.lastSearch === input) return;

        this.lastSearch = input;

        let results = Sequencer.Database.searchFor(input);

        if(this.lastResults.equals(results)) return;

        autosuggestions.html("");

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