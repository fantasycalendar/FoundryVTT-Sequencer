import CONSTANTS from "./constants.js";
import * as lib from "./lib/lib.js";
import FlagManager from "./utils/flag-manager.js";
import SequencerSoundManager from "./modules/sequencer-sound-manager.js";
import SequencerEffectManager from "./modules/sequencer-effect-manager.js";
import SequencerFoundryReplicator from "./modules/sequencer-foundry-replicator.js";
import SequencerPreloader from './modules/sequencer-preloader.js'


const RECIPIENT_TYPES = {
	GM: 0,
	SUPERUSER: 1,
	ALL: 2,
	USER: 3
};

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
  ADD_FLAGS: "addFlags",
  REMOVE_FLAGS: "removeFlags",
  UPDATE_EFFECT_POSITION: "updateEffectPosition",
  ADD_SOUND_FLAGS: "addSoundFlags",
  REMOVE_SOUND_FLAGS: "removeSoundFlags",
  UPDATE_SOUND_POSITION: "updateSoundPosition",
  CREATE_SCROLLING_TEXT: "createScrollingText",
  CREATE_LIGHT_SOURCE: "createLightSource",
  PAN_CANVAS: "panCanvas",
  RUN_SEQUENCE_LOCALLY: "runSequenceLocally",
};

const SOCKET_CALLBACKS = {
	[SOCKET_HANDLERS.PLAY_EFFECT]: (data) => {
		return SequencerEffectManager._playEffect(...data.payload);
	},
	[SOCKET_HANDLERS.END_EFFECTS]: (data) => {
		return SequencerEffectManager._endManyEffects(...data.payload);
	},
	[SOCKET_HANDLERS.UPDATE_EFFECT]: (data) => {
		return SequencerEffectManager._updateEffect(...data.payload)
	},
	[SOCKET_HANDLERS.ADD_EFFECT_ANIMATIONS]: (data) => {
		return SequencerEffectManager._addEffectAnimations(...data.payload)
	},
	[SOCKET_HANDLERS.PLAY_SOUND]: (data) => {
		return SequencerSoundManager._playSound(...data.payload)
	},
	[SOCKET_HANDLERS.END_SOUNDS]: (data) => {
		return SequencerSoundManager._endSounds(...data.payload)
	},
	[SOCKET_HANDLERS.PRELOAD]: (data) => {
		return SequencerPreloader.respond(...data.payload)
	},
	[SOCKET_HANDLERS.PRELOAD_RESPONSE]: (data) => {
		return SequencerPreloader.handleResponse(...data.payload)
	},
	[SOCKET_HANDLERS.UPDATE_DOCUMENT]: async (data) => {
		let [documentUuid, updates, animate] = data.payload;
		const document = await fromUuid(documentUuid);
		if(!document) {
			return;
		}
		return document.update(updates, animate);
	},
	[SOCKET_HANDLERS.ADD_FLAGS]: (data) => {
		return FlagManager._addFlags(...data.payload)
	},
	[SOCKET_HANDLERS.REMOVE_FLAGS]: (data) => {
		return FlagManager._removeFlags(...data.payload)
	},
	[SOCKET_HANDLERS.UPDATE_EFFECT_POSITION]: (data) => {
		return SequencerEffectManager._updatePosition(...data.payload)
	},
	[SOCKET_HANDLERS.ADD_SOUND_FLAGS]: (data) => {
		return FlagManager._addFlags(...data.payload)
	},
	[SOCKET_HANDLERS.REMOVE_SOUND_FLAGS]: (data) => {
		return FlagManager._removeFlags(...data.payload)
	},
	[SOCKET_HANDLERS.CREATE_SCROLLING_TEXT]: (data) => {
		return SequencerFoundryReplicator._playScrollingText(data.payload)
	},
	[SOCKET_HANDLERS.PAN_CANVAS]: (data) => {
		return SequencerFoundryReplicator._panCanvas(data.payload)
	},
	[SOCKET_HANDLERS.RUN_SEQUENCE_LOCALLY]: (data) => {
		lib.debug("Playing remote Sequence");
		new Sequence().fromJSON(data.payload).play();
	},
}

export class SequencerSocket {

	constructor() {
		game.socket.on(`module.${CONSTANTS.MODULE_NAME}`, this._executeSocket.bind(this));
	}

	executeAsGM(type, ...args) {
		let data = { senderId: game.user.id, sendType: RECIPIENT_TYPES.GM, type, payload: args };
		if(game.user.isGM){
			return this._executeSocket(data);
		}
		game.socket.emit(`module.${CONSTANTS.MODULE_NAME}`, data);
		return data;
	}

	executeForOthers(type, ...args) {
		let data = { senderId: game.user.id, sendType: RECIPIENT_TYPES.ALL, type, payload: args };
		game.socket.emit(`module.${CONSTANTS.MODULE_NAME}`, data);
		return data;
	}

	executeForEveryone(type, ...args) {
		let data = { senderId: game.user.id, sendType: RECIPIENT_TYPES.ALL, type, payload: args };
		game.socket.emit(`module.${CONSTANTS.MODULE_NAME}`, data);
		return this._executeSocket(data);
	}

	executeAsUser(type, receiverId, ...args) {
		let data = { senderId: game.user.id, receiverId, sendType: RECIPIENT_TYPES.USER, type, payload: args };
		if(receiverId === game.user.id){
			return this._executeSocket(data);
		}
		game.socket.emit(`module.${CONSTANTS.MODULE_NAME}`, data);
		return data;
	}

	executeAsMainUser(type, ...args) {
		let data = { senderId: game.user.id, sendType: RECIPIENT_TYPES.SUPERUSER, type, payload: args };
		let targetUser = game.users.getDesignatedUser((user) => user.active);
		if(game.user.id === targetUser.id){
			return this._executeSocket(data);
		}
		game.socket.emit(`module.${CONSTANTS.MODULE_NAME}`, data);
		return this._executeSocket(data);
	}

	_executeSocket(data) {
		const handler = SOCKET_CALLBACKS[data.type];
		if (!handler) {
			return false;
		}

		switch(data.sendType){
			case RECIPIENT_TYPES.SUPERUSER:
				let user = game.users.getDesignatedUser((user) => user.active);
				if(user !== game.user){
					return;
				}
				break;
			case RECIPIENT_TYPES.GM:
				if(data.sendType === RECIPIENT_TYPES.GM && !game.user.isActiveGM){
					return;
				}
				break;
			case RECIPIENT_TYPES.USER:
				if(data.sendType === RECIPIENT_TYPES.USER && game.user.id !== data.receiverId){
					return;
				}
				break;
		}

		return handler(data);
	}
}


export let sequencerSocket = false;

export function registerSocket() {
  sequencerSocket = new SequencerSocket();
}
