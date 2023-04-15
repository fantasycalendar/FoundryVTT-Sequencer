import { writable, get } from "svelte/store";
import { EffectPlayer } from "../../modules/sequencer-interaction-manager.js";
import CONSTANTS from "../../constants.js";

const PlayerSettings = {
  file: {
    label: "SEQUENCER.Player.Option.File",
    store: writable(""),
    default: "",
  },
  scale: {
    label: "SEQUENCER.Player.Option.Scale",
    store: writable(1.0),
    default: 1.0,
  },
  users: {
    label: "SEQUENCER.Player.Option.ForUsers",
    store: writable([]),
    default: [],
  },
  belowTokens: {
    label: "SEQUENCER.Player.Option.BelowTokens",
    store: writable(false),
    default: false,
  },
  snapToGrid: {
    label: "SEQUENCER.Player.Option.SnapToGrid",
    store: writable(false),
    default: false,
  },
  rotation: {
    label: "SEQUENCER.Player.Option.Rotation",
    store: writable(0),
    default: 0,
  },
  randomRotation: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
    default: false,
  },
  fadeIn: {
    label: "SEQUENCER.Player.Option.FadeIn",
    store: writable(0),
    default: 0,
  },
  fadeOut: {
    label: "SEQUENCER.Player.Option.FadeOut",
    store: writable(0),
    default: 0,
  },
  scaleIn: {
    label: "SEQUENCER.Player.Option.ScaleIn",
    store: writable(0),
    default: 0,
  },
  scaleOut: {
    label: "SEQUENCER.Player.Option.ScaleOut",
    store: writable(0),
    default: 0,
  },

  mirrorX: {
    label: "SEQUENCER.Player.Option.MirrorX",
    store: writable(false),
    default: false,
  },
  mirrorY: {
    label: "SEQUENCER.Player.Option.MirrorY",
    store: writable(false),
    default: false,
  },
  randomMirrorX: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
    default: false,
  },
  randomMirrorY: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
    default: false,
  },

  offsetX: {
    label: "SEQUENCER.Player.Option.OffsetX",
    store: writable(0),
    default: 0,
  },
  offsetY: {
    label: "SEQUENCER.Player.Option.OffsetY",
    store: writable(0),
    default: 0,
  },

  offsetGridUnits: {
    label: "SEQUENCER.Player.Option.GridUnits",
    store: writable(false),
    default: false,
  },

  randomOffsetAmount: {
    label: "SEQUENCER.Player.Option.RandomOffset",
    store: writable(0),
    default: 0,
  },

  randomOffset: {
    label: "SEQUENCER.Player.Option.Randomize",
    store: writable(false),
    default: false,
  },

  preload: {
    label: "SEQUENCER.Player.Option.Preload",
    store: writable(false),
    default: false,
  },
  moveTowards: {
    label: "SEQUENCER.Player.Option.DragBehavior",
    label_off: "SEQUENCER.Player.Option.DragStretch",
    label_on: "SEQUENCER.Player.Option.DragMove",
    store: writable(false),
    default: false,
  },
  moveSpeed: {
    label: "SEQUENCER.Player.Option.MoveSpeed",
    store: writable(0),
    default: 0,
  },
  attachTo: {
    label: "SEQUENCER.Player.Option.AttachTo",
    store: writable(false),
    default: false,
    callback: (e) => {
      EffectPlayer.sourceAttach = e.target.checked;
    },
  },
  stretchToAttach: {
    label: "SEQUENCER.Player.Option.StretchToAttach",
    store: writable(false),
    default: false,
    callback: (e) => {
      EffectPlayer.targetAttach = e.target.checked;
    },
  },
  persist: {
    label: "SEQUENCER.Player.Option.Persist",
    store: writable(false),
    default: false,
  },
  repeat: {
    label: "SEQUENCER.Player.Option.Repeat",
    store: writable(false),
    default: false,
  },
  repetitions: {
    label: "SEQUENCER.Player.Option.Repetitions",
    store: writable(1.0),
    default: 1.0,
  },
  repeatDelayMin: {
    label: "SEQUENCER.Player.Option.DelayMin",
    store: writable(200),
    default: 200,
  },
  repeatDelayMax: {
    label: "SEQUENCER.Player.Option.DelayMax",
    store: writable(400),
    default: 400,
  },
};

PlayerSettings.export = () => {
  return Object.fromEntries(
    Object.entries(PlayerSettings).map((entry) => {
      return [entry[0], get(entry[1].store)];
    })
  );
};

PlayerSettings.import = (settings) => {
  Object.entries(PlayerSettings).forEach((entry) => {
    if (settings?.[entry[0]] !== undefined) {
      entry[1].store.set(settings?.[entry[0]]);
    } else if (entry[1]?.default !== undefined) {
      entry[1].store.set(entry[1].default);
    }
  });
};

PlayerSettings.getPresets = () => {
  return Object.keys(game.settings.get(CONSTANTS.MODULE_NAME, "effectPresets"));
};

PlayerSettings.loadPreset = (name) => {
  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );
  return PlayerSettings.import(effectPresets[name]);
};

PlayerSettings.savePreset = async (name) => {
  const newName = await promptNewPresetName(name);
  if (!newName) return;
  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );
  effectPresets[newName] = PlayerSettings.export();
  return game.settings.set(
    CONSTANTS.MODULE_NAME,
    "effectPresets",
    effectPresets
  );
};

PlayerSettings.copyPreset = async (name) => {
  const newName = await promptNewPresetName(name, true);
  if (!newName) return;
  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );
  effectPresets[newName] = PlayerSettings.export();
  return game.settings.set(
    CONSTANTS.MODULE_NAME,
    "effectPresets",
    effectPresets
  );
};

PlayerSettings.deletePreset = (name) => {
  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );
  delete effectPresets[name];
  return game.settings.set(
    CONSTANTS.MODULE_NAME,
    "effectPresets",
    effectPresets
  );
};

async function promptNewPresetName(inName, copy = false) {
  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );

  let title = copy
    ? game.i18n.localize("SEQUENCER.Player.CopyPresetTitle")
    : game.i18n.localize("SEQUENCER.Player.CreateNewPresetTitle");

  let presetName = await new Promise((resolve) => {
    let rejected = false;
    new Dialog({
      title: title,
      content: `<p><input type="text" placeholder="${game.i18n.localize(
        "SEQUENCER.Player.CreateNewPresetInputLabel"
      )}" id="newPresetName" style="width:100%;"></p>`,
      buttons: {
        okay: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SEQUENCER.OK"),
          callback: async (html) => {
            let name = html.find("#newPresetName").val();

            if (name === "" || !name) {
              name = false;
              rejected = true;
            }

            resolve(name);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("SEQUENCER.Cancel"),
          callback: () => {
            rejected = true;
            resolve(false);
          },
        },
      },
      close: () => {},
      render: (html) => {
        html.find("#newPresetName").val(inName).focus();
      },
    }).render(true);
  });

  if (presetName) {
    if (presetName.toLowerCase() === "default") {
      Dialog.prompt({
        title: game.i18n.localize("SEQUENCER.Player.DefaultErrorTitle"),
        content: `<p>${game.i18n.localize(
          "SEQUENCER.Player.DefaultErrorContent"
        )}</p>`,
        label: game.i18n.localize("SEQUENCER.OK"),
        callback: () => {},
      });
      return false;
    }

    if (effectPresets[presetName]) {
      const overwrite = await Dialog.confirm({
        title: game.i18n.localize("SEQUENCER.Player.OverwritePresetTitle"),
        content: `<p>${game.i18n.format(
          "SEQUENCER.Player.OverwritePresetContent",
          { preset_name: presetName }
        )}</p>`,
      });

      if (!overwrite) {
        presetName = await promptPresetName(presetName);
      }
    }
  }

  return presetName;
}

PlayerSettings.migrateOldPresets = () => {
  if (!game.user.isGM) return;

  const effectPresets = game.settings.get(
    CONSTANTS.MODULE_NAME,
    "effectPresets"
  );

  const presetsToUpdate = Object.values(effectPresets).filter((preset) => {
    return !preset?.version;
  });

  if (!presetsToUpdate.length) return;

  const newEffectPresets = Object.fromEntries(
    Object.entries(effectPresets).map(([name, preset]) => {
      if (preset?.version) return [name, preset];
      preset.version = game.modules.get(CONSTANTS.MODULE_NAME).version;
      if (preset.repetitions > 1) {
        preset.repeat = true;
      }
      if (preset.randomMirrorY) {
        preset.mirrorY = true;
      }
      if (preset.randomOffset) {
        preset.randomOffsetAmount = 1;
        preset.offsetGridUnits = true;
      }
      return [name, preset];
    })
  );

  return game.settings.set(
    CONSTANTS.MODULE_NAME,
    "effectPresets",
    newEffectPresets
  );
};

export { PlayerSettings };
