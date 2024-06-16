import CONSTANTS from "./constants.js";
import * as lib from "./lib/lib.js";
import FlagManager from "./utils/flag-manager.js";
import SequencerSoundManager from "./modules/sequencer-sound-manager.js";
import SequencerEffectManager from "./modules/sequencer-effect-manager.js";
import SequencerFoundryReplicator from "./modules/sequencer-foundry-replicator.js";

export const SOCKET_HANDLERS = {
  PLAY_EFFECT: "playEffect",
  END_EFFECTS: "endEffects",
  UPDATE_EFFECT: "updateEffects",
  ADD_EFFECT_ANIMATIONS: "addEffectAnimations",
  PLAY_SOUND: "playSound",
  END_SOUNDS: "endSounds",
  PRELOAD: "preload",
  PRELOAD_RESPONSE: "preloadResponse",
  PRELOAD_DONE: "preloadDone",
  UPDATE_DOCUMENT: "updateDocument",
  ADD_EFFECT_FLAGS: "addEffectFlags",
  REMOVE_EFFECT_FLAGS: "removeEffectFlags",
  UPDATE_EFFECT_POSITION: "updateEffectPosition",
  ADD_SOUND_FLAGS: "addSoundFlags",
  REMOVE_SOUND_FLAGS: "removeSoundFlags",
  UPDATE_SOUND_POSITION: "updateSoundPosition",
  CREATE_SCROLLING_TEXT: "createScrollingText",
  CREATE_LIGHT_SOURCE: "createLightSource",
  PAN_CANVAS: "panCanvas",
  RUN_SEQUENCE_LOCALLY: "runSequenceLocally",
};

export let sequencerSocket;

export function registerSocket() {
  if (sequencerSocket) return;
  sequencerSocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);
  sequencerSocket.register(SOCKET_HANDLERS.PLAY_EFFECT, (...args) =>
    SequencerEffectManager._playEffect(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.END_EFFECTS, (...args) =>
    SequencerEffectManager._endManyEffects(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_EFFECT, (...args) =>
    SequencerEffectManager._updateEffect(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.ADD_EFFECT_ANIMATIONS, (...args) =>
    SequencerEffectManager._addEffectAnimations(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PLAY_SOUND, (...args) =>
    SequencerSoundManager._play(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.END_SOUNDS, (...args) =>
    SequencerSoundManager._endSounds(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PRELOAD, (...args) =>
    SequencerPreloader.respond(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.PRELOAD_RESPONSE, (...args) =>
    SequencerPreloader.handleResponse(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_DOCUMENT, (...args) =>
    updateDocument(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.ADD_EFFECT_FLAGS, (...args) =>
    FlagManager._addEffectFlags(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.REMOVE_EFFECT_FLAGS, (...args) =>
    FlagManager._removeEffectFlags(...args)
  );
  sequencerSocket.register(SOCKET_HANDLERS.UPDATE_EFFECT_POSITION, (...args) =>
    SequencerEffectManager._updatePosition(...args)
  );
	sequencerSocket.register(SOCKET_HANDLERS.ADD_SOUND_FLAGS, (...args) =>
		FlagManager._addSoundFlags(...args)
	);
	sequencerSocket.register(SOCKET_HANDLERS.REMOVE_SOUND_FLAGS, (...args) =>
		FlagManager._removeSoundFlags(...args)
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
