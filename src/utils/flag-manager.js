import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "../constants.js";

const flagManager = {
	flagAddBuffer: new Map(),
	flagRemoveBuffer: new Map(),
	_latestFlagVersion: false,

	get database(){
		return game.journal.getName(CONSTANTS.DATABASE_NAME);
	},

	setup() {
		Hooks.on("renderJournalDirectory", async (app) => {
			let database = this.database;
			if(!database) return;
			let element = app.element.querySelector(`[data-entry-id="${database.id}"]`);
			if(element){
				element.remove();
			}
		});
		Hooks.on("preDeleteJournalEntry", (doc) => {
			let database = this.database;
			if(!database) return;
			return doc !== database;
		})
	},

	_getDatabaseData(flag) {
		let database = this.database;
		if(!database){
			return {};
		}
		let flagData = {};
		let flags = foundry.utils.getProperty(database, flag) ?? {};
		for (let [uuid, data] of Object.entries(flags)) {
			let newUuid = uuid.replaceAll("-", ".");
			flagData[newUuid] ??= []
			flagData[newUuid] = flagData[newUuid].concat(data);
		}
		return flagData;
	},

	getDatabaseFlags() {
		return {
			effects: this._getDatabaseData(CONSTANTS.EFFECTS_FLAG),
			sounds: this._getDatabaseData(CONSTANTS.SOUNDS_FLAG)
		};
	},

	get latestFlagVersion() {
		if (!this._latestFlagVersion) {
			const versions = Object.keys(this.effectMigrations);
			versions.sort((a, b) => {
				return foundry.utils.isNewerVersion(a, b) ? -1 : 1;
			});
			this._latestFlagVersion = versions[0];
		}
		return this._latestFlagVersion;
	},

	/**
	 * Sanitizes the effect data, accounting for changes to the structure in previous versions
	 *
	 * @param inDocument
	 * @param databaseFlags
	 * @returns {array}
	 */
	getEffectFlags(inDocument, databaseFlags=null) {

		if(!inDocument?.uuid) return [];

		let allEffects = databaseFlags ?? this.getDatabaseFlags().effects;
		let effects = allEffects[inDocument.uuid] ?? []

		if (!effects?.length) return [];

		effects = foundry.utils.deepClone(effects);

		const changes = [];
		for (let [effectId, effectData] of effects) {
			let effectVersion = effectData?.flagVersion ?? "1.0.0";

			let changesAdded = false;

			if (effectData._id !== effectId) {
				changesAdded = true;
				effectData._id = effectId;
				changes.push(effectData);

				lib.debug(
					`Fixed effect with broken ID ${effectId}`,
				);
			}

			if (effectData.flagVersion === this.latestFlagVersion) continue;

			for (let [version, migration] of Object.entries(this.effectMigrations)) {
				if (!foundry.utils.isNewerVersion(version, effectVersion)) continue;

				effectData = migration(inDocument, effectData);
			}

			lib.debug(
				`Migrated effect with ID ${effectId} from version ${effectVersion} to version ${this.latestFlagVersion}`,
			);

			effectData.flagVersion = this.latestFlagVersion;

			if (!changesAdded) changes.push(effectData);
		}

		if (changes.length) {
			flagManager.addFlags(inDocument.uuid, { effects: changes });
		}

		return effects;
	},

	effectMigrations: {
		"2.0.0": (inDocument, effectData) => {
			effectData._id = effectData.id;
			effectData.creationTimestamp = effectData.timestamp;

			if (effectData.template) {
				effectData.template = {
					gridSize: effectData.template[0],
					startPoint: effectData.template[1],
					endPoint: effectData.template[2],
				};
			}

			if (effectData.attachTo) {
				effectData.attachTo = {
					active: true,
					align: "center",
					rotation: true,
					bindVisibility: true,
					bindAlpha: true,
				};
				effectData.source = inDocument.uuid;
				const objectSize = canvaslib.get_object_dimensions(inDocument, true);
				effectData.offset = {
					x: effectData.position.x - objectSize.width,
					y: effectData.position.y - objectSize.height,
				};
			} else if (effectData.position) {
				effectData.source = effectData.position;
			}

			if (effectData.reachTowards) {
				effectData.stretchTo = {
					attachTo: false,
					onlyX: false,
				};
			}

			if (effectData.filters) {
				effectData.filters = Object.entries(effectData.filters).map((entry) => {
					return {
						className: entry[0],
						...entry[1],
					};
				});
			}

			effectData.moveSpeed = effectData.speed;

			effectData.target = null;
			effectData.forcedIndex = null;
			effectData.flipX = false;
			effectData.flipY = false;
			effectData.nameOffsetMap = {};
			effectData.sequenceId = 0;

			delete effectData.id;
			delete effectData.timestamp;
			delete effectData.position;
			delete effectData.reachTowards;
			delete effectData.speed;
			delete effectData.audioVolume;
			delete effectData.gridSizeDifference;
			delete effectData.template;

			if (effectData.animatedProperties) {
				delete effectData.animatedProperties.fadeInAudio;
				delete effectData.animatedProperties.fadeOutAudio;
			}

			effectData = foundry.utils.mergeObject(
				effectData,
				effectData.animatedProperties,
			);

			delete effectData.animatedProperties;

			return effectData;
		},

		"2.0.6": (inDocument, effectData) => {
			effectData.private = null;

			return effectData;
		},

		"2.0.8": (inDocument, effectData) => {
			if (effectData.stretchTo) {
				effectData.stretchTo.tiling = false;
			}

			return effectData;
		},

		"2.0.9": (inDocument, effectData) => {
			effectData.tilingTexture = false;

			if (effectData.stretchTo?.tiling !== undefined) {
				if (effectData.stretchTo.tiling) {
					effectData.tilingTexture = {
						scale: { x: 1, y: 1 },
						position: { x: 0, y: 0 },
					};
				}
				delete effectData.stretchTo.tiling;
			}

			return effectData;
		},

		"2.1.0": (inDocument, effectData) => {
			if (effectData.randomOffset) {
				effectData.randomOffset = {
					source: !effectData.target ? effectData.randomOffset : false,
					target: !!effectData.target ? effectData.randomOffset : false,
				};
			}

			if (effectData.nameOffsetMap) {
				Object.values(effectData.nameOffsetMap).forEach((offsetMap) => {
					if (offsetMap.randomOffset) {
						offsetMap.randomOffset = {
							source: !offsetMap.target ? offsetMap.randomOffset : false,
							target: !!offsetMap.target ? offsetMap.randomOffset : false,
						};
					}
				});
			}

			return effectData;
		},

		"3.2.0": (inDocument, effectData) => {
			if (effectData.attachTo?.followRotation !== undefined) {
				effectData.attachTo.bindRotation = effectData.attachTo.followRotation;
				delete effectData.attachTo.followRotation;
			}
			if (effectData.scaleToObject) {
				if (effectData.attachTo?.active) {
					effectData.attachTo.bindScale = true;
				} else if (!effectData.attachTo?.active && !effectData.attachTo?.bindScale) {
					effectData.scaleToObject = false;
					effectData.size = canvaslib.get_object_dimensions(inDocument);
				}
			}
			return effectData;
		},

		"3.2.1": (inDocument, effectData) => {
			if (effectData.noLoop !== undefined) {
				effectData.loopOptions = {
					loops: 1,
					loopDelay: 0,
					endOnLastLoop: false
				}
				delete effectData.noLoop;
			}
			return effectData;
		}
	},

	/**
	 * Adds effects and/or sounds to a given document
	 *
	 * @param inObjectUUID
	 * @param effects
	 * @param sounds
	 */
	addFlags: (inObjectUUID, { effects = [], sounds = [] }={}) => {
		if (!Array.isArray(effects)) effects = [effects];
		if (!Array.isArray(sounds)) sounds = [sounds];
		sequencerSocket.executeAsMainUser(
			SOCKET_HANDLERS.ADD_FLAGS,
			inObjectUUID,
			effects,
			sounds
		);
	},

	/**
	 * Removes effects and/or sounds from a given document
	 *
	 * @param inObjectUUID
	 * @param effects
	 * @param removeAllEffects
	 * @param sounds
	 * @param removeAllSounds
	 */
	removeFlags: (inObjectUUID, { effects=[], removeAllEffects = false, sounds=[], removeAllSounds = false}=[]) => {
		if (!Array.isArray(effects)) effects = [effects];
		if (!Array.isArray(sounds)) sounds = [sounds];
		sequencerSocket.executeAsMainUser(
			SOCKET_HANDLERS.REMOVE_FLAGS,
			inObjectUUID,
			{ effects, removeAllEffects, sounds, removeAllSounds }
		);
	},

	_addFlags: (inObjectUUID, effects, sounds) => {
		if (!Array.isArray(effects)) effects = [effects];
		if (!Array.isArray(sounds)) sounds = [sounds];

		let flagsToSet = flagManager.flagAddBuffer.get(inObjectUUID) ?? {
			effects: [],
			sounds: [],
		};

		flagsToSet.effects.push(...effects);
		flagsToSet.sounds.push(...sounds);

		flagManager.flagAddBuffer.set(inObjectUUID, flagsToSet);

		flagManager.updateFlags();
	},

	_removeFlags: (inObjectUUID, { effects=[], removeAllEffects = false, sounds=[], removeAllSounds=false}) => {
		if (effects && !Array.isArray(effects)) effects = [effects];
		if (sounds && !Array.isArray(sounds)) sounds = [sounds];

		let flagsToSet = flagManager.flagRemoveBuffer.get(inObjectUUID) ?? {
			effects: [],
			sounds: [],
			removeAllEffects: removeAllEffects,
			removeAllSounds: removeAllSounds,
		};

		if (effects) flagsToSet.effects.push(...effects);
		if (sounds) flagsToSet.sounds.push(...sounds);

		flagManager.flagRemoveBuffer.set(inObjectUUID, flagsToSet);

		flagManager.updateFlags();
	},

	updateFlags: foundry.utils.debounce(async () => {
		let database = flagManager.database;
		if(!database) return;

		let flagsToAdd = Array.from(flagManager.flagAddBuffer);
		let flagsToRemove = Array.from(flagManager.flagRemoveBuffer);

		if(flagsToAdd.length === 0 && flagsToRemove.length === 0) return;

		flagManager.flagAddBuffer.clear();
		flagManager.flagRemoveBuffer.clear();

		flagsToAdd.forEach((entry) => (entry[1].original = true));
		flagsToRemove.forEach((entry) => (entry[1].original = true));

		const objects = new Set([
			...flagsToAdd.map((effect) => effect[0]).filter(Boolean),
			...flagsToRemove.map((effect) => effect[0]).filter(Boolean),
		]);

		flagsToAdd = new Map(flagsToAdd);
		flagsToRemove = new Map(flagsToRemove);

		const effectUpdate = {};
		const soundUpdate = {};

		const allEffectFlags = flagManager.getDatabaseFlags().effects;
		const allSoundFlags = flagManager.getDatabaseFlags().sounds;

		for (let objectUUID of objects) {
			let object = fromUuidSync(objectUUID);

			if (!object) {
				lib.forceDeletionKeyWrapper(effectUpdate, "-=" + objectUUID.replaceAll(".", "-"))
				lib.forceDeletionKeyWrapper(soundUpdate, "-=" + objectUUID.replaceAll(".", "-"))
				continue;
			}

			const isLinkedToken = object instanceof TokenDocument && object.actorLink;
			const isLinkedActor = object instanceof Actor && object.prototypeToken.actorLink;

			let toAdd = flagsToAdd.get(objectUUID) ?? { effects: [], sounds: [] };
			let toRemove = flagsToRemove.get(objectUUID) ?? {
				effects: [],
				removeAllEffects: false,
				sounds: [],
				removeAllSounds: false,
			};

			let origExistingEffectFlags = allEffectFlags[object.uuid] ?? [];
			if (isLinkedToken) {
				origExistingEffectFlags = origExistingEffectFlags.concat(allEffectFlags[object?.actor?.uuid] ?? []);
			}
			const existingEffectFlags = new Map(origExistingEffectFlags);

			let origExistingSoundFlags = allSoundFlags[object.uuid] ?? [];
			if (isLinkedToken) {
				origExistingSoundFlags = origExistingSoundFlags.concat(allSoundFlags[object?.actor?.uuid] ?? []);
			}
			const existingSoundFlags = new Map(origExistingSoundFlags);

			if (toRemove?.removeAllEffects) {
				toRemove.effects = Array.from(existingEffectFlags).map((entry) => entry[0]);
			}

			if (toRemove?.removeAllSounds) {
				toRemove.sounds = Array.from(existingSoundFlags).map((entry) => entry[0]);
			}

			for (let effect of toAdd.effects) {
				if (typeof effect === "string") {
					effect = existingEffectFlags.get(effect);
					if (!effect) continue;
				}
				existingEffectFlags.set(effect._id, effect);
			}

			for (let sound of toAdd.sounds) {
				if (typeof sound === "string") {
					sound = existingSoundFlags.get(sound);
					if (!sound) continue;
				}
				existingSoundFlags.set(sound._id, sound);
			}

			for (let effect of toRemove.effects) {
				if (typeof effect === "string") {
					effect = existingEffectFlags.get(effect);
					if (!effect) continue;
				}
				existingEffectFlags.delete(effect._id);
			}

			for (let sound of toRemove.sounds) {
				if (typeof sound === "string") {
					sound = existingSoundFlags.get(sound);
					if (!sound) continue;
				}
				existingSoundFlags.delete(sound._id);
			}

			let effectFlagsToSet = Array.from(existingEffectFlags);
			let soundFlagsToSet = Array.from(existingSoundFlags);

			let actorEffectFlags = [];
			let actorSoundFlags = [];
			let actor = object?.actor ?? object;
			if (
				actor instanceof foundry.documents.Actor &&
				(isLinkedToken || isLinkedActor) &&
				(toAdd.original || toRemove.original)
			) {
				actorEffectFlags = effectFlagsToSet.filter(
					(effect) => lib.is_UUID(effect[1]?.source) && effect[1]?.attachTo?.active && effect[1]?.persistOptions?.persistTokenPrototype,
				);
				effectFlagsToSet = effectFlagsToSet.filter(
					(effect) => !effect[1]?.persistOptions?.persistTokenPrototype || !lib.is_UUID(effect[1]?.source) || !effect[1]?.attachTo?.active,
				);
				
				actorSoundFlags = soundFlagsToSet.filter(
					(sound) => lib.is_UUID(sound[1]?.source) && sound[1]?.attachTo?.active && sound[1]?.persistOptions?.persistTokenPrototype,
				);
				soundFlagsToSet = soundFlagsToSet.filter(
					(sound) => !sound[1]?.persistOptions?.persistTokenPrototype || !lib.is_UUID(sound[1]?.source) || !sound[1]?.attachTo?.active,
				);
			}

			let objectSanitizedUuid = object.uuid.replaceAll(".", "-");
			if(effectFlagsToSet.length) {
				effectUpdate[objectSanitizedUuid] = effectFlagsToSet;
			}else{
				lib.forceDeletionKeyWrapper(effectUpdate, "-=" + objectSanitizedUuid)
			}
			
			if(soundFlagsToSet.length) {
				soundUpdate[objectSanitizedUuid] = soundFlagsToSet;
			}else{
				lib.forceDeletionKeyWrapper(soundUpdate, "-=" + objectSanitizedUuid)
			}

			if(actor instanceof foundry.documents.Actor) {
				let actorSanitizedUuid = actor.uuid.replaceAll(".", "-");
				if (actorEffectFlags.length) {
					effectUpdate[actorSanitizedUuid] = actorEffectFlags;
				} else {
					lib.forceDeletionKeyWrapper(effectUpdate, "-=" + actorSanitizedUuid)
				}
				if (actorSoundFlags.length) {
					soundUpdate[actorSanitizedUuid] = actorSoundFlags;
				} else {
					lib.forceDeletionKeyWrapper(soundUpdate, "-=" + actorSanitizedUuid)
				}
			}
		}

		await database.update({
			[CONSTANTS.EFFECTS_FLAG]: effectUpdate,
			[CONSTANTS.SOUNDS_FLAG]: soundUpdate
		});
	}, 250),

	soundMigrations: {},

	/**
	 * Sanitizes the effect data, accounting for changes to the structure in previous versions
	 *
	 * @param inDocument
	 * @param databaseFlags
	 * @returns {array}
	 */
	getSoundFlags(inDocument, databaseFlags=null) {

		if(!inDocument?.uuid) return [];

		let allSounds = databaseFlags ?? this.getDatabaseFlags().sounds;
		let sounds = allSounds[inDocument.uuid] ?? []

		if (!sounds?.length) return [];

		sounds = foundry.utils.deepClone(sounds);

		const changes = [];
		for (let [soundId, soundData] of sounds) {
			let soundVersion = soundData?.flagVersion ?? "1.0.0";

			if (soundData.flagVersion === this.latestFlagVersion) continue;

			for (let [version, migration] of Object.entries(this.soundMigrations)) {
				if (!foundry.utils.isNewerVersion(version, soundVersion)) continue;

				soundData = migration(inDocument, soundData);
			}

			lib.debug(
				`Migrated sound with ID ${soundId} from version ${soundVersion} to version ${this.latestFlagVersion}`,
			);

			soundData.flagVersion = this.latestFlagVersion;

			changes.push(soundData);
		}

		if (changes.length) {
			flagManager.addFlags(inDocument.uuid, { effects: changes });
		}

		return sounds;
	},

};

export default flagManager;
