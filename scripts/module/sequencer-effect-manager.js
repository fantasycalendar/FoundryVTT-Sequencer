import { CanvasEffect, PersistentCanvasEffect } from "./canvas-effects/canvas-effect.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";

const sequencerCanvasEffects = new Set();

export default class SequencerEffectManager {

    /**
     * Play an effect on the canvas.
     *
     * @param {object} data The data that describes the audio to play.
     * @param {boolean} [push=false] A flag indicating whether or not to make other clients play the effect, too.
     * @returns {CanvasEffect} A CanvasEffect object
     */
    static async play(data, push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.PLAY_EFFECT, data);
        return this._playEffect(data);
    }

    static async endEffect(inName, push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_EFFECT, inName);
        return this._endEffect(inName);
    }

    static async endAllEffects(push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.END_ALL_EFFECTS);
        return this._endAllEffects();
    }

    static _setUpPersists(){
        let effects = new Map(canvas.scene.getFlag('sequencer', 'effects') ?? []);
        effects.forEach(effect => {
            this._playEffect(effect);
        })
    }

    static get effects(){
        return sequencerCanvasEffects;
    }

    static _removeEffect(effect){
        effect.endEffect();
        this.effects.delete(effect);
    }

    static _shouldPlay(data){
        return !(game.user.viewedScene !== data.sceneId || !game.settings.get('sequencer', 'effectsEnabled') || (data.users.length && !data.users.includes(game.userId)))
    }

    static async _playEffect(data) {

        const effectClass = data.persist ? PersistentCanvasEffect : CanvasEffect;

        const effect = new effectClass(data);

        this.effects.add(effect);

        const playData = await effect.play(this._shouldPlay(data));

        if(!data.persist) {
            playData.promise.then(() => this._removeEffect(effect));
        }

        return playData;
    }

    static _endEffect(inName){

        const effects = Array.from(this.effects);

        const effect = effects.filter(effect => effect.data.name === inName);

        if(!effect){
            console.warn(`Sequencer | endEffect | Effect(s) with name "${inName}" not found`)
            return;
        }

        effect.forEach(this._removeEffect.bind(this));

    }

    static _endAllEffects(){
        Array.from(this.effects).forEach(this._removeEffect.bind(this));
    }
}