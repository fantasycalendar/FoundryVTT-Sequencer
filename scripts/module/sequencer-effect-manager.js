import CanvasEffect from "./canvas-effects/canvas-effect.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "./lib/lib.js";
import SequencerEffectsUI from "./formapplications/sequencer-effects-ui.js";

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
        if(!game.user.can("SEQUENCER_EFFECT_CREATE")) return;
        if (push) emitSocketEvent(SOCKET_HANDLERS.PLAY_EFFECT, data);
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
        if (!inData) throw lib.throwError("SequencerEffectManager", "endEffects | Incorrect or incomplete parameters provided")
        const effectsToEnd = this._filterEffects(inData).filter(effect => effect.userCanDelete).map(effect => effect.data.id);
        if (!effectsToEnd.length) return;
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_EFFECTS, effectsToEnd);
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
        const effectsToEnd = this._filterEffects(inData).filter(effect => effect.userCanDelete).map(effect => effect.data.id);
        if (!effectsToEnd.length) return;
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_EFFECTS, effectsToEnd);
        return this._endEffects(effectsToEnd);
    }

    static _filterEffects(inData){
        return this.effects
            .filter(effect => !inData.effects || inData.effects.includes(effect.data.id))
            .filter(effect => !inData.name || inData.name === effect.data.name)
            .filter(effect => !inData.attachTo || inData.attachTo === effect.data.attachTo)
            .filter(effect => !inData.sceneId || inData.sceneId === effect.data.sceneId)
            .filter(effect => !inData.origin || inData.origin === effect.data.origin);
    }

    static _validateFilters(inData){

        if (inData?.object) {
            if (!(inData.object instanceof PlaceableObject || typeof inData.object === "string")) {
                throw lib.throwError("SequencerEffectManager", "inData.object must be instance of PlaceableObject or of type string")
            } else if (inData.object instanceof PlaceableObject) {
                inData.attachTo = inData.object.id;
            } else if (typeof inData.object === "string") {
                if (!lib.getObjectFromScene(inData.object)) {
                    throw lib.throwError("SequencerEffectManager", `could not find object with ID: ${inData.object}`)
                }
                inData.attachTo = inData.object;
            }
            delete inData.object;
        }

        if (inData?.name && typeof inData?.name !== "string") throw lib.throwError("SequencerEffectManager", "inData.name must be of type string")
        if (inData?.origin && typeof inData?.origin !== "string") throw lib.throwError("SequencerEffectManager", "inData.origin must be of type string")
        if (inData?.sceneId) {
            if (typeof inData.sceneId !== "string") throw lib.throwError("SequencerEffectManager", "inData.sceneId must be of type string")
            if (!game.scenes.get(inData.sceneId)) throw lib.throwError("SequencerEffectManager", "inData.sceneId must be a valid scene id (could not find scene)")
        }

        if(inData?.effects){
            if (!Array.isArray(inData.effects)) inData.effects = [inData.effects];
            inData.effects = inData.effects.map(effect => {
                if(!(typeof effect === "string" || effect instanceof CanvasEffect)) throw lib.throwError("SequencerEffectManager", "entries in inData.effects must be of type string or CanvasEffect")
                if(effect instanceof CanvasEffect) return effect.data.id;
                return effect;
            })
        }

        if (!inData.name && !inData.attachTo && !inData.sceneId && !inData.effects && !inData.origin) return false;

        return foundry.utils.mergeObject({
            effects: false,
            name: false,
            attachTo: false,
            sceneId: game.user.viewedScene,
            origin: false
        }, inData);

    }

    static async _playEffect(data, setFlags = true) {

        const effect = CanvasEffect.make(data);

        if (!effect.context) return false;

        const playData = await effect.play();

        if (data.persist && setFlags && effect.context?.id){
            flagManager.addFlags(effect.contextDocument, effect);
        }

        if(data.persist && !effect.context?.id){
            effect.timeoutRemove();
        }

        EffectsContainer.set(effect.data.id, effect);

        if (!data.persist) {
            playData.promise.then(() => this._removeEffect(effect));
        }

        debounceUpdateEffectViewer();

        return playData;
    }

    static _setUpPersists() {
        this._tearDownPersists();
        const allObjects = lib.getAllObjects();
        allObjects.push(canvas.scene);
        let promises = allObjects.map(obj => {
            const doc = obj?.document ?? obj;
            let objEffects = doc.getFlag('sequencer', 'effects') ?? [];
            objEffects = objEffects.map(effect => {
                if(effect[1].attachTo) effect[1].attachTo = doc.object.id;
                return effect;
            });
            return this._playEffectMap(objEffects, doc);
        }).flat();
        debounceUpdateEffectViewer();
        return Promise.all(promises).then(() => {
            Hooks.call("sequencerEffectManagerReady");
        });
    }

    static _tearDownPersists(inId) {
        this.effects
            .filter(effect => !inId || effect.data?.attachTo === inId)
            .forEach(effect => {
                EffectsContainer.delete(effect.data.id);
                debounceUpdateEffectViewer();
            })
    }

    static _patchCreationData(inDocument){

        let effects = inDocument.data.flags.sequencer.effects ?? [];

        effects = effects.map(effect => {
            if(effect[1].attachTo) effect[1].attachTo = inDocument.object.id;
            return effect;
        });

        this._playEffectMap(effects, inDocument);

        debounceUpdateEffectViewer();

        return effects;

    }

    static _playEffectMap(inEffects, inDocument){
        if(inEffects instanceof Map) inEffects = Array.from(inEffects);
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

    static _removeEffect(effect) {
        EffectsContainer.delete(effect.data.id);
        debounceUpdateEffectViewer();
        return effect.endEffect();
    }

    static _endEffects(inEffectIds) {

        let effects = inEffectIds.map(id => EffectsContainer.get(id));

        if (!effects.length) return;

        return this._endManyEffects(effects);

    }

    static async _endManyEffects(inEffects = false) {

        const effectsToEnd = (inEffects || this.effects);

        const effectsByObjectId = Object.values(lib.groupBy(effectsToEnd, "context.id"));

        if(!effectsByObjectId.length) return true;

        effectsByObjectId.forEach(effects => {
            effects = effects.filter(effect => effect.data.persist)
            if(effects.length) flagManager.removeFlags(effects[0].contextDocument, effects, !inEffects)
        });

        return Promise.allSettled(...effectsByObjectId.map(
            effects => effects.map(effect => this._removeEffect(effect))
        ));

    }
}

const debounceUpdateEffectViewer = debounce(async () => {
    if(!SequencerEffectsUI.isVisible) return;
    SequencerEffectsUI.activeInstance.updateEffects();
}, 100);

const flagManager = {

    flagAddBuffer: new Map(),
    flagRemoveBuffer: new Map(),

    addFlags: (inObject, inEffects) => {

        if (!lib.isResponsibleGM()) return;

        if(!inObject?.id) return;

        if (!Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagAddBuffer.get(inObject.id) ?? { obj: inObject, effects: [] };

        flagsToSet.effects.push(...inEffects);

        flagManager.flagAddBuffer.set(inObject.id, flagsToSet);

        flagManager.updateFlags();

    },

    removeFlags: (inObject, inEffects, removeAll) => {

        if (!lib.isResponsibleGM()) return;

        if(!inObject?.id) return;

        if (inEffects && !Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagRemoveBuffer.get(inObject.id) ?? { obj: inObject, effects: [], removeAll: removeAll };

        if(inEffects) flagsToSet.effects.push(...inEffects);

        flagManager.flagRemoveBuffer.set(inObject.id, flagsToSet);
        
        flagManager.updateFlags();

    },

    updateFlags: debounce(async () => {

        let flagsToAdd = Array.from(flagManager.flagAddBuffer);
        let flagsToRemove = Array.from(flagManager.flagRemoveBuffer);

        flagManager.flagAddBuffer.clear();
        flagManager.flagRemoveBuffer.clear();

        let objects = new Set([...flagsToAdd.map(effect => effect[0]), ...flagsToRemove.map(effect => effect[0])])

        flagsToAdd = new Map(flagsToAdd);
        flagsToRemove = new Map(flagsToRemove);

        for(let objectId of objects) {

            let toAdd = flagsToAdd.get(objectId) ?? { effects: [] };
            let toRemove = flagsToRemove.get(objectId) ?? { effects: [], removeAll: false };

            let obj = toAdd.obj ?? toRemove.obj;

            if (toRemove?.removeAll) {
                await obj.setFlag('sequencer', 'effects', []);
                lib.debug(`All flags removed for object with ID "${obj.id}"`);
                continue;
            }

            let flagsToSet = new Map(await obj.getFlag('sequencer', 'effects') ?? []);

            for (const effect of toAdd.effects) {
                flagsToSet.set(effect?.data?.id ?? effect.id, effect.data);
            }

            for (const effect of toRemove.effects) {
                flagsToSet.delete(effect?.data?.id ?? effect.id);
            }

            await obj.setFlag('sequencer', 'effects', Array.from(flagsToSet));

            lib.debug(`Flags set for object with ID "${obj.id}"`, Array.from(flagsToSet))

        }

    }, 250)

};