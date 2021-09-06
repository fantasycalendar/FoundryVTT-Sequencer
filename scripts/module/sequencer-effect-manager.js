import CanvasEffect from "./canvas-effects/canvas-effect.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "./lib/lib.js";

const sequencerCanvasEffects = new Set();

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
     * @param {string} inName The name of the effect to end
     * @param {boolean} [push=false] A flag indicating whether or not to make other clients end the effect
     * @returns {Promise} A promise that resolves when the effect has ended
     */
    static async endEffect(inName, push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_EFFECT, inName);
        return this._endEffect(inName);
    }

    /**
     * End all effects that are playing on the canvas
     *
     * @param {boolean} [push=false] A flag indicating whether or not to make other clients end all effects
     * @returns {Promise} A promise that resolves when all of the effects have ended
     */
    static async endAllEffects(push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_ALL_EFFECTS);
        return this._endAllEffects();
    }

    static async _playEffect(data) {

        const effect = CanvasEffect.make(data);

        if(!effect.getContext(data)){
            if(data.persist) effect.tearDownPersistence();
            return false;
        }

        const playData = await effect.play(this._shouldPlay(data));

        this._effects.add(effect);

        if(!data.persist) {
            playData.promise.then(() => this._removeEffect(effect));
        }

        return playData;
    }

    static _shouldPlay(data){
        return !(game.user.viewedScene !== data.sceneId || !game.settings.get('sequencer', 'effectsEnabled') || (data.users.length && !data.users.includes(game.userId)))
    }

    static _setUpPersists(){
        const allObjects = lib.getAllObjects()
        allObjects.push(canvas.scene);
        allObjects.forEach(obj => {
            const doc = obj?.document ?? obj;
            const effects = new Map(doc.getFlag('sequencer', 'effects') ?? []);
            effects.forEach(effect => {
                this._playEffect(effect);
            })
        });
    }

    static _tearDownPersists(inId){
        Array.from(this._effects)
            .filter(effect => effect.data?.attachTo === inId)
            .forEach(effect => {
                this._effects.delete(effect);
            })
    }

    static get _effects(){
        return sequencerCanvasEffects;
    }

    static _removeEffect(effect, immediate){
        effect.endEffect();
        this._effects.delete(effect);
    }

    static _endEffect(inName){

        const effects = Array.from(this._effects).filter(effect => effect.data.name === inName);

        if(!effects.length){
            console.warn(`Sequencer | endEffect | No effect(s) with name "${inName}" was found`)
            return;
        }

        return Promise.allSettled(effects.map((effect) => {
            this._removeEffect(effect);
        }));

    }

    static _endAllEffects(){
        return Promise.allSettled(Array.from(this._effects).map((effect) => {
            return this._removeEffect(effect);
        }));
    }
}