import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import flagManager from "../utils/flag-manager.js";
import PasteManager from "./sequencer-paste-manager.js";
import { SequencerSound, SOUND_STATES } from "../sounds/sequencer-sound.js";

export default class SequencerSoundManager {

	static states = SOUND_STATES;

	static setup() {
		Hooks.on("createToken", this._documentCreated.bind(this));
		Hooks.on("createDrawing", this._documentCreated.bind(this));
		Hooks.on("createTile", this._documentCreated.bind(this));
		Hooks.on("createMeasuredTemplate", this._documentCreated.bind(this));
		Hooks.on("createRegion", this._documentCreated.bind(this));
	}

	static _patchSoundDataForDocument(inDocumentUuid, sounds) {
		return sounds.map((sound) => {
			sound[0] = foundry.utils.randomID();
			const soundData = sound[1];
			soundData._id = sound[0];
			if (lib.is_UUID(soundData.source)) {
				soundData.source = inDocumentUuid;
			}
			soundData.sceneId = inDocumentUuid.split(".")[1];
			return sound;
		});
	}

	/**
	 * Plays the sounds of a given document on creation
	 *
	 * @param inDocument
	 * @returns {*}
	 */
	static async _documentCreated(inDocument) {
		let sounds = flagManager.getSoundFlags(inDocument);
		if (inDocument instanceof TokenDocument && inDocument?.actorLink) {
			let actorSounds = flagManager.getSoundFlags(inDocument?.actor);
			if (actorSounds.length) {
				actorSounds = this._patchSoundDataForDocument(
					inDocument.uuid,
					actorSounds
				);
			}
			sounds = sounds.concat(actorSounds);
		}
		const sourceUuid = PasteManager.consume(inDocument);
		if (sourceUuid) {
			const sourceSounds = flagManager.getSoundFlags({ uuid: sourceUuid });
			if (sourceSounds.length) {
				const rekeyed = this._patchSoundDataForDocument(inDocument.uuid, sourceSounds);
				const soundDatas = rekeyed.map(([, data]) => data);
				flagManager.addFlags(inDocument.uuid, { sounds: soundDatas });
				for (const soundData of soundDatas) {
					sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, soundData, false);
				}
				sounds = sounds.concat(rekeyed);
			}
		}
		if (!sounds?.length) return;
		return this._playSoundsMap(sounds, inDocument);
	}

	/**
	 * Sets up persisting sounds when the scene is first loaded
	 *
	 * @returns {promise}
	 */
	static async initializePersistentSounds() {
		await this.tearDownPersistentSounds();
		let docSoundsMap = {};
		let soundsToRemove = {};
		let databaseSounds = foundry.utils.deepClone(flagManager.getDatabaseFlags().sounds);
		for (let [uuid, sounds] of Object.entries(databaseSounds)) {
			let doc = fromUuidSync(uuid);
			if (doc instanceof foundry.documents.Actor && doc.prototypeToken.actorLink) {
				for (let token of doc.getActiveTokens()) {
					let tokenSounds = foundry.utils.deepClone(sounds);
					docSoundsMap[token.document.uuid] = tokenSounds.map(([id, sound]) => {
						if (lib.is_UUID(sound.source)) {
							sound.source = token.document.uuid;
						}
						sound.sceneId = canvas.scene.id;
						return [id, sound];
					})
				}
			} else if (doc) {
				if (doc === canvas.scene || doc.parent?.id === canvas.scene.id) {
					docSoundsMap[uuid] = sounds;
				}
			} else {
				soundsToRemove[uuid] = sounds;
			}
		}
		const promises = Object.entries(docSoundsMap)
			.map(([uuid, sounds]) => {
				return this._playSoundsMap(sounds, fromUuidSync(uuid));
			})
			.flat();
		for (let [uuid, sounds] of Object.entries(soundsToRemove)) {
			flagManager.removeFlags(uuid, {
				sounds, removeAllSounds: true
			});
		}
		return Promise.all(promises).then(() => {
			Hooks.callAll("sequencerSoundManagerReady");
		});
	}

	/**
	 * Tears down persisting sounds when the scene is unloaded
	 */
	static tearDownPersistentSounds() {
		return Promise.allSettled(
			this.sounds.map((sound) => {
				SequenceManager.RunningSounds.delete(sound._id);
				return sound.stop();
			})
		);
	}

	/**
	 * Plays multiple sounds at the same time
	 *
	 * @param inSounds
	 * @param inDocument
	 * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}[]>}
	 * @private
	 */
	static _playSoundsMap(inSounds, inDocument) {
		if (inSounds instanceof Map) inSounds = Array.from(inSounds);
		return Promise.all(
			inSounds.map((sound) => {
				if (!SequencerSound.checkShouldPlay(sound[1])) return;
				if (!SequencerSound.checkValid(sound[1])) {
					if (!game.user.isGM) return;
					lib.custom_warning(
						`Sequencer`,
						`Removed sound from ${inDocument.uuid} as it no longer had a valid source or target`
					);
					return flagManager.removeFlags(inDocument.uuid, { sounds: sound });
				}
				return this._playSound(sound[1], false)
					.then((result) => {
						if (!result) {
							lib.debug("Error playing sound");
						}
					})
					.catch((err) => {
						lib.debug("Error playing sound:", err);
					});
			})
		);
	}

	/**
	 * Returns all the currently running sounds
	 *
	 * @returns {Array}
	 */
	static get sounds() {
		return Array.from(SequenceManager.RunningSounds.values());
	}

	/**
	 * Opens the Sequencer Manager with the sounds tab open
	 */
	static show() {
		return EffectsUIApp.show({ tab: "manager" });
	}

	/**
	 * Play an audio file.
	 *
	 * @param {Object} data The data that describes the audio to play.
	 * @param {boolean} [push=false] A flag indicating whether to make other clients play the audio, too.
	 * @returns {Number} A promise that resolves when the audio file has finished playing.
	 */
	static async play(data, push = true) {
		if (push)
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, data);
		return this._playSound(data);
	}

	/**
	 * @param {Object} data
	 * @param {Boolean} setFlags
	 * @returns {Number}
	 * @private
	 */
	static async _playSound(data, setFlags = true) {

		if (data.delete) return false;

		Hooks.callAll("createSequencerSound", data);

		lib.debug(`Playing sound:`, data);

		let sequencerSound = SequencerSound.make(data);

		await sequencerSound.load();

		SequenceManager.RunningSounds.add(sequencerSound.id, sequencerSound);

		let promise = sequencerSound.startPlay();

		promise.then(() => {
			SequenceManager.RunningSounds.delete(sequencerSound.id);
			Hooks.callAll("endedSequencerSound", data);
		});

		if (data.persist) {
			let responsibleUser = game.users.getDesignatedUser((user) => user.active);
			if (responsibleUser === game.user && setFlags) {
				sequencerSound.addFlags();
			}
		}

		return sequencerSound.duration;
	}

	static _validateFilters(inFilter) {

		if (inFilter?.sounds) {
			if (!Array.isArray(inFilter.sounds)) {
				inFilter.sounds = [inFilter.sounds];
			}
			inFilter.sounds = inFilter.sounds.map((sound) => {
				if (!(typeof sound === "string" || sound instanceof SequencerSound))
					throw lib.custom_error(
						"Sequencer",
						"SoundManager | collections in inFilter.sounds must be of type string or SequencerSound",
					);
				if (sound instanceof SequencerSound) return sound.data._id;
				return sound;
			});
		}

		if (inFilter?.name && typeof inFilter?.name !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.name must be of type string",
			);

		if (inFilter?.sceneId) {
			if (typeof inFilter.sceneId !== "string")
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be of type string",
				);
			if (!game.scenes.get(inFilter.sceneId))
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be a valid scene id (could not find scene)",
				);
		} else {
			inFilter.sceneId = game.user.viewedScene;
		}

		if (inFilter?.origin && typeof inFilter?.origin !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.origin must be of type string",
			);

		if (
			!inFilter.sounds &&
			!inFilter.name &&
			!inFilter.sceneId &&
			!inFilter.origin
		) {
			return false;
		}

		return foundry.utils.mergeObject(
			{
				sounds: null,
				name: null,
				sceneId: null,
				origin: null,
			},
			inFilter,
		);
	}

	static _filterSounds(inFilter) {
		if (inFilter.name) {
			inFilter.name = new RegExp(
				"^" + lib.str_to_search_regex_str(lib.safe_str(inFilter.name)) + "$",
				"gu",
			);
		}
		return this.sounds.filter((sound) => {
			return (
				(inFilter.sounds === null || inFilter.sounds.includes(sound.data._id)) &&
				(inFilter.name === null || (sound.data.name && inFilter.name && sound.data.name.match(inFilter.name)?.length)) &&
				(inFilter.sceneId === null || (sound.data.sceneId === inFilter.sceneId)) &&
				(inFilter.origin === null || inFilter.origin === sound.data.origin)
			)
		});
	}

	static getSounds(inFilter = {}) {
		const filters = this._validateFilters(inFilter);
		if (!inFilter)
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | getSounds | Incorrect or incomplete parameters provided",
			);
		return this._filterSounds(filters);
	}

	static endSounds(inFilter, push = true) {
		const filters = this._validateFilters(inFilter);
		const sounds = this._filterSounds(filters);
		if (!sounds?.length) return;
		const ids = sounds.map(sound => sound.data._id);
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}

	/**
	 * @param inSoundIds
	 * @private
	 */
	static _endSounds(inSoundIds) {
		const actorSoundsToEnd = this.sounds.filter((sound) => {
			return (
				sound.context?.actorLink &&
				inSoundIds.includes(sound.data?.persistOptions?.id)
			);
		});
		const soundsByActorUuid = Object.values(
			lib.group_by(actorSoundsToEnd, "context.actor.uuid")
		);

		const regularSoundsToEnd = this.sounds.filter((sound) => {
			return (
				inSoundIds.includes(sound.id) ||
				(!sound.context?.actorLink &&
					inSoundIds.includes(sound.data?.persistOptions?.id))
			);
		});
		const soundsByContextUuid = Object.values(
			lib.group_by(regularSoundsToEnd, "context.uuid")
		);

		soundsByContextUuid.forEach((sounds) => {
			sounds = sounds.filter(
				(sound) => sound.data.persist && !sound.data.temporary
			);
			if (!sounds.length) return;
			const soundData = sounds.map((sound) => sound.data);
			flagManager.removeFlags(
				sounds[0].context.uuid,
				{ sounds: soundData, removeAllSounds: !inSoundIds }
			);
		});

		soundsByActorUuid.forEach((sounds) => {
			sounds = sounds.filter(
				(sound) => sound.data.persist && !sound.data.temporary
			);
			if (!sounds.length) return;

			const soundContext = sounds[0].context;
			const soundData = sounds.map((sound) => sound.data);

			if (
				!(
					soundContext instanceof TokenDocument &&
					soundContext.actorLink &&
					soundContext.actor?.prototypeToken?.actorLink
				)
			) {
				return;
			}

			const persistentSoundData = soundData.filter(
				(data) => lib.is_UUID(data?.source) && data?.persistOptions?.persistTokenPrototype
			);
			if (!persistentSoundData.length) return;

			const actorSounds = flagManager.getSoundFlags(soundContext.actor);
			const applicableActorSounds = actorSounds
				.filter((sound) => {
					return (
						lib.is_UUID(sound[1]?.source) &&
						sound[1]?.persistOptions?.persistTokenPrototype &&
						persistentSoundData.some(
							(persistentSound) =>
								persistentSound.persistOptions.id ===
								sound[1]?.persistOptions?.id
						)
					);
				})
				.map((e) => e[0]);

			flagManager.removeFlags(
				soundContext.actor.uuid,
				{ sounds: applicableActorSounds, removeAllSounds: !inSoundIds }
			);
		});

		const soundsToEnd = soundsByContextUuid
			.concat(soundsByActorUuid)
			.deepFlatten();

		return Promise.allSettled(
			soundsToEnd.map((sound) => this._removeSound(sound))
		);
	}

	/**
	 * Ends every sound tied to the given document, and removes any persisted sounds tied to it
	 *
	 * @param {string} inUUID
	 * @returns {Promise}
	 */
	static tiedDocumentDeleted(inUUID) {
		const isTied = (soundData) => (soundData?.tiedDocuments ?? []).includes(inUUID);

		const databaseSounds = flagManager.getDatabaseFlags().sounds;
		for (const [ownerUuid, sounds] of Object.entries(databaseSounds)) {
			const idsToEnd = sounds
				.filter(([, soundData]) => isTied(soundData))
				.map(([soundId]) => soundId);
			if (idsToEnd.length) {
				flagManager.removeFlags(ownerUuid, { sounds: idsToEnd });
			}
		}

		return Promise.allSettled(
			this.sounds
				.filter((sound) => isTied(sound.data))
				.map((sound) => this._removeSound(sound))
		);
	}

	static _removeSound(sound) {
		SequenceManager.RunningSounds.delete(sound.id);
		return sound.stop();
	}

	static endAllSounds(push = true) {
		const ids = SequenceManager.RunningSounds.keys();
		if (push) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}
}
