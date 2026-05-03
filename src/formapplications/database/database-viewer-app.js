import DatabaseShell from "./database-shell.svelte";
import { SvelteApplicationMixin } from "../SvelteMixin.js";

const PATREON_URL = "https://patreon.com/cw/fantasycomputerworks";

export class DatabaseViewerApp extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {

	static DEFAULT_OPTIONS = {
		classes: ["dialog"],
		position: {
			width: 900,
			height: 450,
		},
		actions: {
			openSequencerChangelog: () => {
				if (window.Sequencer?.showChangelog) window.Sequencer.showChangelog();
			},
			openSequencerPatreon: () => {
				window.open(PATREON_URL, "_blank", "noopener");
			},
		},
		window: {
			title: "SEQUENCER.Database.Title",
			icon: "fa-solid fa-archive",
			resizable: true,
			controls: [
				{
					action: "openSequencerChangelog",
					icon: "fa-solid fa-clipboard-list",
					label: "Changelog",
				},
				{
					action: "openSequencerPatreon",
					icon: "fa-brands fa-patreon",
					label: "Support Sequencer",
				},
			],
		},
	};

	root = DatabaseShell;
}
