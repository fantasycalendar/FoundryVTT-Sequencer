import DatabaseShell from "./database-shell.svelte";
import { SvelteApplicationMixin } from "../SvelteMixin.js";

export class DatabaseViewerApp extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {

	static DEFAULT_OPTIONS = {
		classes: ["dialog"],
		position: {
			width: 900,
			height: 450,
		},
		window: {
			title: "SEQUENCER.Database.Title",
			icon: "fa-solid fa-archive",
			resizable: true,
		},
	};

	root = DatabaseShell;
}
