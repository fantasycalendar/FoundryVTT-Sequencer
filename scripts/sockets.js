import SequencerAudioHelper from "./module/sequencer-audio-helper.js";
import SequencerEffectHelper from "./module/sequencer-effect-helper.js";

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
            return SequencerEffectHelper.play(...args);
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