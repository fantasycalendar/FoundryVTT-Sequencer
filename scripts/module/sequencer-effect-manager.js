import CanvasEffect from "./canvas-effects/canvas-effect.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "./lib/lib.js";
import SequencerEffectsUI from "./formapplications/sequencer-effects-ui.js";
import flagManager from "./flag-manager.js";
import CONSTANTS from "./constants.js";

const EffectsContainer = new Map();

export default class SequencerEffectManager {

    /**
     * Returns all of the currently running effects on the canvas
     *
     * @returns {Array}
     */
    static get effects(){
        return Array.from(EffectsContainer.values());
    }

    /**
     * Opens the Sequencer Effects UI with the effects tab open
     *
     * @returns {SequencerEffectsUI}
     */
    static show(){
        return SequencerEffectsUI.show({ tab: "manager" });
    }

    /**
     * Play an effect on the canvas.
     *
     * @param {object} data The data that describes the audio to play
     * @param {boolean} [push=true] A flag indicating whether or not to make other clients play the effect
     * @returns {CanvasEffect} A CanvasEffect object
     */
    static async play(data, push = true) {
        if(!lib.user_can_do("permissions-effect-create")) return;
        if (push) sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_EFFECT, data);
        return this._playEffect(data);
    }

    /**
     * Get effects that is playing on the canvas based on a set of filters
     *
     * @param {object} inData An object containing filters that determine which effects to return
     *                             - object: An ID or a PlaceableObject
     *                             - name: The name of the effect
     *                             - sceneId: the ID of the scene to search within
     *                             - effects: a single CanvasEffect or its ID, or an array of such
     * @returns {Array} An array containing effects that match the given filter
     */
    static getEffects(inData = {}){
        const filters = this._validateFilters(inData);
        return this._filterEffects(filters);
    }

    /**
     * End effects that is playing on the canvas based on a set of filters
     *
     * @param {object} inData An object containing filters that determine which effects to end
     *                             - object: An ID or a PlaceableObject
     *                             - name: The name of the effect
     *                             - sceneId: the ID of the scene to search within
     *                             - effects: a single CanvasEffect or its ID, or an array of such
     * @param {boolean} [push=true] A flag indicating whether or not to make other clients end the effects
     * @returns {Promise} A promise that resolves when the effects have ended
     */
    static async endEffects(inData = {}, push = true) {
        inData = this._validateFilters(inData);
        if (!inData) throw lib.custom_error("Sequencer", "EffectManager | endEffects | Incorrect or incomplete parameters provided")
        const effectsToEnd = this._filterEffects(inData).filter(effect => effect.userCanDelete).map(effect => effect.id);
        if (!effectsToEnd.length) return;
        if (push) sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_EFFECTS, effectsToEnd);
        return this._endEffects(effectsToEnd);
    }

    /**
     * End all effects that are playing on the canvas
     *
     * @param {string} [inSceneId] A parameter which determines which scene to end all effects on, defaults to current viewed scene
     * @param {boolean} [push=true] A flag indicating whether or not to make other clients end all effects
     * @returns {Promise} A promise that resolves when all of the effects have ended
     */
    static async endAllEffects(inSceneId = game.user.viewedScene, push = true) {
        const inData = this._validateFilters({ sceneId: inSceneId });
        const effectsToEnd = this._filterEffects(inData).filter(effect => effect.userCanDelete).map(effect => effect.id);
        if (!effectsToEnd.length) return;
        if (push) sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_EFFECTS, effectsToEnd);
        return this._endEffects(effectsToEnd);
    }

    /**
     * Filters the existing effects based on the given filter
     *
     * @param inData
     * @returns {array}
     * @private
     */
    static _filterEffects(inData){
        if(inData.name){
            inData.name = new RegExp(lib.str_to_search_regex_str(inData.name), "gu");
        }
        return this.effects
            .filter(effect => !inData.effects || inData.effects.includes(effect.id))
            .filter(effect => !inData.name || effect.entry.match(inData.name)?.length)
            .filter(effect => !inData.source || inData.source === effect.data.source)
            .filter(effect => !inData.target || inData.target === effect.data.target)
            .filter(effect => !inData.sceneId || inData.sceneId === effect.data.sceneId)
            .filter(effect => !inData.origin || inData.origin === effect.data.origin);
    }

    /**
     * Validates an object actually exists, and gets its UUID
     *
     * @param object
     * @param sceneId
     * @returns {string}
     * @private
     */
    static _validateObject(object, sceneId){

        if (!(object instanceof PlaceableObject || typeof object === "string")) {
            throw lib.custom_error("Sequencer", "EffectManager | object must be instance of PlaceableObject or of type string")
        } else if (object instanceof PlaceableObject) {
            object = lib.get_object_identifier(object);
        } else if (typeof object === "string") {
            if (!lib.get_object_from_scene(object, sceneId)) {
                throw lib.custom_error("Sequencer", `EffectManager | could not find object with ID: ${object}`)
            }
        }

        return object;
    }

    /**
     * Validates the filter given to any of the above public methods
     *
     * @param inData
     * @returns {boolean}
     * @private
     */
    static _validateFilters(inData){

        if (inData?.sceneId) {
            if (typeof inData.sceneId !== "string") throw lib.custom_error("Sequencer", "EffectManager | inData.sceneId must be of type string")
            if (!game.scenes.get(inData.sceneId)) throw lib.custom_error("Sequencer", "EffectManager | inData.sceneId must be a valid scene id (could not find scene)")
        }

        if (inData?.object) {
            inData.source = this._validateObject(inData.object, inData.sceneId);
            inData.target = inData.source;
            delete inData.object;
        }

        if (inData?.source) {
            inData.source = this._validateObject(inData.source, inData.sceneId);
        }

        if (inData?.target) {
            inData.target = this._validateObject(inData.target, inData.sceneId);
        }

        if (inData?.name && typeof inData?.name !== "string") throw lib.custom_error("Sequencer", "EffectManager | inData.name must be of type string")
        if (inData?.origin && typeof inData?.origin !== "string") throw lib.custom_error("Sequencer", "EffectManager | inData.origin must be of type string")

        if(inData?.effects){
            if (!Array.isArray(inData.effects)) inData.effects = [inData.effects];
            inData.effects = inData.effects.map(effect => {
                if(!(typeof effect === "string" || effect instanceof CanvasEffect)) throw lib.custom_error("Sequencer", "EffectManager | collections in inData.effects must be of type string or CanvasEffect")
                if(effect instanceof CanvasEffect) return effect.id;
                return effect;
            })
        }

        if (!inData.name && !inData.origin && !inData.target && !inData.sceneId && !inData.effects && !inData.origin) return false;

        return foundry.utils.mergeObject({
            effects: false,
            name: false,
            source: false,
            target: false,
            sceneId: game.user.viewedScene,
            origin: false
        }, inData);

    }

    /**
     * Actually plays the effect on the canvas
     *
     * @param data
     * @param setFlags
     * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}>}
     * @private
     */
    static async _playEffect(data, setFlags = true) {

        const effect = CanvasEffect.make(data);

        const playData = await effect.play();

        if (data.persist && setFlags && effect.context){
            flagManager.addFlags(effect.context, effect);
        }

        EffectsContainer.set(effect.id, effect);

        if (!data.persist) {
            playData.promise.then(() => this._removeEffect(effect));
        }

        debounceUpdateEffectViewer();

        return playData;
    }

    /**
     * Sets up persisting effects when the scene is first loaded
     *
     * @returns {Promise}
     * @private
     */
    static _setUpPersists() {
        this._tearDownPersists();
        const allObjects = lib.get_all_objects();
        allObjects.push(canvas.scene);
        let promises = allObjects.map(obj => {
            const document = lib.validate_document(obj);
            let objEffects = document.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME) ?? [];
            return this._playEffectMap(objEffects, document);
        }).flat();
        debounceUpdateEffectViewer();
        return Promise.all(promises).then(() => {
            Hooks.call("sequencerEffectManagerReady");
        });
    }

    /**
     * Tears down persisting effects when the scene is unloaded
     *
     * @param inId
     * @private
     */
    static _tearDownPersists(inId) {
        this.effects
            .filter(effect => !inId || effect.data?.source === inId || effect.data?.target === inId)
            .forEach(effect => {
                EffectsContainer.delete(effect.id);
                debounceUpdateEffectViewer();
            })
    }

    /**
     * Patches an object's creation data before it's created so that the effect plays on it correctly
     *
     * @param inDocument
     * @returns {*}
     * @private
     */
    static _patchCreationData(inDocument){

        let effects = inDocument.data.flags.sequencer.effects;

        effects = effects.map(effect => {
            let effectData = effect[1].data;

            if(effectData.attachTo || lib.is_UUID(effectData.source)){
                effectData.source = lib.get_object_identifier(inDocument);
            }

            effectData.sceneId = canvas.scene.id;

            effect[1].data = effectData;
            return effect;
        });

        this._playEffectMap(effects, inDocument);

        debounceUpdateEffectViewer();

        return effects;

    }

    /**
     * Plays multiple effects at the same time
     *
     * @param inEffects
     * @param inDocument
     * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}[]>}
     * @private
     */
    static _playEffectMap(inEffects, inDocument){
        if(inEffects instanceof Map) inEffects = Array.from(inEffects);
        inEffects = inEffects.filter(effect => effect.shouldPlay);
        return Promise.all(inEffects.map(effect => {
            return this._playEffect(effect[1], false)
                .then((result) => {
                    if(!result) flagManager.removeFlags(inDocument, effect);
                })
                .catch(() => {
                    flagManager.removeFlags(inDocument, effect)
                });
        }));
    }

    /**
     * Ends multiple effects by ID
     *
     * @param inEffectIds
     * @returns {Promise<boolean|any>}
     * @private
     */
    static _endEffects(inEffectIds) {
        const effects = inEffectIds.map(id => EffectsContainer.get(id));
        if (!effects.length) return;
        return this._endManyEffects(effects);
    }

    /**
     * Ends one or many effects at the same time, returning a promise that resolves once every effect has fully ended
     *
     * @param inEffects
     * @returns {Promise}
     * @private
     */
    static async _endManyEffects(inEffects = false) {

        const effectsToEnd = (inEffects || this.effects);

        const effectsByObjectId = Object.values(lib.group_by(effectsToEnd, "context.id"));

        if(!effectsByObjectId.length) return true;

        effectsByObjectId.forEach(effects => {
            effects = effects.filter(effect => effect.data.persist)
            if(effects.length) flagManager.removeFlags(effects[0].context, effects, !inEffects)
        });

        return Promise.allSettled(...effectsByObjectId.map(
            effects => effects.map(effect => this._removeEffect(effect))
        ));

    }

    /**
     * Removes the effect from the manager and ends it, returning a promise that resolves once the effect has fully ended
     *
     * @param effect
     * @returns {Promise}
     * @private
     */
    static _removeEffect(effect) {
        EffectsContainer.delete(effect.id);
        debounceUpdateEffectViewer();
        return effect.endEffect();
    }
}

const debounceUpdateEffectViewer = debounce(async () => {
    if(!SequencerEffectsUI.isVisible) return;
    SequencerEffectsUI.activeInstance.updateEffects();
}, 100);