import CONSTANTS from "./constants.js";
import { EffectPlayer, SelectionManager } from "./modules/sequencer-interaction-manager.js";
import { PlayerSettings } from "./formapplications/effects-ui/effect-player-store.js";

const hotkeys = {
  get _ready() {
    return canvas.ready && canvas.sequencerInterfaceLayer.active;
  },

  playTool: {
    playManySequencedDown: () => {
      if (!hotkeys._ready) return;
      EffectPlayer.playManySequenced = true;
    },
    playManySequencedUp: () => {
      if (!hotkeys._ready) return;
      EffectPlayer.playManySequenced = false;
      if (!EffectPlayer.isActive) return;
      EffectPlayer.playManyUp();
    },
    playManyDown: () => {
      if (!hotkeys._ready) return;
      EffectPlayer.playMany = true;
    },
    playManyUp: () => {
      if (!hotkeys._ready) return;
      EffectPlayer.playMany = false;
      if (!EffectPlayer.isActive) return;
      EffectPlayer.playManyUp();
    },
    attachToDown: () => {
      if (!hotkeys._ready) return;
      PlayerSettings.attachTo.store.set(true);
      PlayerSettings.stretchToAttach.store.set(true);
    },
    attachToUp: () => {
      if (!hotkeys._ready) return;
      PlayerSettings.attachTo.store.set(false);
      PlayerSettings.stretchToAttach.store.set(false);
    }
  },

  selectTool: {
    snapToGridDown: () => {
      if (!hotkeys._ready) return;
      SelectionManager.snapToGrid = true;
    },
    snapToGridUp: () => {
      if (!hotkeys._ready) return;
      SelectionManager.snapToGrid = false;
    },
    attachToTargetDown: () => {
      if (!hotkeys._ready) return;
      if (!SelectionManager.isActive) return;
      PlayerSettings.attachTo.store.set(true);
      PlayerSettings.stretchToAttach.store.set(true);
    },
    attachToTargetUp: () => {
      if (!hotkeys._ready) return;
      PlayerSettings.attachTo.store.set(false);
      PlayerSettings.stretchToAttach.store.set(false);
    },
    deleteDown: () => {
      if (!hotkeys._ready) return;
      SelectionManager.delete();
    }
  }
}

export default function registerHotkeys() {

  game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-control", {
    name: "SEQUENCER.Hotkeys.PlayTool.Control",
    editable: [
      { key: "ControlLeft" },
    ],
    onDown: hotkeys.playTool.playManySequencedDown,
    onUp: hotkeys.playTool.playManySequencedUp
  });

  game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-shift", {
    name: "SEQUENCER.Hotkeys.PlayTool.Shift",
    editable: [
      { key: "ShiftLeft" },
    ],
    onDown: hotkeys.playTool.playManyDown,
    onUp: hotkeys.playTool.playManyUp
  });

  game.keybindings.register(CONSTANTS.MODULE_NAME, "play-tool-hotkey-alt", {
    name: "SEQUENCER.Hotkeys.PlayTool.Alt",
    editable: [
      { key: "AltLeft" },
    ],
    onDown: hotkeys.playTool.attachToDown,
    onUp: hotkeys.playTool.attachToDown
  });

  game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-control", {
    name: "SEQUENCER.Hotkeys.SelectTool.Control",
    editable: [
      { key: "ControlLeft" },
    ],
    onDown: hotkeys.selectTool.snapToGridDown,
    onUp: hotkeys.selectTool.snapToGridUp
  });

  game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-alt", {
    name: "SEQUENCER.Hotkeys.SelectTool.Alt",
    editable: [
      { key: "AltLeft" },
    ],
    onDown: hotkeys.selectTool.attachToTargetDown,
    onUp: hotkeys.selectTool.attachToTargetUp
  });

  game.keybindings.register(CONSTANTS.MODULE_NAME, "select-tool-hotkey-delete", {
    name: "SEQUENCER.Hotkeys.SelectTool.Delete",
    editable: [
      { key: "Delete" },
    ],
    onDown: hotkeys.selectTool.deleteDown,
  });
}
