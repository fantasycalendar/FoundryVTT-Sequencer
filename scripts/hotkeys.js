import { isVersion9 } from "./module/lib/lib.js";
import CONSTANTS from "./module/constants.js";
import { EffectPlayer, SelectionManager } from "./module/sequencer-interaction-manager.js";

const hotkeys = {
    get _ready(){
        return canvas.ready && canvas.sequencerEffectsAboveTokens.active;
    },

    playTool: {
        controlDown: () => {
            if(!hotkeys._ready) return;
            EffectPlayer.playManySequenced = true;
        },
        controlUp: () => {
            if(!hotkeys._ready) return;
            EffectPlayer.playManySequenced = false;
        },
        shiftDown: () => {
            if(!hotkeys._ready) return;
            EffectPlayer.playMany = true;
        },
        shiftUp: () => {
            if(!hotkeys._ready) return;
            EffectPlayer.playMany = false;
            if(!EffectPlayer.isActive) return;
            EffectPlayer.shiftUp();
        }
    },

    selectTool: {
        controlDown: () => {
            if(!hotkeys._ready) return;
            SelectionManager.snapToGrid = true;
        },
        controlUp: () => {
            if(!hotkeys._ready) return;
            SelectionManager.snapToGrid = false;
        },
        altDown: () => {
            if(!hotkeys._ready) return;
            SelectionManager.attachToTarget = true;
            if(!SelectionManager.isActive) return;
            SelectionManager.altDown()
        },
        altUp: () => {
            if(!hotkeys._ready) return;
            SelectionManager.attachToTarget = false;
        },
        deleteDown: () => {
            if(!hotkeys._ready) return;
            SelectionManager.delete();
        }
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
        onDown: hotkeys.playTool.shiftDown,
        onUp: hotkeys.playTool.shiftUp,
        reservedModifiers: ["CONTROL"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-control", {
        name: "SEQUENCER.Hotkeys.PlayTool.Control",
        uneditable: [
            { key: "ControlLeft" },
        ],
        onDown: hotkeys.playTool.controlDown,
        onUp: hotkeys.playTool.controlUp,
        reservedModifiers: ["SHIFT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-control", {
        name: "SEQUENCER.Hotkeys.SelectTool.Control",
        uneditable: [
            { key: "ControlLeft" },
        ],
        onDown: hotkeys.selectTool.controlDown,
        onUp: hotkeys.selectTool.controlUp,
        reservedModifiers: ["SHIFT", "ALT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-alt", {
        name: "SEQUENCER.Hotkeys.SelectTool.Alt",
        uneditable: [
            { key: "AltLeft" },
        ],
        onDown: hotkeys.selectTool.altDown,
        onUp: hotkeys.selectTool.altUp,
        reservedModifiers: ["CONTROL", "SHIFT"]
    });

    game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-delete", {
        name: "SEQUENCER.Hotkeys.SelectTool.Delete",
        uneditable: [
            { key: "Delete" },
        ],
        onDown: hotkeys.selectTool.deleteDown,
    });


}

function registerHotkeysLegacy(){

    window.addEventListener("keydown", (event) => {
        switch(event.code){
            case "ShiftLeft":
                hotkeys.playTool.shiftDown();
                break;
            case "ControlLeft":
                hotkeys.playTool.controlDown();
                hotkeys.selectTool.controlDown();
                break;
            case "AltLeft":
                hotkeys.selectTool.altDown();
                break;
            case "Delete":
                hotkeys.selectTool.deleteDown();
                break;
        }
    });

    window.addEventListener("keyup", (event) => {
        switch(event.code){
            case "ShiftLeft":
                hotkeys.playTool.shiftUp();
                break;
            case "ControlLeft":
                hotkeys.playTool.controlUp();
                hotkeys.selectTool.controlUp();
                break;
            case "AltLeft":
                hotkeys.selectTool.altUp();
                break;
        }
    });

}