import * as lib from "./lib/lib.js";
import CONSTANTS from "./constants.js";

const flagManager = {

    flagAddBuffer: new Map(),
    flagRemoveBuffer: new Map(),
    _latestFlagVersion: false,

    getFlag: (inObject) => {

        let flags = inObject.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME);

        if(!flags) return [];

        let update = false;
        for(let [id, effect] of flags){
            for(let [version, migration] of Object.entries(flagManager.migrations)){
                version = Number(version);
                if((effect?.flagVersion ?? 0.0) >= version) continue;
                lib.debug(`Patching flags on ${inObject.id} to version ${version}`);
                update = true;
                effect = migration(inObject, effect)
                effect.flagVersion = version;
            }
        }

        if(update) inObject.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, flags);

        return flags;

    },

    migrations: {

        "1.0": (data) => {
            // Base version, nothing happens here
            return data;
        },

    },

    get latestFlagVersion(){
        if(!flagManager._latestFlagVersion) {
            const versions = Object.keys(this.migrations).map(version => Number(version));
            versions.sort();
            flagManager._latestFlagVersion = versions.pop();
        }
        return flagManager._latestFlagVersion;
    },

    addFlags: (inObject, inEffects) => {

        if (!lib.isResponsibleGM()) return;

        if(!inObject?.id) return;

        if (!Array.isArray(inEffects)) inEffects = [inEffects];

        let flagsToSet = flagManager.flagAddBuffer.get(inObject.id) ?? { obj: inObject, effects: [] };

        flagsToSet.effects.push(...inEffects);

        flagManager.flagAddBuffer.set(inObject.id, flagsToSet);

        flagManager.updateFlags();

    },

    removeFlags: (inObject, inEffects, removeAll) => {

        if (!lib.isResponsibleGM()) return;

        if(!inObject?.id) return;

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
                await obj.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, []);
                lib.debug(`All flags removed for object with ID "${obj.id}"`);
                continue;
            }

            let flagsToSet = new Map(await flagManager.getFlag(obj));

            for (const effect of toAdd.effects) {
                flagsToSet.set(effect?.data?.id ?? effect.id, effect?.data ?? effect);
            }

            for (const effect of toRemove.effects) {
                flagsToSet.delete(effect?.data?.id ?? effect.id);
            }
            
            flagsToSet = Array.from(flagsToSet)

            await obj.setFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME, flagsToSet);

            lib.debug(`Flags set for object with ID "${obj.id}":\n`, flagsToSet)

        }

    }, 250)

};

export default flagManager;