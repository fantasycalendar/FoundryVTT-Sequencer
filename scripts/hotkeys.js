import { isVersion9 } from "./module/lib/lib.js";
import CONSTANTS from "./module/constants.js";
import { EffectPlayer, SelectionManager } from "./module/sequencer-interaction-manager.js";

const hotkeys = {
    get _ready(){
        return canvas.ready && canvas.sequencerEffectsAboveTokens.active;
    },

    playToolControlDown: () => {
        if(!this._ready) return;
        EffectPlayer.playManySequenced = true;
    },
    playToolControlUp: () => {
        if(!this._ready) return;
        SelectionManager.snapToGrid = false;
    },
    playToolShiftDown: () => {
        if(!this._ready) return;
        EffectPlayer.playMany = true;
    },
    playToolShiftUp: () => {
        if(!this._ready) return;
        EffectPlayer.playMany = false;
        if(!EffectPlayer.isActive) return;
        EffectPlayer.shiftUp();
    },

    selectToolControlDown: () => {
        if(!this._ready) return;
        SelectionManager.snapToGrid = true;
    },
    selectToolControlUp: () => {
        if(!this._ready) return;
        SelectionManager.snapToGrid = false;
    },
    selectToolAltDown: () => {
        if(!this._ready) return;
        SelectionManager.attachToTarget = true;
        if(!SelectionManager.isActive) return;
        SelectionManager.altDown()
    },
    selectToolAltUp: () => {
        if(!this._ready) return;
        SelectionManager.attachToTarget = false;
    },
    selectToolDeleteDown: () => {
        if(!this._ready) return;
        SelectionManager.delete();
    }
}

export default function registerHotkeys() {

    if(!isVersion9()){
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
        onDown: hotkeys.selectToolDeleteDown,
    });


}

function registerHotkeysLegacy(){

    window.addEventListener("keydown", (event) => {
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