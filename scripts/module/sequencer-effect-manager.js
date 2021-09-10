import CanvasEffect from "./canvas-effects/canvas-effect.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "./lib/lib.js";

const EffectsContainer = {
    _effects: new Set(),
    get effects() {
        return Array.from(this._effects);
    },
    delete(effect) {
        this._effects.delete(effect);
    },
    add(effect) {
        this._effects.add(effect);
    }
};


export default class SequencerEffectManager {

    /**
     * Play an effect on the canvas.
     *
     * @param {object} data The data that describes the audio to play.
     * @param {boolean} [push=false] A flag indicating whether or not to make other clients play the effect
     * @returns {CanvasEffect} A CanvasEffect object
     */
    static async play(data, push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.PLAY_EFFECT, data);
        return this._playEffect(data);
    }

    /**
     * End an effect that is playing on the canvas based on its name
     *
     * @param {object} inData An object containing data to determine which effects to end
     * @param {boolean} [push=true] A flag indicating whether or not to make other clients end the effects
     * @returns {Promise} A promise that resolves when the effects have ended
     */
    static async endEffects(inData = {}, push = true) {

        if (inData?.object) {
            if (!(inData.object instanceof PlaceableObject || typeof inData.object === "string")) {
                throw lib.throwError("SequencerEffectManager", "endEffects | inData.object must be instance of PlaceableObject or of type string")
            } else if (inData.object instanceof PlaceableObject) {
                inData.attachTo = inData.object.id;
            } else if (typeof inData.object === "string") {
                if (!lib.getObjectFromScene(inData.object)) {
                    throw lib.throwError("SequencerEffectManager", `endEffects | could not find object with ID: ${inData.object}`)
                }
                inData.attachTo = inData.object;
            }
            delete inData.object;
        }

        if (inData?.name && typeof inData?.name !== "string") throw lib.throwError("SequencerEffectManager", "endEffects | inData.name must be of type string")
        if (inData?.sceneId) {
            if (typeof inData.sceneId !== "string") throw lib.throwError("SequencerEffectManager", "endEffects | inData.sceneId must be of type string")
            if (!game.scenes.get(inData.sceneId)) throw lib.throwError("SequencerEffectManager", "endEffects | inData.sceneId must be a valid scene id (could not find scene)")
        }

        inData = foundry.utils.mergeObject({
            name: false,
            attachTo: false,
            sceneId: false
        }, inData);

        if (!inData.name && !inData.attachTo && !inData.sceneId) return;

        if (push) emitSocketEvent(SOCKET_HANDLERS.END_EFFECT, inData);
        return this._endEffects(inData);
    }

    /**
     * End all effects that are playing on the canvas
     *
     * @param {boolean} [push=true] A flag indicating whether or not to make other clients end all effects
     * @returns {Promise} A promise that resolves when all of the effects have ended
     */
    static async endAllEffects(push = true) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_ALL_EFFECTS);
        return this._endManyEffects();
    }

    static async _playEffect(data) {

        const effect = CanvasEffect.make(data);

        if (!effect.context) return false;

        if (data.persist) await this._addFlagsToObject(effect.contextDocument, effect);

        const playData = await effect.play();

        EffectsContainer.add(effect);

        if (!data.persist) {
            playData.promise.then(() => this._removeEffect(effect));
        }

        return playData;
    }

    static _setUpPersists() {
        const allObjects = lib.getAllObjects()
        allObjects.push(canvas.scene);
        allObjects.map(obj => {
            const doc = obj?.document ?? obj;
            let effects = new Map(doc.getFlag('sequencer', 'effects') ?? []);
            effects.forEach(effect => {
                this._playEffect(effect);
            })
        })
    }

    static _tearDownPersists(inId) {
        EffectsContainer.effects
            .filter(effect => effect.data?.attachTo === inId)
            .forEach(effect => {
                EffectsContainer.delete(effect);
            })
    }

    static async _removeEffect(effect) {
        await effect.endEffect();
        EffectsContainer.delete(effect);
    }

    static _endEffects(inData) {

        let effects = EffectsContainer.effects
            .filter(effect => !inData.name || inData.name === effect.data.name)
            .filter(effect => !inData.attachTo || inData.attachTo === effect.data.attachTo)
            .filter(effect => !inData.sceneId || inData.sceneId === effect.data.sceneId);

        if (!effects.length) return;

        return this._endManyEffects(effects);

    }

    static _endManyEffects(inEffects = false) {

        const effectsToEnd = inEffects || EffectsContainer.effects;

        const effectsByObjectId = lib.groupBy(effectsToEnd, "context.id");

        return Promise.allSettled(Object.values(effectsByObjectId)
            .map(effectGroup =>
                [
                    ...effectGroup.map(effect => effect.endEffect()),
                    this._removeFlagsFromObject(effectGroup[0].contextDocument)
                ]
            ));

    }

    static async _addFlagsToObject(inObject, inEffects) {
        if (!lib.isResponsibleGM()) return;
        if (!Array.isArray(inEffects)) inEffects = [inEffects];
        let flagsToSet = flagBuffer.get(inObject.id) ?? { obj: inObject, effects: [] };
        flagsToSet.effects.push(...inEffects);
        flagBuffer.set(inObject.id, flagsToSet);
        addFlagDebounce();
    }

    static async _removeFlagsFromObject(inObject, inEffects = false) {
        if (!lib.isResponsibleGM()) return;
        if (inEffects && !Array.isArray(inEffects)) inEffects = [inEffects];
        let effects = new Map();
        if (inEffects) {
            const effects = new Map(await inObject.getFlag('sequencer', 'effects') ?? []);
            for (const effect of inEffects) {
                effects.delete(effect.data.id);
            }
        }
        await inObject.setFlag('sequencer', 'effects', Array.from(effects));
    }
}

const flagBuffer = new Map();

const addFlagDebounce = debounce(async () => {
    const flags = Array.from(flagBuffer);
    flagBuffer.clear();
    for (let flagData of flags) {

        const obj = flagData[1].obj;
        const newEffects = flagData[1].effects;

        let objectFlags = await obj.getFlag('sequencer', 'effects');
        const existingEffects = new Map(objectFlags ?? []);
        for (const effect of newEffects) {
            existingEffects.set(effect.data.id, effect.data);
        }

        await obj.setFlag('sequencer', 'effects', Array.from(existingEffects));

    }
}, 100);