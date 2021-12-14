import SequencerAudioHelper from "./module/sequencer-audio-helper.js";
import CONSTANTS from "./module/constants.js";

export const SOCKET_HANDLERS = {
    PLAY_EFFECT: "playEffect",
    END_EFFECTS: "endEffect",
    PLAY_SOUND: "playSound",
    PRELOAD: "preload",
    PRELOAD_RESPONSE: "preloadResponse",
    PRELOAD_DONE: "preloadDone",
    UPDATE_DOCUMENT: "updateDocument",
    UPDATE_FLAGS: "updateFlags"
};

export let sequencerSocket;

export function registerSocket() {
    console.log("Sequencer | Registered sequencerSocket");
    sequencerSocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);
    sequencerSocket.register(SOCKET_HANDLERS.PLAY_EFFECT, (...args) => Sequencer.EffectManager._playEffect(...args))
    sequencerSocket.register(SOCKET_HANDLERS.END_EFFECTS, (...args) => Sequencer.EffectManager._endEffects(...args))
    sequencerSocket.register(SOCKET_HANDLERS.PLAY_SOUND, (...args) => SequencerAudioHelper.play(...args))
    sequencerSocket.register(SOCKET_HANDLERS.PRELOAD, (...args) => Sequencer.Preloader._preloadRemote(...args))
    sequencerSocket.register(SOCKET_HANDLERS.PRELOAD_RESPONSE, (...args) => Sequencer.Preloader._handleResponse(...args))
    sequencerSocket.register(SOCKET_HANDLERS.PRELOAD_DONE, (...args) => Sequencer.Preloader._handleDone(...args))
    sequencerSocket.register(SOCKET_HANDLERS.UPDATE_DOCUMENT, (...args) => updateDocument(...args))
    sequencerSocket.register(SOCKET_HANDLERS.UPDATE_FLAGS, (...args) => updateFlags(...args))
}

async function updateDocument(documentUuid, updates, animate){
    const document = await fromUuid(documentUuid);
    return document.update(updates, animate);
}

async function updateFlags(documentUuid, flags){
    const document = await fromUuid(documentUuid);
    return document.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, flags);
}

