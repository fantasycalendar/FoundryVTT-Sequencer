import * as lib from "./lib/lib.js";
import * as canvaslib from "./lib/canvas-lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "./constants.js";

const flagManager = {

    flagAddBuffer: new Map(),
    flagRemoveBuffer: new Map(),
    _latestFlagVersion: false,

    get latestFlagVersion(){
        if(!this._latestFlagVersion){
            const versions = Object.keys(this.migrations);
            versions.sort((a,b) => {
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
     * @param applyFlags
     * @returns {array}
     */
    getFlags(inDocument, applyFlags = true){

        let effects = getProperty(inDocument.data, `flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`);

        if(!effects?.length) return [];

        const changes = [];
        for(let [effectId, effectData] of effects){

            let effectVersion = effectData.flagVersion || "1.0.0";

            if(effectData.flagVersion === this.latestFlagVersion) continue;

            for(let [version, migration] of Object.entries(this.migrations)){

                if(!isNewerVersion(version, effectVersion)) continue;

                effectData = migration(inDocument, effectData);

            }

            lib.debug(`Migrated effect with ID ${effectId} from version ${effectVersion} to version ${this.latestFlagVersion}`)

            effectData.flagVersion = this.latestFlagVersion;

            changes.push(effectData)
        }

        if(changes.length && applyFlags){
            flagManager.addFlags(inDocument.uuid, changes);
        }

        return effects;
        
    },

    migrations: {
        "2.0.0": (inDocument, effectData) => {

            effectData._id = effectData.id;
            effectData.creationTimestamp = effectData.timestamp;

            if(effectData.template){
                effectData.template = {
                    gridSize: effectData.template[0],
                    startPoint: effectData.template[1],
                    endPoint: effectData.template[2]
                }
            }

            if(effectData.attachTo) {
                effectData.attachTo = {
                    active: true,
                    align: "center",
                    rotation: true,
                    bindVisibility: true,
                    bindAlpha: true
                };
                effectData.source = inDocument.uuid;
                const objectSize = canvaslib.get_object_dimensions(inDocument, true);
                effectData.offset = {
                    x: (effectData.position.x) - objectSize.width,
                    y: (effectData.position.y) - objectSize.height,
                }
            }else if(effectData.position){
                effectData.source = effectData.position;
            }

            if(effectData.reachTowards){
                effectData.stretchTo = {
                    attachTo: false,
                    onlyX: false
                }
            }

            if(effectData.filters){
                effectData.filters = Object.entries(effectData.filters)
                    .map(entry => {
                        return {
                            className: entry[0],
                            ...entry[1]
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

            if(effectData.animatedProperties) {
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

            if(effectData.stretchTo){
                effectData.stretchTo.tiling = false;
            }

            return effectData;
        },

        "2.0.9": (inDocument, effectData) => {

            effectData.tilingTexture = false;

            if(effectData.stretchTo?.tiling !== undefined){
                if(effectData.stretchTo.tiling){
                    effectData.tilingTexture = {
                        scale: { x: 1, y: 1 },
                        position: { x: 0, y: 0 }
                    }
                }
                delete effectData.stretchTo.tiling;
            }

            return effectData;
        },

        "2.1.0": (inDocument, effectData) => {

            if(effectData.randomOffset){
                effectData.randomOffset = {
                    source: !effectData.target ? effectData.randomOffset : false,
                    target: !!effectData.target ? effectData.randomOffset : false
                };
            }

            if(effectData.nameOffsetMap){
                Object.values(effectData.nameOffsetMap).forEach(offsetMap => {
                    if(offsetMap.randomOffset){
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
    removeFlags: (inObjectUUID, inEffects, removeAll) => {
        sequencerSocket.executeAsGM(SOCKET_HANDLERS.REMOVE_FLAGS, inObjectUUID, inEffects, removeAll);
    },

    _addFlags: (inObjectUUID, inEffects) => {

        if (!Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagAddBuffer.get(inObjectUUID) ?? { effects: [] };

        flagsToSet.effects.push(...inEffects);

        flagManager.flagAddBuffer.set(inObjectUUID, flagsToSet);

        flagManager.updateFlags();

    },

    _removeFlags: (inObjectUUID, inEffects, removeAll) => {

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

        let objects = new Set([...flagsToAdd.map(effect => effect[0]), ...flagsToRemove.map(effect => effect[0])])

        flagsToAdd = new Map(flagsToAdd);
        flagsToRemove = new Map(flagsToRemove);

        for (let objectUUID of objects) {

            let object = lib.from_uuid_fast(objectUUID);

            if(!object){
                lib.custom_warning("Sequencer", `Failed to set flags on non-existent object with UUID: ${objectUUID}`);
                continue;
            }

            let toAdd = flagsToAdd.get(objectUUID) ?? { effects: [] };
            let toRemove = flagsToRemove.get(objectUUID) ?? { effects: [], removeAll: false };

            if (toRemove?.removeAll) {
                await object.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, []);
                lib.debug(`All flags removed for object with ID: ${objectUUID}`);
                continue;
            }

            const existingFlags = new Map(object.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME) ?? []);

            for (const effect of toAdd.effects) {
                existingFlags.set(effect._id, effect);
            }

            for (const effect of toRemove.effects) {
                existingFlags.delete(effect._id);
            }

            const flagsToSet = Array.from(existingFlags);

            await object.update({
                [`flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagsToSet
            });

            if(object instanceof TokenDocument && object.data.actorLink){
                const flagsToPrototypePersist = flagsToSet.filter(effect => effect[1]?.persistOptions?.persistTokenPrototype);
                await object.actor.update({
                    [`token.flags.${CONSTANTS.MODULE_NAME}.${CONSTANTS.FLAG_NAME}`]: flagsToPrototypePersist
                });
            }

            lib.debug(`Flags set for object with ID "${objectUUID}":\n`, flagsToSet)

        }

    }, 250)

};

export default flagManager;