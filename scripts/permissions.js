
function getCustomPermissions(){
    return {
        SEQUENCER_EFFECT_CREATE: {
            label: "SEQUENCER.PermissionEffectCreate",
            hint: "SEQUENCER.PermissionEffectCreateHint",
            disableGM: false,
            defaultRole: foundry.CONST.USER_ROLES.PLAYER,
        },

        SEQUENCER_EFFECT_DELETE: {
            label: "SEQUENCER.PermissionEffectDelete",
            hint: "SEQUENCER.PermissionEffectDeleteHint",
            disableGM: false,
            defaultRole: foundry.CONST.USER_ROLES.ASSISTANT,
        },

        SEQUENCER_SOUND_CREATE: {
            label: "SEQUENCER.PermissionSoundCreate",
            hint: "SEQUENCER.PermissionSoundCreateHint",
            disableGM: false,
            defaultRole: foundry.CONST.USER_ROLES.PLAYER,
        },

        SEQUENCER_PRELOAD_CLIENTS: {
            label: "SEQUENCER.PermissionPreloadClients",
            hint: "SEQUENCER.PermissionPreloadClientsHint",
            disableGM: false,
            defaultRole: foundry.CONST.USER_ROLES.TRUSTED,
        },

        SEQUENCER_USE_SIDEBAR_TOOLS: {
            label: "SEQUENCER.PermissionUseSidebarTools",
            hint: "SEQUENCER.PermissionUseSidebarToolsHint",
            disableGM: false,
            defaultRole: foundry.CONST.USER_ROLES.PLAYER,
        }
    }
}

export function registerPermissions(){

    Object.entries(getCustomPermissions()).forEach(permission => {
        foundry.CONST.USER_PERMISSIONS[permission[0]] = permission[1];
    })

}

export function patchPermissions(){

    if(!game.user.isGM) return;

    const permissions = game.settings.get("core", "permissions");

    const custom_permissions = Object.fromEntries(Object.entries(getCustomPermissions()).map(entry => {
        return [entry[0], Array.fromRange(foundry.CONST.USER_ROLES.GAMEMASTER + 1).slice(entry[1].defaultRole)]
    }))

    const newPermissions = foundry.utils.mergeObject(custom_permissions, permissions);

    if(JSON.stringify(newPermissions) !== JSON.stringify(permissions)) {

        game.settings.set("core", "permissions", newPermissions);

        console.log('Sequencer | Patched permissions');

    }

}