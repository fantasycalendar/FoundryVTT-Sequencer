import SequencerAudioHelper from "./modules/sequencer-audio-helper.js";
import CONSTANTS from "./constants.js";
import FlagManager from "./utils/flag-manager.js";
import SequencerFoundryReplicator from "./modules/sequencer-foundry-replicator.js";
import * as lib from "./lib/lib.js";

export const SOCKET_HANDLERS = {
  PLAY_EFFECT: "playEffect",
  END_EFFECTS: "endEffects",
  UPDATE_EFFECT: "updateEffects",
  ADD_EFFECT_ANIMATIONS: "addEffectAnimations",
  PLAY_SOUND: "playSound",
  STOP_SOUNDS: "stopSounds",
  PRELOAD: "preload",
  PRELOAD_RESPONSE: "preloadResponse",
  PRELOAD_DONE: "preloadDone",
  UPDATE_DOCUMENT: "updateDocument",
  ADD_FLAGS: "addFlags",
  REMOVE_FLAGS: "removeFlags",
  UPDATE_POSITION: "updatePosition",
  CREATE_SCROLLING_TEXT: "createScrollingText",
  PAN_CANVAS: "panCanvas",
  RUN_SEQUENCE_LOCALLY: "runSequenceLocally",
};

export let sequencerSocket;

export function registerSocket() {
  console.log("Sequencer | Registered sequencerSocket");
  sequencerSocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);
  sequencerSocket.register(SOCKET_HANDLERS.PLAY_EFFECT, (...args) =>
    Sequencer.EffectManager._playEffect(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.END_EFFECTS, (...args) =>
    Sequencer.EffectManager._endManyEffects(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_EFFECT, (...args) =>
    Sequencer.EffectManager._updateEffect(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.ADD_EFFECT_ANIMATIONS, (...args) =>
    Sequencer.EffectManager._addEffectAnimations(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PLAY_SOUND, (...args) =>
    SequencerAudioHelper._play(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.STOP_SOUNDS, (...args) =>
    SequencerAudioHelper._stop(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PRELOAD, (...args) =>
    Sequencer.Preloader.respond(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PRELOAD_RESPONSE, (...args) =>
    Sequencer.Preloader.handleResponse(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_DOCUMENT, (...args) =>
    updateDocument(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.ADD_FLAGS, (...args) =>
    FlagManager._addFlags(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.REMOVE_FLAGS, (...args) =>
    FlagManager._removeFlags(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_POSITION, (...args) =>
    Sequencer.EffectManager._updatePosition(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.CREATE_SCROLLING_TEXT, (data) =>
    SequencerFoundryReplicator._playScrollingText(data)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PAN_CANVAS, (data) =>
    SequencerFoundryReplicator._panCanvas(data)
  );
  sequencerSocket.register(SOCKET_HANDLERS.RUN_SEQUENCE_LOCALLY, (data) => {
    lib.debug("Playing remote Sequence");
    new Sequence().fromJSON(data).play();
  });
}

async function updateDocument(documentUuid, updates, animate) {
  const document = await fromUuid(documentUuid);
  return document.update(updates, animate);
}
