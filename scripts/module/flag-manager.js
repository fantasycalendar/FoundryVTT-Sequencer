import * as lib from "./lib/lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "./constants.js";

const flagManager = {

    flagAddBuffer: new Map(),
    flagRemoveBuffer: new Map(),

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

            let toAdd = flagsToAdd.get(objectUUID) ?? { effects: [] };
            let toRemove = flagsToRemove.get(objectUUID) ?? { effects: [], removeAll: false };

            if (toRemove?.removeAll) {
                await object.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, []);
                lib.debug(`All flags removed for object with ID "${object.uuid}"`);
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

            await object.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, flagsToSet);

            lib.debug(`Flags set for object with ID "${object.uuid}":\n`, flagsToSet)

        }

    }, 250)

};

export default flagManager;