import * as lib from "./lib/lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CONSTANTS from "./constants.js";

const flagManager = {

    flagAddBuffer: new Map(),
    flagRemoveBuffer: new Map(),

    addFlags: (inObject, inEffects) => {

        if(!inObject?.id) return;

        inObject = lib.validate_document(inObject);

        if (!Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagAddBuffer.get(inObject.id) ?? { obj: inObject, effects: [] };

        flagsToSet.effects.push(...inEffects);

        flagManager.flagAddBuffer.set(inObject.id, flagsToSet);

        flagManager.updateFlags();

    },

    removeFlags: (inObject, inEffects, removeAll) => {

        if(!inObject?.id) return;

        inObject = lib.validate_document(inObject);

        if (inEffects && !Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagRemoveBuffer.get(inObject.id) ?? { obj: inObject, effects: [], removeAll: removeAll };

        if(inEffects) flagsToSet.effects.push(...inEffects);

        flagManager.flagRemoveBuffer.set(inObject.id, flagsToSet);

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

        for(let objectId of objects) {

            let toAdd = flagsToAdd.get(objectId) ?? { effects: [] };
            let toRemove = flagsToRemove.get(objectId) ?? { effects: [], removeAll: false };

            let obj = toAdd.obj ?? toRemove.obj;

            if (toRemove?.removeAll) {
                await sequencerSocket.executeAsGM(SOCKET_HANDLERS.UPDATE_FLAGS, obj.uuid, []);
                lib.debug(`All flags removed for object with ID "${obj.id}"`);
                continue;
            }

            const existingFlags = new Map(obj.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME) ?? []);

            for (const effect of toAdd.effects) {
                existingFlags.set(effect?.data?.id ?? effect.id, effect?.data ?? effect);
            }

            for (const effect of toRemove.effects) {
                existingFlags.delete(effect?.data?.id ?? effect.id);
            }
            
            const flagsToSet = Array.from(existingFlags);

            await sequencerSocket.executeAsGM(SOCKET_HANDLERS.UPDATE_FLAGS, obj.uuid, flagsToSet);

            lib.debug(`Flags set for object with ID "${obj.id}":\n`, flagsToSet)

        }

    }, 250)

};

export default flagManager;