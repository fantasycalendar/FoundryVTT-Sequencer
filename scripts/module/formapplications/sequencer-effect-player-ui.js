import { waitFor } from "../lib/lib.js";

export default class SequencerEffectPlayerUI extends FormApplication {

    constructor(dialogData = {}, options = {}) {
        super(dialogData, options);
        this._settings = duplicate(SequencerEffectPlayerUI.defaultNoninputSettings);
        this.settingsElements = [];
        this.presetSelect = undefined;
        this.deletePresetButton = undefined;
        this.fileInput = undefined;
        this.userSelect = undefined;
    }

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Sequencer Effect Player",
            template: "modules/sequencer/templates/sequencer-effect-player-template.html",
            classes: ["dialog"],
            width: 240,
            height: 555,
            // left: 122,
            // top: 63,
            resizable: false
        });
    }

    static show(inFocus) {
        if (!game.user.isTrusted) return;
        for (let app of Object.values(ui.windows)) {
            if (app instanceof this) {
                return app.render(false, { focus: inFocus });
            }
        }
        return new this().render(true);
    }

    static get isVisible() {
        return this.activeInstance !== undefined;
    }

    static get activeInstance(){
        for (let app of Object.values(ui.windows)) {
            if (app instanceof this) return app;
        }
    }

    static get activeSettings(){
        const defaultSettings = SequencerEffectPlayerUI.defaultSettingsMap;
        return foundry.utils.mergeObject(defaultSettings,
            this.activeInstance?._settings ?? SequencerEffectPlayerUI.defaultNoninputSettings
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
            "preload": {
                type: "checkbox",
                default: false,
                label: "Preload",
            },
            "persist": {
                type: "checkbox",
                default: false,
                label: "Persist",
            },
            "belowTokens": {
                type: "checkbox",
                default: false,
                label: "Below Tokens",
            },
            "attachTo": {
                type: "checkbox",
                default: false,
                label: "Attach to token",
            },
            "snapToGrid": {
                type: "checkbox",
                default: false,
                label: "Snap to grid",
                callback: (e) => {
                    canvas.sequencerEffectsAboveTokens.snapLocationToGrid = e.target.checked;
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
        }
    }

    /* -------------------------------------------- */

    applySettings(inPresetName){

        const preset = foundry.utils.mergeObject(
            SequencerEffectPlayerUI.defaultSettingsMap,
            this.getPreset(inPresetName)
        );

        this.fileInput.value = preset.file;

        for(let option of this.userSelect.options){
            option.selected = preset.users.includes(option.value)
        }

        this.settingsElements.forEach(settingElement => {
            const name = settingElement.getAttribute('name');
            const type = settingElement.getAttribute("type")
            if(type === "checkbox"){
                settingElement.checked = preset[name];
            }else{
                settingElement.value = preset[name];
            }
            settingElement.dispatchEvent(new Event('change'));
        });

        this._settings = foundry.utils.duplicate(preset);

        this._settings['name'] = inPresetName;

        this.presetSelect.value = inPresetName;

        this.deletePresetButton.disabled = inPresetName === "default" || inPresetName === "new";

    }

    setSetting(name, value){
        this._settings[name] = value;
    }

    /** @override */
    getData() {
        let data = super.getData();

        data.defaultSettings = SequencerEffectPlayerUI.defaultSettings;
        data.users = Array.from(game.users);
        data.presets = this.presets;

        return data;
    }

    /** @override */
    activateListeners($html) {
        super.activateListeners($html);

        const _this = this;

        const [html] = $html;

        this.settingsElements = html.querySelectorAll(".setting");

        this.settingsElements.forEach(element => {

            element.addEventListener('change', (e) => {
                const type = e.target.getAttribute("type")
                const settingValue = type === "checkbox" ? e.target.checked : Number(e.target.value);
                _this.setSetting(settingName, settingValue);
            });

            let settingName = element.getAttribute("name");
            const setting = SequencerEffectPlayerUI.defaultSettings?.[settingName];
            if(setting?.callback){
                element.addEventListener('change', setting.callback.bind(_this));
            }

        });

        this.userSelect = html.querySelector('.user-select');
        this.userSelect.addEventListener('change', (e) => {
            let selected = [..._this.userSelect.options]
                .filter(option => option.selected)
                .map(option => option.value);
            _this.setSetting('users', selected);
        })

        this.fileInput = html.querySelector('.file-input');
        const autosuggestions = html.querySelector('#dblist');

        const debouncedSearch = debounce(() => {
            _this.showResults(autosuggestions, _this.fileInput.value);
        }, 150);

        this.fileInput.addEventListener('keyup', (e) => {
            debouncedSearch();
        });

        this.fileInput.addEventListener('change', async (e) => {
            _this.updateFile(_this.fileInput.value);
        });

        this.fileInput.addEventListener('focus', (e) => {
            debouncedSearch();
        });

        const filepicker = html.querySelector('.custom-file-picker');
        filepicker.addEventListener('click', (e) => {
            new FilePicker({
                type: "imagevideo",
                displayMode: "tiles",
                callback: async (imagePath) => {
                    fileInput.value = imagePath;
                    _this.updateFile(imagePath);
                }
            }).browse();
        });


        this.presetSelect = html.querySelector('.preset-select');
        this.deletePresetButton = html.querySelector('.delete-preset');
        const applyPresetButton = html.querySelector('.apply-preset');

        applyPresetButton.addEventListener('click', (e) => {
            _this.applyPreset(_this.presetSelect.value);
        });

        this.presetSelect.addEventListener('change', () => {
            let preset_name = _this.presetSelect.value;
            _this.deletePresetButton.disabled = preset_name === "default" || preset_name === "new";
        })

        this.deletePresetButton.addEventListener('click', (e) => {
            _this.deletePreset(_this.presetSelect.value);
        });

    }

    async applyPreset(inPresetName){
        if(inPresetName === "new"){
            inPresetName = await this.nameNewPreset();
            if(!inPresetName) return;
            await this.createPreset(inPresetName)
            await this.render(true);
            await waitFor(50);
        }
        this.applySettings(inPresetName);
    }

    get presets(){
        return game.settings.get('sequencer', 'effectPresets');
    }

    async createPreset(inName){
        const presets = this.presets;
        presets[inName] = SequencerEffectPlayerUI.activeSettings;
        await game.settings.set('sequencer', 'effectPresets', presets)
    }

    async deletePreset(inName){
        const presets = this.presets;
        delete presets[inName];
        await game.settings.set('sequencer', 'effectPresets', presets)
        await this.render(true);
    }

    getPreset(inName){
        if(inName === "default") return SequencerEffectPlayerUI.defaultNoninputSettings;
        return this.presets[inName]
    }

    nameNewPreset(){
        return new Promise((resolve) => {
            let rejected = false;
            new Dialog({
                title: "Create new Sequencer effect preset",
                content: `<input type="text" placeholder="Input new preset name" id="newPresetName">`,
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Okay',
                        callback: (html) => {
                            let name = html.find('#newPresetName').val();
                            if(name === ""){
                                name = false;
                                rejected = true;
                            }
                            resolve(name);
                        }
                    },
                    dont_remind: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel",
                        callback: () => {
                            rejected = true;
                            resolve(false);
                        }
                    }
                },
                close: () => {
                    if(!rejected) resolve(false);
                }
            }).render(true);
        });
    }

    async updateFile(inPath){
        if(!(Sequencer.Database.entryExists(inPath) || (await srcExists(inPath)))) return;
        this.setSetting('file', inPath);
    }

    showResults(autosuggestions, input) {

        const results = Sequencer.Database.getPathsUnder(input, {
            full: true,
            softFail: true,
            includeFt: false
        });

        autosuggestions.innerHTML = "";

        if(results.length === 1) return;

        results.forEach(entry => {
            const option = document.createElement('option');
            option.value = entry;
            autosuggestions.appendChild(option);
        });

    }

    close(options){
        super.close(options)
        canvas.sequencerEffectsAboveTokens.snapLocationToGrid = false;
    }

}