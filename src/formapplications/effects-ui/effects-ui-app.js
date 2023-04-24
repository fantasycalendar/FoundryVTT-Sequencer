import { SvelteApplication } from "@typhonjs-fvtt/runtime/svelte/application";
import EffectsUIShell from "./effects-ui-shell.svelte";

export class EffectsUIApp extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("SEQUENCER.ManagerUI"),
      classes: ["dialog"],
      width: "auto",
      height: "auto",
      top: 65,
      left: 120,
      resizable: false,
      svelte: {
        class: EffectsUIShell,
        target: document.body,
      },
    });
  }

  static getActiveApp() {
    return Object.values(ui.windows).find((app) => {
      return (
        app instanceof this && app._state > Application.RENDER_STATES.CLOSED
      );
    });
  }

  static async show(options = {}) {
    const existingApp = this.getActiveApp();
    if (existingApp) return existingApp.render(false, { focus: true });
    return new Promise((resolve) => {
      options.resolve = resolve;
      new this(options).render(true, { focus: true });
    });
  }
}
