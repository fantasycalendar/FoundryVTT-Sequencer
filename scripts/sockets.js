import SequencerAudioHelper from "./module/sequencer-audio-helper.js";
import SequencerEffectHelper from "./module/sequencer-effect-helper.js";
import SequencerPreloader from "./module/sequencer-preloader.js";

const sequencerSocketEvent = "module.sequencer";

export const SOCKET_HANDLERS = {
    PLAY_EFFECT: "playEffect",
    PLAY_SOUND: "playSound",
	PRELOAD: "preload",
	PRELOAD_RESPONSE: "preload_response",
	PRELOAD_DONE: "preload_done"
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
		case SOCKET_HANDLERS.PRELOAD:
            return SequencerPreloader.preload(...args);
		case SOCKET_HANDLERS.PRELOAD_RESPONSE:
            return SequencerPreloader.handleResponse(...args);
		case SOCKET_HANDLERS.PRELOAD_DONE:
            return SequencerPreloader.handleDone(...args);
        default:
            console.warn(`Sequencer | Received socket event for unknown handler '${handler}'`);
    }
}

export function registerSocket() {
    game.socket.on(sequencerSocketEvent, onSocketEvent);
    console.log("Sequencer | Registered socket");
}