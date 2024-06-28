import { SvelteApplication } from "#runtime/svelte/application";
import DatabaseShell from "./database-shell.svelte";

export class DatabaseViewerApp extends SvelteApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize("SEQUENCER.Database.Title"),
      classes: ["dialog"],
      width: 900,
      height: 425,
      svelte: {
        class: DatabaseShell,
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
