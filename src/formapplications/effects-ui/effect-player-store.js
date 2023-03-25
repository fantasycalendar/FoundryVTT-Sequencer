import { writable } from "svelte/store";
import { EffectPlayer } from "../../modules/sequencer-interaction-manager.js";

const PlayerSettings = {
  file: {
    label: "SEQUENCER.Player.Option.File",
    store: writable(""),
  },
  scale: {
    label: "SEQUENCER.Player.Option.Scale",
    store: writable(1.0),
  },
  belowTokens: {
    label: "SEQUENCER.Player.Option.BelowTokens",
    store: writable(false),
  },
  snapToGrid: {
    label: "SEQUENCER.Player.Option.SnapToGrid",
    store: writable(false)
  },
  rotation: {
    label: "SEQUENCER.Player.Option.Rotation",
    store: writable(0),
  },
  randomRotation: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
  },
  fadeIn: {
    label: "SEQUENCER.Player.Option.FadeIn",
    store: writable(0),
  },
  fadeOut: {
    label: "SEQUENCER.Player.Option.FadeOut",
    store: writable(0),
  },
  scaleIn: {
    label: "SEQUENCER.Player.Option.ScaleIn",
    store: writable(0),
  },
  scaleOut: {
    label: "SEQUENCER.Player.Option.ScaleOut",
    store: writable(0),
  },

  mirrorX: {
    label: "SEQUENCER.Player.Option.MirrorX",
    store: writable(false),
  },
  mirrorY: {
    label: "SEQUENCER.Player.Option.MirrorY",
    store: writable(false),
  },
  randomMirrorX: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
  },
  randomMirrorY: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
  },

  offsetX: {
    label: "SEQUENCER.Player.Option.OffsetX",
    store: writable(0),
  },
  offsetY: {
    label: "SEQUENCER.Player.Option.OffsetY",
    store: writable(0),
  },

  offsetGridUnits: {
    label: "SEQUENCER.Player.Option.GridUnits",
    store: writable(false),
  },

  randomOffsetX: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(0),
  },
  randomOffsetY: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(0),
  },
  randomOffset: {
    label: "SEQUENCER.Player.Option.RandomOffset",
    store: writable(false),
  },

  preload: {
    label: "SEQUENCER.Player.Option.Preload",
    store: writable(false),
  },
  moveTowards: {
    label: "SEQUENCER.Player.Option.DragBehavior",
    label_off: "SEQUENCER.Player.Option.DragStretch",
    label_on: "SEQUENCER.Player.Option.DragMove",
    store: writable(false),
  },
  moveSpeed: {
    label: "SEQUENCER.Player.Option.MoveSpeed",
    store: writable(0),
  },
  attachTo: {
    label: "SEQUENCER.Player.Option.AttachTo",
    store: writable(false),
    callback: (e) => {
      EffectPlayer.sourceAttach = e.target.checked;
    }
  },
  stretchToAttach: {
    label: "SEQUENCER.Player.Option.StretchToAttach",
    store: writable(false),
    callback: (e) => {
      EffectPlayer.targetAttach = e.target.checked;
    }
  },
  persist: {
    label: "SEQUENCER.Player.Option.Persist",
    store: writable(false)
  },

  repeat: {
    label: "SEQUENCER.Player.Option.Repeat",
    store: writable(false),
  },
  repetitions: {
    label: "SEQUENCER.Player.Option.Repetitions",
    store: writable(1.0),
  },
  repeatDelayMin: {
    label: "SEQUENCER.Player.Option.DelayMin",
    store: writable(200),
  },
  repeatDelayMax: {
    label: "SEQUENCER.Player.Option.DelayMax",
    store: writable(400),
  },

}

export { PlayerSettings };
