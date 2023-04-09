import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "../constants.js";

const flagManager = {

  flagAddBuffer: new Map(), flagRemoveBuffer: new Map(), _latestFlagVersion: false,

  get latestFlagVersion() {
    if (!this._latestFlagVersion) {
      const versions = Object.keys(this.migrations);
      versions.sort((a, b) => {
        return isNewerVersion(a, b) ? -1 : 1;
      })
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
  getFlags(inDocument) {

    let effects = getProperty(inDocument, `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`);

    if (!effects?.length) return [];

    effects = foundry.utils.deepClone(effects);

    const changes = [];
    for (let [effectId, effectData] of effects) {

      let effectVersion = effectData?.flagVersion ?? "1.0.0";

      if (effectData.flagVersion === this.latestFlagVersion) continue;

      for (let [version, migration] of Object.entries(this.migrations)) {

        if (!isNewerVersion(version, effectVersion)) continue;

        effectData = migration(inDocument, effectData);

      }

      lib.debug(`Migrated effect with ID ${effectId} from version ${effectVersion} to version ${this.latestFlagVersion}`)

      effectData.flagVersion = this.latestFlagVersion;

      changes.push(effectData)
    }

    if (changes.length) {
      flagManager.addFlags(inDocument.uuid, changes);
    }

    return effects;

  },

  migrations: {
    "2.0.0": (inDocument, effectData) => {

      effectData._id = effectData.id;
      effectData.creationTimestamp = effectData.timestamp;

      if (effectData.template) {
        effectData.template = {
          gridSize: effectData.template[0], startPoint: effectData.template[1], endPoint: effectData.template[2]
        }
      }

      if (effectData.attachTo) {
        effectData.attachTo = {
          active: true, align: "center", rotation: true, bindVisibility: true, bindAlpha: true
        };
        effectData.source = inDocument.uuid;
        const objectSize = canvaslib.get_object_dimensions(inDocument, true);
        effectData.offset = {
          x: (effectData.position.x) - objectSize.width, y: (effectData.position.y) - objectSize.height,
        }
      } else if (effectData.position) {
        effectData.source = effectData.position;
      }

      if (effectData.reachTowards) {
        effectData.stretchTo = {
          attachTo: false, onlyX: false
        }
      }

      if (effectData.filters) {
        effectData.filters = Object.entries(effectData.filters)
          .map(entry => {
            return {
              className: entry[0], ...entry[1]
            }
          })
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

      effectData = foundry.utils.mergeObject(effectData, effectData.animatedProperties)

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
            scale: { x: 1, y: 1 }, position: { x: 0, y: 0 }
          }
        }
        delete effectData.stretchTo.tiling;
      }

      return effectData;
    },

    "2.1.0": (inDocument, effectData) => {

      if (effectData.randomOffset) {
        effectData.randomOffset = {
          source: !effectData.target ? effectData.randomOffset : false,
          target: !!effectData.target ? effectData.randomOffset : false
        };
      }

      if (effectData.nameOffsetMap) {
        Object.values(effectData.nameOffsetMap).forEach(offsetMap => {
          if (offsetMap.randomOffset) {
            offsetMap.randomOffset = {
              source: !offsetMap.target ? offsetMap.randomOffset : false,
              target: !!offsetMap.target ? offsetMap.randomOffset : false
            };
          }
        })
      }

      return effectData;
    }
  },

  /**
   * Adds effects to a given document
   *
   * @param inObjectUUID
   * @param inEffects
   */
  addFlags: (inObjectUUID, inEffects) => {
    if (!Array.isArray(inEffects)) inEffects = [inEffects];
    sequencerSocket.executeAsGM(SOCKET_HANDLERS.ADD_FLAGS, inObjectUUID, inEffects);
  },

  /**
   * Removes effects from a given document
   *
   * @param inObjectUUID
   * @param inEffects
   * @param removeAll
   */
  removeFlags: (inObjectUUID, inEffects, removeAll = false) => {
    sequencerSocket.executeAsGM(SOCKET_HANDLERS.REMOVE_FLAGS, inObjectUUID, inEffects, removeAll);
  },

  _addFlags: (inObjectUUID, inEffects) => {

    if (!Array.isArray(inEffects)) inEffects = [inEffects];

    let flagsToSet = flagManager.flagAddBuffer.get(inObjectUUID) ?? { effects: [] };

    flagsToSet.effects.push(...inEffects);

    flagManager.flagAddBuffer.set(inObjectUUID, flagsToSet);

    flagManager.updateFlags();

  },

  _removeFlags: (inObjectUUID, inEffects, removeAll = false) => {

    if (inEffects && !Array.isArray(inEffects)) inEffects = [inEffects];

    let flagsToSet = flagManager.flagRemoveBuffer.get(inObjectUUID) ?? { effects: [], removeAll: removeAll };

    if (inEffects) flagsToSet.effects.push(...inEffects);

    flagManager.flagRemoveBuffer.set(inObjectUUID, flagsToSet);

    flagManager.updateFlags();

  },

  updateFlags: debounce(async () => {

    let flagsToAdd = Array.from(flagManager.flagAddBuffer);
    let flagsToRemove = Array.from(flagManager.flagRemoveBuffer);

    flagManager.flagAddBuffer.clear();
    flagManager.flagRemoveBuffer.clear();

    flagsToAdd.forEach(entry => entry[1].original = true);
    flagsToRemove.forEach(entry => entry[1].original = true);

    const objects = new Set([
      ...flagsToAdd.map(effect => effect[0]).filter(Boolean),
      ...flagsToRemove.map(effect => effect[0]).filter(Boolean)
    ]);

    flagsToAdd = new Map(flagsToAdd);
    flagsToRemove = new Map(flagsToRemove);

    const actorUpdates = {};
    const sceneObjectsToUpdate = {};

    for (let objectUUID of objects) {

      let object = lib.from_uuid_fast(objectUUID);

      if (!object) {
        lib.custom_warning("Sequencer", `Failed to set flags on non-existent object with UUID: ${objectUUID}`);
        continue;
      }

      let toAdd = flagsToAdd.get(objectUUID) ?? { effects: [] };
      let toRemove = flagsToRemove.get(objectUUID) ?? { effects: [], removeAll: false };

      const existingFlags = new Map(getProperty(object, `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`) ?? []);

      if (toRemove?.removeAll) {
        toRemove.effects = Array.from(existingFlags).map(entry => entry[0]);
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

      const isLinkedToken = (object instanceof TokenDocument && object.actorLink);
      const isLinkedActor = (object instanceof Actor && object.prototypeToken.actorLink);

      if ((isLinkedToken || isLinkedActor) && (toAdd.original || toRemove.original)) {
        const actor = isLinkedActor ? object : object.actor;
        actorUpdates[actor.id] = flagsToSet.filter(effect => effect[1]?.persistOptions?.persistTokenPrototype);
        flagsToSet = flagsToSet.filter(effect => !effect[1]?.persistOptions?.persistTokenPrototype);
        if (isLinkedToken && game.modules.get("multilevel-tokens")?.active && getProperty(object, "flags.multilevel-tokens.stoken")) {
          options["mlt_bypass"] = true;
        }
      }

      if (object?.documentName === "Scene") {
        const sceneId = object.id;
        sceneObjectsToUpdate[sceneId] = sceneObjectsToUpdate[sceneId] ?? {
          updates: {},
          documents: {}
        };
        sceneObjectsToUpdate[sceneId].updates[`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`] = flagsToSet;
      } else if (!(object instanceof Actor)){
        const sceneId = object.parent.id;
        const docName = object.documentName;
        sceneObjectsToUpdate[sceneId] = sceneObjectsToUpdate[sceneId] ?? {
          updates: {},
          documents: {}
        };
        sceneObjectsToUpdate[sceneId].documents[docName] = sceneObjectsToUpdate[sceneId].documents[docName] ?? {
          options: {},
          updates: []
        };
        sceneObjectsToUpdate[sceneId].documents[docName].options = options;
        sceneObjectsToUpdate[sceneId].documents[docName].updates.push({
          _id: object.id,
          [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagsToSet
        })
      }
    }

    for (const [sceneId, sceneData] of Object.entries(sceneObjectsToUpdate)) {
      const scene = game.scenes.get(sceneId);
      if(!foundry.utils.isEmpty(sceneData.updates)) {
        await scene.update(sceneData.updates)
      }
      for (const [documentType, documentData] of Object.entries(sceneData.documents)) {
        await scene.updateEmbeddedDocuments(documentType, documentData.updates, documentData.options);
        lib.debug(`Flags set for documents of type "${documentType}" in scene with ID "${sceneId}"`)
      }
    }

    await Actor.updateDocuments(Object.entries(actorUpdates).map(([actorId, effects]) => ({
      _id: actorId,
      [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: effects
    })));

  }, 250)

};

export default flagManager;
