import CanvasEffect from "./module/canvas-effects/canvas-effect.js";
import SequencerAudioHelper from "./module/sequencer-audio-helper.js";

const sequencerSocketEvent = "module.sequencer";

export const SOCKET_HANDLERS = {
    PLAY_EFFECT: "playEffect",
    PLAY_SOUND: "playSound",
};

export function emitSocketEvent(handler, ...args) {
    game.socket.emit(sequencerSocketEvent, { args, handler });
}

function onSocketEvent(socketData) {
    const { handler, args } = socketData;
    switch (handler) {
        case SOCKET_HANDLERS.PLAY_EFFECT:
            return playEffect(...args);
        case SOCKET_HANDLERS.PLAY_SOUND:
            return SequencerAudioHelper.play(...args, false);
        default:
            console.warn(`Sequencer | Received socket event for unknown handler '${handler}'`);
    }
}

export function registerSocket() {
    game.socket.on(sequencerSocketEvent, onSocketEvent);
    console.log("Sequencer | Registered socket");
}

export async function playEffect(data) {
    let layers = [canvas.background, canvas.sequencerEffectsBelowTokens, canvas.sequencerEffectsAboveTokens];

    let layer = layers[data.layer ?? 2];

    let container = layer.children.find((child) => child?.parentName === "sequencer");

    if (!container) {
        if (layer === canvas.background) {
            layer.sortableChildren = true;
            layer.children.filter((child) => child.sortableChildren).map((child) => (child.zIndex = 1));
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
