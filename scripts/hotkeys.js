import { isVersion9 } from "./module/lib/lib.js";
import CONSTANTS from "./module/constants.js";
import { EffectPlayer, SelectionManager } from "./module/sequencer-interaction-manager.js";

const hotkeys = {
    playToolControlDown: () => {
        EffectPlayer.playManySequenced = true;
    },
    playToolControlUp: () => {
        SelectionManager.snapToGrid = false;
    },
    playToolShiftDown: () => {
        EffectPlayer.playMany = true;
    },
    playToolShiftUp: () => {
        EffectPlayer.playMany = false;
        if(!EffectPlayer.isActive) return;
        EffectPlayer.shiftUp();
    },

    selectToolControlDown: () => {
        SelectionManager.snapToGrid = true;
    },
    selectToolControlUp: () => {
        SelectionManager.snapToGrid = false;
    },
    selectToolAltDown: () => {
        SelectionManager.attachToTarget = true;
        if(!SelectionManager.isActive) return;
        SelectionManager.altDown()
    },
    selectToolAltUp: () => {
        SelectionManager.attachToTarget = false;
    },
    selectToolDeleteDown: () => {
        SelectionManager.delete();
    }
}

export default function registerHotkeys() {

    if(isVersion9()){
        return registerHotkeysLegacy();
    }

    game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-shift", {
        name: "SEQUENCER.Hotkeys.PlayTool.Shift",
        uneditable: [
            { key: "ShiftLeft" },
        ],
        onDown: hotkeys.playToolShiftDown,
        onUp: hotkeys.playToolShiftUp,
        reservedModifiers: ["CONTROL"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-control", {
        name: "SEQUENCER.Hotkeys.PlayTool.Control",
        uneditable: [
            { key: "ControlLeft" },
        ],
        onDown: hotkeys.playToolControlDown,
        onUp: hotkeys.playToolControlUp,
        reservedModifiers: ["SHIFT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-control", {
        name: "SEQUENCER.Hotkeys.SelectTool.Control",
        uneditable: [
            { key: "ControlLeft" },
        ],
        onDown: hotkeys.selectToolControlDown,
        onUp: hotkeys.selectToolControlUp,
        reservedModifiers: ["SHIFT", "ALT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-alt", {
        name: "SEQUENCER.Hotkeys.SelectTool.Alt",
        uneditable: [
            { key: "AltLeft" },
        ],
        onDown: hotkeys.selectToolAltDown,
        onUp: hotkeys.selectToolAltUp,
        reservedModifiers: ["CONTROL", "SHIFT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-delete", {
        name: "SEQUENCER.Hotkeys.SelectTool.Delete",
        uneditable: [
            { key: "Delete" },
        ],
        onDown: hotkeys.selectToolDelete,
    });


}

function registerHotkeysLegacy(){

    window.addEventListener("keydown", (event) => {
        if ( !canvas.ready ) return;
        if ( !canvas.sequencerEffectsAboveTokens.active ) return;
        switch(event.code){
            case "ShiftLeft":
                hotkeys.playToolShiftDown();
                break;
            case "ControlLeft":
                hotkeys.playToolControlDown();
                hotkeys.selectToolControlDown();
                break;
            case "AltLeft":
                hotkeys.selectToolAltDown();
                break;
            case "Delete":
                hotkeys.selectToolDeleteDown();
                break;
        }
    });

    window.addEventListener("keyup", (event) => {
        if ( !canvas.ready ) return;
        if ( !canvas.sequencerEffectsAboveTokens.active ) return;
        switch(event.code){
            case "ShiftLeft":
                hotkeys.playToolShiftUp();
                break;
            case "ControlLeft":
                hotkeys.playToolControlUp();
                hotkeys.selectToolControlUp();
                break;
            case "AltLeft":
                hotkeys.selectToolAltUp();
                break;
        }
    });

}