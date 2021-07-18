import CanvasEffect from "./canvas-effects/canvas-effect.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";

export default class SequencerEffectHelper {
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

    static _playEffect(data) {

        let layers = [
            canvas.background,
            canvas.sequencerEffectsBelowTokens,
            canvas.sequencerEffectsAboveTokens
        ];

        let layer = layers[data.layer ?? 2];

        let container = layer.children.find(child => child?.parentName === "sequencer");

        if(!container) {
            if(layer === canvas.background){
                layer.sortableChildren = true;
                layer.children.filter(child => child.sortableChildren).map(child => child.zIndex = 1);
            }
            container = new PIXI.Container();
            container.sortableChildren = true;
            container.parentName = "sequencer";
            container.zIndex = 0.5;
            layer.addChild(container);
            layer.sortChildren();
        }

        return new CanvasEffect(container, data).play();

    }
}