import CanvasEffect from "../canvas-effects/canvas-effect.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import * as lib from "../lib/lib.js";
import flagManager from "../utils/flag-manager.js";
import CONSTANTS from "../constants.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";

const PositionContainer = new Map();
const TemporaryPositionsContainer = new Map();

export default class SequencerEffectManager {
  /**
   * Returns all of the currently running effects on the canvas
   *
   * @returns {Array}
   */
  static get effects() {
    return Array.from(SequenceManager.VisibleEffects.values());
  }

  static _updatePosition(uuid, position) {
    TemporaryPositionsContainer.set(uuid, position);
  }

  static getPositionForUUID(uuid) {
    return TemporaryPositionsContainer.get(uuid);
  }

  /**
   * Opens the Sequencer Effects UI with the effects tab open
   */
  static show() {
    return EffectsUIApp.show({ tab: "manager" });
  }

  /**
   * Play an effect on the canvas.
   *
   * @param {object} data The data that describes the audio to play
   * @param {boolean} [push=true] A flag indicating whether or not to make other clients play the effect
   * @returns {CanvasEffect} A CanvasEffect object
   */
  static async play(data, push = true) {
    if (!lib.user_can_do("permissions-effect-create")) {
      lib.custom_warning(
        "Sequencer",
        "EffectManager | play | Players do not have permissions to play effects. This can be configured in Sequencer's module settings."
      );
      return;
    }
    if (push)
      sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_EFFECT, data);
    if (data?.persistOptions?.persistTokenPrototype) {
      this._playPrototypeTokenEffects(data, push);
    }
    return this._playEffect(data);
  }

  /**
   * Get effects that are playing on the canvas based on a set of filters
   *
   * @param {object} inFilter An object containing filters that determine which effects to return
   *                             - object: An ID or a PlaceableObject
   *                             - name: The name of the effect
   *                             - sceneId: the ID of the scene to search within
   * @returns {Array} An array containing effects that match the given filter
   */
  static getEffects(inFilter = {}) {
    const filters = this._validateFilters(inFilter);
    if (!inFilter)
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | getEffects | Incorrect or incomplete parameters provided"
      );
    return this._filterEffects(filters);
  }

  /**
   * Updates effects based on a set of filters
   *
   * @param {object} inFilter An object containing filters that determine which effects to return
   *                             - object: An ID or a PlaceableObject
   *                             - name: The name of the effect
   *                             - sceneId: the ID of the scene to search within
   *                             - effects: a single CanvasEffect or its ID, or an array of such
   * @param {object} inUpdates
   * @returns {promise}
   */
  static updateEffects(inFilter, inUpdates) {
    inFilter = this._validateFilters(inFilter);
    if (!inFilter)
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | updateEffects | Incorrect or incomplete parameters provided"
      );

    CanvasEffect.validateUpdate(inUpdates);

    const effectsToUpdate = this._filterEffects(inFilter).filter(
      (effect) => effect.userCanUpdate
    );

    return Promise.allSettled(
      effectsToUpdate.map((effect) => effect.update(inUpdates))
    );
  }

  /**
   * End effects that are playing on the canvas based on a set of filters
   *
   * @param {object} inFilter An object containing filters that determine which effects to end
   *                             - object: An ID or a PlaceableObject
   *                             - name: The name of the effect
   *                             - sceneId: the ID of the scene to search within
   *                             - effects: a single CanvasEffect or its ID, or an array of such
   * @param {boolean} [push=true] A flag indicating whether or not to make other clients end the effects
   * @returns {promise} A promise that resolves when the effects have ended
   */
  static async endEffects(inFilter = {}, push = true) {
    inFilter = this._validateFilters(inFilter);
    if (!inFilter)
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | endEffects | Incorrect or incomplete parameters provided"
      );
    const effectsToEnd = this._getEffectsByFilter(inFilter);
    if (!effectsToEnd.length) return;
    if (push)
      sequencerSocket.executeForOthers(
        SOCKET_HANDLERS.END_EFFECTS,
        effectsToEnd
      );
    return this._endManyEffects(effectsToEnd);
  }

  /**
   * End all effects that are playing on the canvas
   *
   * @param {string} [inSceneId] A parameter which determines which scene to end all effects on, defaults to current viewed scene
   * @param {boolean} [push=true] A flag indicating whether or not to make other clients end all effects
   * @returns {promise} A promise that resolves when all of the effects have _ended
   */
  static async endAllEffects(inSceneId = game.user.viewedScene, push = true) {
    const inFilter = this._validateFilters({ sceneId: inSceneId });
    if (!inFilter)
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | endAllEffects | Incorrect or incomplete parameters provided"
      );
    const effectsToEnd = this._getEffectsByFilter(inFilter);
    if (!effectsToEnd.length) return;
    if (push)
      sequencerSocket.executeForOthers(
        SOCKET_HANDLERS.END_EFFECTS,
        effectsToEnd
      );
    return this._endManyEffects(effectsToEnd);
  }

  static _getEffectsByFilter(inFilter) {
    return lib.make_array_unique(
      this._filterEffects(inFilter)
        .filter((effect) => effect.userCanDelete)
        .map((effect) => {
          return effect.data?.persistOptions?.persistTokenPrototype
            ? effect.data?.persistOptions?.id ?? effect.id
            : effect.id;
        })
    );
  }

  /**
   * If an effect has been named its position will be cached, which can be retrieved with this method
   *
   * @param {string} inName
   * @returns {object|boolean}
   * @private
   */
  static getEffectPositionByName(inName) {
    if (!(typeof inName === "string"))
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | getEffectPositionByName | inName must be of type string"
      );
    return PositionContainer.get(inName) ?? false;
  }

  /**
   * Filters the existing effects based on the given filter
   *
   * @param inFilter
   * @returns {array}
   * @private
   */
  static _filterEffects(inFilter) {
    if (inFilter.name) {
      inFilter.name = new RegExp(
        lib.str_to_search_regex_str(lib.safe_str(inFilter.name)),
        "gu"
      );
    }
    let effects = this.effects;
    if (inFilter.sceneId && inFilter.sceneId !== canvas.scene.id) {
      effects = lib
        .get_all_documents_from_scene(inFilter.sceneId)
        .map((doc) => {
          return getProperty(doc, CONSTANTS.EFFECTS_FLAG);
        })
        .filter((flags) => !!flags)
        .map((flags) => {
          return flags.map((flag) => CanvasEffect.make(flag[1]));
        })
        .deepFlatten();
    }
    return effects.filter((effect) => {
      return (
        (!inFilter.effects || inFilter.effects.includes(effect.id)) &&
        (!inFilter.name ||
          (effect.data.name &&
            effect.data.name.match(inFilter.name)?.length)) &&
        (!inFilter.source || inFilter.source === effect.data.source) &&
        (!inFilter.target || inFilter.target === effect.data.target) &&
        (!inFilter.origin || inFilter.origin === effect.data.origin)
      );
    });
  }

  /**
   * Validates an object actually exists, and gets its UUID
   *
   * @param object
   * @param sceneId
   * @returns {string}
   * @private
   */
  static _validateObject(object, sceneId) {
    if (
      !(
        object instanceof foundry.abstract.Document ||
        object instanceof PlaceableObject ||
        typeof object === "string"
      )
    ) {
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | object must be instance of PlaceableObject or of type string"
      );
    } else if (
      object instanceof PlaceableObject ||
      object instanceof foundry.abstract.Document
    ) {
      object = lib.get_object_identifier(object?.document ?? object);
    } else if (typeof object === "string") {
      const actualObject = lib.get_object_from_scene(object, sceneId);
      if (!actualObject) {
        throw lib.custom_error(
          "Sequencer",
          `EffectManager | could not find object with ID: ${object}`
        );
      }
      const uuid = lib.get_object_identifier(actualObject);
      if (!uuid) {
        throw lib.custom_error(
          "Sequencer",
          `EffectManager | could could not establish identifier of object with ID: ${object}`
        );
      }
      object = uuid;
    }

    return object;
  }

  /**
   * Validates the filter given to any of the above public methods
   *
   * @param inFilter
   * @returns {boolean}
   * @private
   */
  static _validateFilters(inFilter) {
    if (inFilter?.sceneId) {
      if (typeof inFilter.sceneId !== "string")
        throw lib.custom_error(
          "Sequencer",
          "EffectManager | inFilter.sceneId must be of type string"
        );
      if (!game.scenes.get(inFilter.sceneId))
        throw lib.custom_error(
          "Sequencer",
          "EffectManager | inFilter.sceneId must be a valid scene id (could not find scene)"
        );
    } else {
      inFilter.sceneId = game.user.viewedScene;
    }

    if (inFilter?.object) {
      inFilter.source = this._validateObject(inFilter.object, inFilter.sceneId);
      delete inFilter.object;
    }

    if (inFilter?.source) {
      inFilter.source = this._validateObject(inFilter.source, inFilter.sceneId);
    }

    if (inFilter?.target) {
      inFilter.target = this._validateObject(inFilter.target, inFilter.sceneId);
    }

    if (inFilter?.name && typeof inFilter?.name !== "string")
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | inFilter.name must be of type string"
      );
    if (inFilter?.origin && typeof inFilter?.origin !== "string")
      throw lib.custom_error(
        "Sequencer",
        "EffectManager | inFilter.origin must be of type string"
      );

    if (inFilter?.effects) {
      if (!Array.isArray(inFilter.effects))
        inFilter.effects = [inFilter.effects];
      inFilter.effects = inFilter.effects.map((effect) => {
        if (!(typeof effect === "string" || effect instanceof CanvasEffect))
          throw lib.custom_error(
            "Sequencer",
            "EffectManager | collections in inFilter.effects must be of type string or CanvasEffect"
          );
        if (effect instanceof CanvasEffect) return effect.id;
        return effect;
      });
    }

    if (
      !inFilter.name &&
      !inFilter.origin &&
      !inFilter.target &&
      !inFilter.sceneId &&
      !inFilter.effects &&
      !inFilter.origin
    )
      return false;

    return foundry.utils.mergeObject(
      {
        effects: false,
        name: false,
        source: false,
        target: false,
        sceneId: false,
        origin: false,
      },
      inFilter
    );
  }

  /**
   * Actually plays the effect on the canvas
   *
   * @param data
   * @param setFlags
   * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}>}
   * @private
   */
  static async _playEffect(data, setFlags = true) {
    const effect = CanvasEffect.make(data);

    if (
      data.persist &&
      setFlags &&
      effect.context &&
      effect.owner &&
      !data.temporary &&
      !data.remote
    ) {
      flagManager.addFlags(effect.context.uuid, effect.data);
    }

    if (!effect.shouldPlay) return;

    const playData = effect.play();

    SequenceManager.VisibleEffects.add(effect.id, effect);
    if (effect.data.name) {
      effect._ticker.add(() => {
        if (effect.isDestroyed) return;
        PositionContainer.set(effect.data.name, {
          start: effect.sourcePosition,
          end: effect.targetPosition,
        });
      });
    }

    if (data.temporary && effect.owner) {
      let lastSourcePosition = {};
      let lastTargetPosition = {};
      effect._ticker.add(() => {
        if (effect.source && !effect.isSourceDestroyed) {
          const sourceData = effect.getSourceData();
          if (JSON.stringify(sourceData) !== lastSourcePosition) {
            sequencerSocket.executeForOthers(
              SOCKET_HANDLERS.UPDATE_POSITION,
              data.source,
              sourceData
            );
            lastSourcePosition = JSON.stringify(sourceData);
          }
        }
        if (effect.target && !effect.isTargetDestroyed) {
          const targetData = effect.getTargetData();
          if (JSON.stringify(targetData) !== lastTargetPosition) {
            sequencerSocket.executeForOthers(
              SOCKET_HANDLERS.UPDATE_POSITION,
              data.target,
              targetData
            );
            lastTargetPosition = JSON.stringify(targetData);
          }
        }
      });
    }

    if (!data.persist) {
      playData.promise.then(() => this._removeEffect(effect));
    }

    return playData;
  }

  /**
   * Updates a single effect with the given data
   *
   * @param inEffectId
   * @param inUpdates
   * @returns {promise|boolean}
   * @private
   */
  static _updateEffect(inEffectId, inUpdates) {
    const effect = SequenceManager.VisibleEffects.get(inEffectId);
    if (!effect) return false;
    return effect._update(inUpdates);
  }

  /**
   * Updates a single effect with new animations
   *
   * @param inEffectId
   * @param inAnimations
   * @param inLoopingAnimations
   * @returns {promise|boolean}
   * @private
   */
  static _addEffectAnimations(inEffectId, inAnimations, inLoopingAnimations) {
    const effect = SequenceManager.VisibleEffects.get(inEffectId);
    if (!effect) return false;
    return effect._addAnimations(inAnimations, inLoopingAnimations);
  }

  /**
   * Sets up persisting effects when the scene is first loaded
   *
   * @returns {promise}
   */
  static async setUpPersists() {
    await this.tearDownPersists();
    const allObjects = lib.get_all_documents_from_scene();
    allObjects.push(canvas.scene);
    const docEffectsMap = allObjects.reduce((acc, doc) => {
      let tokenEffects = flagManager.getFlags(doc);
      if (doc instanceof TokenDocument && doc?.actorLink) {
        const actorEffects = flagManager.getFlags(doc?.actor);
        actorEffects.forEach((e) => {
          e[1]._id = randomID();
          e[1].source = doc.uuid;
          e[1].sceneId = doc.parent.id;
        });
        tokenEffects = tokenEffects.concat(actorEffects);
      }
      if (tokenEffects.length) {
        acc[doc.uuid] = tokenEffects;
      }
      return acc;
    }, {});
    const promises = Object.entries(docEffectsMap)
      .map(([uuid, effects]) => {
        return this._playEffectMap(effects, fromUuidSync(uuid));
      })
      .flat();
    return Promise.all(promises).then(() => {
      Hooks.callAll("sequencerEffectManagerReady");
    });
  }

  /**
   * Tears down persisting effects when the scene is unloaded
   */
  static tearDownPersists() {
    return Promise.allSettled(
      this.effects.map((effect) => {
        SequenceManager.VisibleEffects.delete(effect.id);
        return effect.destroy();
      })
    );
  }

  /**
   * Patches an object's creation data before it's created so that the effect plays on it correctly
   *
   * @param inDocument
   * @param data
   * @param options
   * @returns {*}
   */
  static async patchCreationData(inDocument, data, options) {
    const effects = flagManager.getFlags(inDocument);

    if (!effects?.length) return;

    const updates = {};

    let documentUuid;
    if (!inDocument._id) {
      const documentId = randomID();
      documentUuid = inDocument.uuid + documentId;
      updates["_id"] = documentId;
      options.keepId = true;
    } else {
      documentUuid = inDocument.uuid;
    }

    updates[CONSTANTS.EFFECTS_FLAG] = this.patchEffectDataForDocument(
      documentUuid,
      effects
    );

    return inDocument.updateSource(updates);
  }

  static patchEffectDataForDocument(inDocumentUuid, effects) {
    return effects.map((effect) => {
      effect[0] = randomID();
      const effectData = effect[1];
      effectData._id = effect[0];
      if (lib.is_UUID(effectData.source)) {
        if (effectData.masks.includes(effectData.source)) {
          const index = effectData.masks.indexOf(effectData.source);
          effectData.masks[index] = inDocumentUuid;
        }
        effectData.source = inDocumentUuid;
      }
      effectData.sceneId = inDocumentUuid.split(".")[1];
      return effect;
    });
  }

  /**
   * Plays the effects of a given document on creation
   *
   * @param inDocument
   * @returns {*}
   */
  static async documentCreated(inDocument) {
    let effects = flagManager.getFlags(inDocument);
    if (inDocument instanceof TokenDocument && inDocument?.actorLink) {
      let actorEffects = flagManager.getFlags(inDocument.actor);
      if (actorEffects.length) {
        actorEffects = this.patchEffectDataForDocument(
          inDocument.uuid,
          actorEffects
        );
      }
      effects = effects.concat(actorEffects);
    }
    if (!effects?.length) return;
    return this._playEffectMap(effects, inDocument);
  }

  /**
   * Plays multiple effects at the same time
   *
   * @param inEffects
   * @param inDocument
   * @returns {Promise<{duration: Promise<number>, promise: Promise<void>}[]>}
   * @private
   */
  static _playEffectMap(inEffects, inDocument) {
    if (inEffects instanceof Map) inEffects = Array.from(inEffects);
    return Promise.all(
      inEffects.map(async (effect) => {
        if (!CanvasEffect.checkValid(effect[1])) {
          if (game.user.isGM) {
            lib.custom_warning(
              `Removed effect from ${inDocument.uuid} as it no longer had a valid source or target`
            );
          }
          return flagManager.removeFlags(inDocument.uuid, effect);
        }
        return this._playEffect(effect[1], false)
          .then((result) => {
            if (!result) {
              lib.debug("Error playing effect");
            }
          })
          .catch((err) => {
            lib.debug("Error playing effect:", err);
          });
      })
    );
  }

  /**
   * Ends one or many effects at the same time, returning a promise that resolves once every effect has fully ended
   *
   * @param inEffectIds
   * @returns {Promise}
   * @private
   */
  static async _endManyEffects(inEffectIds = false) {
    const actorEffectsToEnd = this.effects.filter((effect) => {
      return (
        effect.context?.actorLink &&
        inEffectIds.includes(effect.data?.persistOptions?.id)
      );
    });
    const effectsByActorUuid = Object.values(
      lib.group_by(actorEffectsToEnd, "context.actor.uuid")
    );

    const regularEffectsToEnd = this.effects.filter((effect) => {
      return (
        inEffectIds.includes(effect.id) ||
        (!effect.context?.actorLink &&
          inEffectIds.includes(effect.data?.persistOptions?.id))
      );
    });
    const effectsByContextUuid = Object.values(
      lib.group_by(regularEffectsToEnd, "context.uuid")
    );

    effectsByContextUuid.forEach((effects) => {
      effects = effects.filter(
        (effect) => effect.data.persist && !effect.data.temporary
      );
      if (!effects.length) return;
      const effectData = effects.map((effect) => effect.data);
      flagManager.removeFlags(
        effects[0].context.uuid,
        effectData,
        !inEffectIds
      );
    });

    effectsByActorUuid.forEach((effects) => {
      effects = effects.filter(
        (effect) => effect.data.persist && !effect.data.temporary
      );
      if (!effects.length) return;

      const effectContext = effects[0].context;
      const effectData = effects.map((effect) => effect.data);

      if (
        !(
          effectContext instanceof TokenDocument &&
          effectContext.actorLink &&
          effectContext.actor.prototypeToken.actorLink
        )
      ) {
        return;
      }

      const persistentEffectData = effectData.filter(
        (data) => data?.persistOptions?.persistTokenPrototype
      );
      if (!persistentEffectData.length) return;

      const actorEffects = flagManager.getFlags(effectContext.actor);
      const applicableActorEffects = actorEffects
        .filter((effect) => {
          return (
            effect[1]?.persistOptions?.persistTokenPrototype &&
            persistentEffectData.some(
              (persistentEffect) =>
                persistentEffect.persistOptions.id ===
                effect[1]?.persistOptions?.id
            )
          );
        })
        .map((e) => e[0]);

      flagManager.removeFlags(
        effectContext.actor.uuid,
        applicableActorEffects,
        !inEffectIds
      );
    });

    const effectsToEnd = effectsByContextUuid
      .concat(effectsByActorUuid)
      .deepFlatten();

    return Promise.allSettled(
      effectsToEnd.map((effect) => this._removeEffect(effect))
    );
  }

  static _effectContextFilter(inUUID, effectData) {
    return (
      effectData?.source === inUUID ||
      effectData?.target === inUUID ||
      (effectData?.tiedDocuments ?? []).indexOf(inUUID) > -1
    );
  }

  /**
   * Handles the deletion of objects that effects are attached to
   *
   * @param inUUID
   * @returns {Promise}
   */
  static objectDeleted(inUUID) {
    const documentsToCheck = game.scenes
      .filter((scene) => scene.id !== game.user.viewedScene)
      .map((scene) => [scene, ...lib.get_all_documents_from_scene(scene.id)])
      .deepFlatten();

    const documentEffectsToEnd = documentsToCheck
      .map((obj) => {
        const objEffects = flagManager.getFlags(obj);
        const effectsToEnd = objEffects.filter(([effectId, effectData]) =>
          this._effectContextFilter(inUUID, effectData)
        );
        return {
          document: obj,
          effects: effectsToEnd.map((effect) => effect[0]),
        };
      })
      .filter((obj) => obj.effects.length);

    const visibleEffectsToEnd = this.effects
      .filter((effect) => this._effectContextFilter(inUUID, effect.data))
      .map((e) => e.id);

    return Promise.allSettled([
      this._endManyEffects(visibleEffectsToEnd),
      ...documentEffectsToEnd.map((obj) => {
        return flagManager.removeFlags(obj.document.uuid, obj.effects);
      }),
    ]);
  }

  /**
   * Removes the effect from the manager and ends it, returning a promise that resolves once the effect has fully _ended
   *
   * @param effect
   * @returns {Promise}
   * @private
   */
  static _removeEffect(effect) {
    SequenceManager.VisibleEffects.delete(effect.id);
    TemporaryPositionsContainer.delete(effect.data.source);
    TemporaryPositionsContainer.delete(effect.data.target);
    return effect.endEffect();
  }

  static async _playPrototypeTokenEffects(data, push) {
    if (!lib.is_UUID(data.source)) return;

    const object = lib.from_uuid_fast(data.source);

    if (!(object instanceof TokenDocument)) return;

    const tokenEffectsToPlay = game.scenes
      .map((scene) =>
        scene.tokens.filter((token) => {
          return (
            token.actorLink && token.actor === object.actor && token !== object
          );
        })
      )
      .deepFlatten();

    for (const tokenDocument of tokenEffectsToPlay) {
      const duplicatedData = foundry.utils.deepClone(data);
      duplicatedData._id = randomID();
      duplicatedData.sceneId = tokenDocument.uuid.split(".")[1];
      duplicatedData.masks = duplicatedData.masks
        .map((uuid) => uuid.replace(duplicatedData.source, tokenDocument.uuid))
        .filter((uuid) => uuid.includes(duplicatedData.sceneId));
      duplicatedData.source = tokenDocument.uuid;
      if (CanvasEffect.checkValid(duplicatedData)) {
        if (push)
          sequencerSocket.executeForOthers(
            SOCKET_HANDLERS.PLAY_EFFECT,
            duplicatedData
          );
        if (duplicatedData.sceneId === game.user.viewedScene) {
          await this._playEffect(duplicatedData, false);
        }
      }
    }
  }
}
