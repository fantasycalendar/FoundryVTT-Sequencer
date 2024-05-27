import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "../constants.js";

const flagManager = {
	flagEffectAddBuffer: new Map(),
	flagEffectRemoveBuffer: new Map(),
	flagSoundAddBuffer: new Map(),
	flagSoundRemoveBuffer: new Map(),
	_latestFlagVersion: false,

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
	 * @returns {array}
	 */
	getEffectFlags(inDocument) {
		let effects = foundry.utils.getProperty(inDocument, CONSTANTS.EFFECTS_FLAG);

		if (!effects?.length) return [];

		effects = foundry.utils.deepClone(effects);

		const changes = [];
		for (let [effectId, effectData] of effects) {
			let effectVersion = effectData?.flagVersion ?? "1.0.0";

			if (effectData.flagVersion === this.latestFlagVersion) continue;

			for (let [version, migration] of Object.entries(this.effectMigrations)) {
				if (!foundry.utils.isNewerVersion(version, effectVersion)) continue;

				effectData = migration(inDocument, effectData);
			}

			lib.debug(
				`Migrated effect with ID ${effectId} from version ${effectVersion} to version ${this.latestFlagVersion}`,
			);

			effectData.flagVersion = this.latestFlagVersion;

			changes.push(effectData);
		}

		if (changes.length) {
			flagManager.addEffectFlags(inDocument.uuid, changes);
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
	},

	/**
	 * Adds effects to a given document
	 *
	 * @param inObjectUUID
	 * @param inEffects
	 */
	addEffectFlags: (inObjectUUID, inEffects) => {
		if (!Array.isArray(inEffects)) inEffects = [inEffects];
		sequencerSocket.executeAsGM(
			SOCKET_HANDLERS.ADD_EFFECT_FLAGS,
			inObjectUUID,
			inEffects,
		);
	},

	/**
	 * Removes effects from a given document
	 *
	 * @param inObjectUUID
	 * @param inEffects
	 * @param removeAll
	 */
	removeEffectFlags: (inObjectUUID, inEffects, removeAll = false) => {
		sequencerSocket.executeAsGM(
			SOCKET_HANDLERS.REMOVE_EFFECT_FLAGS,
			inObjectUUID,
			inEffects,
			removeAll,
		);
	},

	_addEffectFlags: (inObjectUUID, inEffects) => {
		if (!Array.isArray(inEffects)) inEffects = [inEffects];

		let flagsToSet = flagManager.flagEffectAddBuffer.get(inObjectUUID) ?? {
			effects: [],
		};

		flagsToSet.effects.push(...inEffects);

		flagManager.flagEffectAddBuffer.set(inObjectUUID, flagsToSet);

		flagManager.updateEffectFlags();
	},

	_removeEffectFlags: (inObjectUUID, inEffects, removeAll = false) => {
		if (inEffects && !Array.isArray(inEffects)) inEffects = [inEffects];

		let flagsToSet = flagManager.flagEffectRemoveBuffer.get(inObjectUUID) ?? {
			effects: [],
			removeAll: removeAll,
		};

		if (inEffects) flagsToSet.effects.push(...inEffects);

		flagManager.flagEffectRemoveBuffer.set(inObjectUUID, flagsToSet);

		flagManager.updateEffectFlags();
	},

	updateEffectFlags: debounce(async () => {
		let flagsToAdd = Array.from(flagManager.flagEffectAddBuffer);
		let flagsToRemove = Array.from(flagManager.flagEffectRemoveBuffer);

		flagManager.flagEffectAddBuffer.clear();
		flagManager.flagEffectRemoveBuffer.clear();

		flagsToAdd.forEach((entry) => (entry[1].original = true));
		flagsToRemove.forEach((entry) => (entry[1].original = true));

		const objects = new Set([
			...flagsToAdd.map((effect) => effect[0]).filter(Boolean),
			...flagsToRemove.map((effect) => effect[0]).filter(Boolean),
		]);

		flagsToAdd = new Map(flagsToAdd);
		flagsToRemove = new Map(flagsToRemove);

		const actorUpdates = {};
		const sceneObjectsToUpdate = {};

		for (let objectUUID of objects) {
			let object = fromUuidSync(objectUUID);

			if (!object) {
				lib.debug(
					`Failed to set flags on non-existent object with UUID: ${objectUUID}`,
				);
				continue;
			}

			let toAdd = flagsToAdd.get(objectUUID) ?? { effects: [] };
			let toRemove = flagsToRemove.get(objectUUID) ?? {
				effects: [],
				removeAll: false,
			};

			const existingFlags = new Map(
				foundry.utils.getProperty(object, CONSTANTS.EFFECTS_FLAG) ?? [],
			);

			if (toRemove?.removeAll) {
				toRemove.effects = Array.from(existingFlags).map((entry) => entry[0]);
			}

			for (let effect of toAdd.effects) {
				if (typeof effect === "string") {
					effect = existingFlags.get(effect);
					if (!effect) continue;
				}
				existingFlags.set(effect._id, effect);
			}

			for (let effect of toRemove.effects) {
				if (typeof effect === "string") {
					effect = existingFlags.get(effect);
					if (!effect) continue;
				}
				existingFlags.delete(effect._id);
			}

			let flagsToSet = Array.from(existingFlags);
			const options = {};

			const isLinkedToken = object instanceof TokenDocument && object.actorLink;
			const isLinkedActor =
				object instanceof Actor && object.prototypeToken.actorLink;

			if (
				(isLinkedToken || isLinkedActor) &&
				(toAdd.original || toRemove.original)
			) {
				const actor = isLinkedActor ? object : object.actor;
				actorUpdates[actor.id] = flagsToSet.filter(
					(effect) => effect[1]?.persistOptions?.persistTokenPrototype,
				);
				flagsToSet = flagsToSet.filter(
					(effect) => !effect[1]?.persistOptions?.persistTokenPrototype,
				);
				if (
					isLinkedToken &&
					game.modules.get("multilevel-tokens")?.active &&
					foundry.utils.getProperty(object, "flags.multilevel-tokens.stoken")
				) {
					options["mlt_bypass"] = true;
				}
			}

			if (object?.documentName === "Scene") {
				const sceneId = object.id;
				sceneObjectsToUpdate[sceneId] = sceneObjectsToUpdate[sceneId] ?? {
					updates: {},
					documents: {},
				};
				sceneObjectsToUpdate[sceneId].updates[CONSTANTS.EFFECTS_FLAG] =
					flagsToSet;
			} else if (!(object instanceof Actor)) {
				const sceneId = object.parent.id;
				const docName = object.documentName;
				sceneObjectsToUpdate[sceneId] = sceneObjectsToUpdate[sceneId] ?? {
					updates: {},
					documents: {},
				};
				sceneObjectsToUpdate[sceneId].documents[docName] = sceneObjectsToUpdate[
					sceneId
					].documents[docName] ?? {
					options: {},
					updates: [],
				};
				sceneObjectsToUpdate[sceneId].documents[docName].options = options;
				sceneObjectsToUpdate[sceneId].documents[docName].updates.push({
					_id: object.id,
					[CONSTANTS.EFFECTS_FLAG]: flagsToSet,
				});
			}
		}

		for (const [sceneId, sceneData] of Object.entries(sceneObjectsToUpdate)) {
			const scene = game.scenes.get(sceneId);
			if (!foundry.utils.isEmpty(sceneData.updates)) {
				await scene.update(sceneData.updates);
			}
			for (const [documentType, documentData] of Object.entries(
				sceneData.documents,
			)) {
				await scene.updateEmbeddedDocuments(
					documentType,
					documentData.updates,
					documentData.options,
				);
				lib.debug(
					`Flags set for documents of type "${documentType}" in scene with ID "${sceneId}"`,
				);
			}
		}

		await Actor.updateDocuments(
			Object.entries(actorUpdates).map(([actorId, effects]) => ({
				_id: actorId,
				[CONSTANTS.EFFECTS_FLAG]: effects,
			})),
		);
	}, 250),

	/**
	 * Sanitizes the effect data, accounting for changes to the structure in previous versions
	 *
	 * @param inDocument
	 * @returns {array}
	 */
	getSoundFlags(inDocument) {
		let sounds = foundry.utils.getProperty(inDocument, CONSTANTS.SOUNDS_FLAG);

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
			flagManager.addSoundFlags(inDocument.uuid, changes);
		}

		return sounds;
	},

	soundMigrations: {},

	/**
	 * Adds sounds to a given document
	 *
	 * @param inObjectUUID
	 * @param inSounds
	 */
	addSoundFlags: (inObjectUUID, inSounds) => {
		if (!Array.isArray(inSounds)) inSounds = [inSounds];
		sequencerSocket.executeAsGM(
			SOCKET_HANDLERS.ADD_EFFECT_FLAGS,
			inObjectUUID,
			inSounds,
		);
	},

	/**
	 * Removes sounds from a given document
	 *
	 * @param inObjectUUID
	 * @param inSounds
	 * @param removeAll
	 */
	removeSoundFlags: (inObjectUUID, inSounds, removeAll = false) => {
		sequencerSocket.executeAsGM(
			SOCKET_HANDLERS.REMOVE_EFFECT_FLAGS,
			inObjectUUID,
			inSounds,
			removeAll,
		);
	},

	_addSoundFlags: (sceneID, inSounds) => {
		if (!Array.isArray(inSounds)) inSounds = [inSounds];

		let flagsToSet = flagManager.flagAddBuffer.get(sceneID) ?? {
			effects: [],
		};

		flagsToSet.effects.push(...inSounds);

		flagManager.flagSoundAddBuffer.set(sceneID, flagsToSet);

		flagManager.updateSoundFlags();
	},

	_removeSoundFlags: (sceneID, inSounds, removeAll = false) => {
		if (inSounds && !Array.isArray(inSounds)) inSounds = [inSounds];

		let flagsToSet = flagManager.flagRemoveBuffer.get(sceneID) ?? {
			effects: [],
			removeAll: removeAll,
		};

		if (inSounds) flagsToSet.effects.push(...inSounds);

		flagManager.flagSoundRemoveBuffer.set(sceneID, flagsToSet);

		flagManager.updateSoundFlags();
	},

	updateFlags: debounce(async () => {

		let soundFlagsToAdd = Array.from(flagManager.flagSoundAddBuffer);
		let soundFlagsToRemove = Array.from(flagManager.flagSoundRemoveBuffer);

		flagManager.flagSoundAddBuffer.clear();
		flagManager.flagSoundRemoveBuffer.clear();

		soundFlagsToAdd.forEach((entry) => (entry[1].original = true));
		soundFlagsToRemove.forEach((entry) => (entry[1].original = true));

		const scenes = new Set([
			...soundFlagsToAdd.map((sound) => sound[0]).filter(Boolean),
			...soundFlagsToRemove.map((sound) => sound[0]).filter(Boolean),
		]);

		soundFlagsToAdd = new Map(soundFlagsToAdd);
		soundFlagsToRemove = new Map(soundFlagsToRemove);

		const scenesToUpdate = {};

		for (let sceneId of scenes) {
			let scene = game.scenes.get(sceneId);

			if (!scene) {
				lib.debug(
					`Failed to set flags on non-existent scene with ID: ${sceneId}`,
				);
				continue;
			}

			let soundsToAdd = soundFlagsToAdd.get(sceneId) ?? { sounds: [] };
			let soundsToRemove = soundFlagsToRemove.get(sceneId) ?? {
				sounds: [],
				removeAll: false,
			};

			const existingFlags = new Map(
				foundry.utils.getProperty(scene, CONSTANTS.SOUNDS_FLAG) ?? [],
			);

			if (soundsToRemove?.removeAll) {
				soundsToRemove.sounds = Array.from(existingFlags).map((entry) => entry[0]);
			}

			for (let sound of soundsToAdd.sounds) {
				if (typeof sound === "string") {
					sound = existingFlags.get(sound);
					if (!sound) continue;
				}
				existingFlags.set(sound.sound_id, sound);
			}

			for (let sound of soundsToRemove.sounds) {
				if (typeof sound === "string") {
					sound = existingFlags.get(sound);
					if (!sound) continue;
				}
				existingFlags.delete(sound.sound_id);
			}

			let flagsToSet = Array.from(existingFlags);

			scenesToUpdate[sceneId] = scenesToUpdate[sceneId] ?? {
				updates: {},
				documents: {},
			};

			scenesToUpdate[sceneId].updates[CONSTANTS.EFFECTS_FLAG] = flagsToSet;

		}

		for (const [sceneId, sceneData] of Object.entries(scenesToUpdate)) {
			const scene = game.scenes.get(sceneId);
			await scene.update(sceneData.updates);
		}

	}, 250),

};

export default flagManager;
